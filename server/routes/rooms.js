const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all rooms
router.get('/', authenticateToken, (req, res) => {
  const { status, room_type, floor, available_from, available_to } = req.query;
  
  let query = 'SELECT * FROM rooms WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (room_type) {
    query += ' AND room_type = ?';
    params.push(room_type);
  }

  if (floor) {
    query += ' AND floor = ?';
    params.push(parseInt(floor));
  }

  // Check availability for specific dates
  if (available_from && available_to) {
    query += ` AND id NOT IN (
      SELECT DISTINCT room_id FROM reservations 
      WHERE status IN ('confirmed', 'checked-in') 
      AND (
        (check_in_date <= ? AND check_out_date > ?) OR
        (check_in_date < ? AND check_out_date >= ?) OR
        (check_in_date >= ? AND check_out_date <= ?)
      )
    )`;
    params.push(available_from, available_from, available_to, available_to, available_from, available_to);
  }

  query += ' ORDER BY floor, room_number';

  db.getDb().all(query, params, (err, rooms) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ rooms });
  });
});

// Get room by ID
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = 'SELECT * FROM rooms WHERE id = ?';

  db.getDb().get(query, [id], (err, room) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room });
  });
});

// Create new room
router.post('/', authenticateToken, requireRole(['admin', 'manager']), [
  body('room_number').notEmpty().trim(),
  body('room_type').notEmpty().trim(),
  body('floor').isInt({ min: 1 }),
  body('capacity').isInt({ min: 1 }),
  body('price_per_night').isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    room_number,
    room_type,
    floor,
    capacity,
    price_per_night,
    amenities,
    description
  } = req.body;

  const query = `
    INSERT INTO rooms (room_number, room_type, floor, capacity, price_per_night, amenities, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.getDb().run(query, [
    room_number,
    room_type,
    floor,
    capacity,
    price_per_night,
    amenities,
    description
  ], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Room number already exists' });
      }
      return res.status(500).json({ error: 'Failed to create room' });
    }

    res.status(201).json({
      message: 'Room created successfully',
      room: { id: this.lastID, room_number, room_type, floor, capacity, price_per_night }
    });
  });
});

// Update room
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), [
  body('room_number').notEmpty().trim(),
  body('room_type').notEmpty().trim(),
  body('floor').isInt({ min: 1 }),
  body('capacity').isInt({ min: 1 }),
  body('price_per_night').isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const {
    room_number,
    room_type,
    floor,
    capacity,
    price_per_night,
    amenities,
    description
  } = req.body;

  const query = `
    UPDATE rooms 
    SET room_number = ?, room_type = ?, floor = ?, capacity = ?, 
        price_per_night = ?, amenities = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.getDb().run(query, [
    room_number,
    room_type,
    floor,
    capacity,
    price_per_night,
    amenities,
    description,
    id
  ], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Room number already exists' });
      }
      return res.status(500).json({ error: 'Failed to update room' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ message: 'Room updated successfully' });
  });
});

// Update room status
router.patch('/:id/status', authenticateToken, [
  body('status').isIn(['available', 'occupied', 'maintenance', 'cleaning', 'out-of-order'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { status } = req.body;

  const query = 'UPDATE rooms SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

  db.getDb().run(query, [status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ message: 'Room status updated successfully' });
  });
});

// Delete room
router.delete('/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;

  // Check if room has active reservations
  const checkQuery = `
    SELECT COUNT(*) as count FROM reservations 
    WHERE room_id = ? AND status IN ('confirmed', 'checked-in')
  `;

  db.getDb().get(checkQuery, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete room with active reservations' });
    }

    const deleteQuery = 'DELETE FROM rooms WHERE id = ?';

    db.getDb().run(deleteQuery, [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }

      res.json({ message: 'Room deleted successfully' });
    });
  });
});

// Get room types
router.get('/types/list', authenticateToken, (req, res) => {
  const query = 'SELECT DISTINCT room_type FROM rooms ORDER BY room_type';

  db.getDb().all(query, [], (err, types) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const roomTypes = types.map(type => type.room_type);
    res.json({ roomTypes });
  });
});

// Get room availability summary
router.get('/availability/summary', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      status,
      COUNT(*) as count
    FROM rooms 
    GROUP BY status
  `;

  db.getDb().all(query, [], (err, summary) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ summary });
  });
});

module.exports = router;