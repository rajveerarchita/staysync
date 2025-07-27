const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all guests
router.get('/', authenticateToken, (req, res) => {
  const { search, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM guests WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.getDb().all(query, params, (err, guests) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM guests WHERE 1=1';
    const countParams = [];

    if (search) {
      countQuery += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    db.getDb().get(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        guests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// Get guest by ID
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = 'SELECT * FROM guests WHERE id = ?';

  db.getDb().get(query, [id], (err, guest) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    res.json({ guest });
  });
});

// Create new guest
router.post('/', authenticateToken, [
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('date_of_birth').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    first_name,
    last_name,
    email,
    phone,
    address,
    id_type,
    id_number,
    nationality,
    date_of_birth
  } = req.body;

  const query = `
    INSERT INTO guests (first_name, last_name, email, phone, address, id_type, id_number, nationality, date_of_birth)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.getDb().run(query, [
    first_name,
    last_name,
    email,
    phone,
    address,
    id_type,
    id_number,
    nationality,
    date_of_birth
  ], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Failed to create guest' });
    }

    res.status(201).json({
      message: 'Guest created successfully',
      guest: { id: this.lastID, first_name, last_name, email, phone }
    });
  });
});

// Update guest
router.put('/:id', authenticateToken, [
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('date_of_birth').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const {
    first_name,
    last_name,
    email,
    phone,
    address,
    id_type,
    id_number,
    nationality,
    date_of_birth
  } = req.body;

  const query = `
    UPDATE guests 
    SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?, 
        id_type = ?, id_number = ?, nationality = ?, date_of_birth = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.getDb().run(query, [
    first_name,
    last_name,
    email,
    phone,
    address,
    id_type,
    id_number,
    nationality,
    date_of_birth,
    id
  ], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Failed to update guest' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    res.json({ message: 'Guest updated successfully' });
  });
});

// Delete guest
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { id } = req.params;

  // Check if guest has active reservations
  const checkQuery = `
    SELECT COUNT(*) as count FROM reservations 
    WHERE guest_id = ? AND status IN ('confirmed', 'checked-in')
  `;

  db.getDb().get(checkQuery, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete guest with active reservations' });
    }

    const deleteQuery = 'DELETE FROM guests WHERE id = ?';

    db.getDb().run(deleteQuery, [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Guest not found' });
      }

      res.json({ message: 'Guest deleted successfully' });
    });
  });
});

// Get guest reservations
router.get('/:id/reservations', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT r.*, rooms.room_number, rooms.room_type
    FROM reservations r
    JOIN rooms ON r.room_id = rooms.id
    WHERE r.guest_id = ?
    ORDER BY r.created_at DESC
  `;

  db.getDb().all(query, [id], (err, reservations) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ reservations });
  });
});

module.exports = router;