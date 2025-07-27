const express = require('express');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all reservations
router.get('/', authenticateToken, (req, res) => {
  const { status, check_in_date, check_out_date, guest_id, room_id, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT r.*, 
           g.first_name, g.last_name, g.email, g.phone,
           rooms.room_number, rooms.room_type,
           u.username as created_by_username
    FROM reservations r
    JOIN guests g ON r.guest_id = g.id
    JOIN rooms ON r.room_id = rooms.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }

  if (check_in_date) {
    query += ' AND r.check_in_date >= ?';
    params.push(check_in_date);
  }

  if (check_out_date) {
    query += ' AND r.check_out_date <= ?';
    params.push(check_out_date);
  }

  if (guest_id) {
    query += ' AND r.guest_id = ?';
    params.push(guest_id);
  }

  if (room_id) {
    query += ' AND r.room_id = ?';
    params.push(room_id);
  }

  query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.getDb().all(query, params, (err, reservations) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ reservations });
  });
});

// Get reservation by ID
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT r.*, 
           g.first_name, g.last_name, g.email, g.phone, g.address,
           rooms.room_number, rooms.room_type, rooms.amenities,
           u.username as created_by_username
    FROM reservations r
    JOIN guests g ON r.guest_id = g.id
    JOIN rooms ON r.room_id = rooms.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.id = ?
  `;

  db.getDb().get(query, [id], (err, reservation) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    res.json({ reservation });
  });
});

// Create new reservation
router.post('/', authenticateToken, [
  body('guest_id').isInt({ min: 1 }),
  body('room_id').isInt({ min: 1 }),
  body('check_in_date').isISO8601(),
  body('check_out_date').isISO8601(),
  body('adults').isInt({ min: 1 }),
  body('children').isInt({ min: 0 }),
  body('total_amount').isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    guest_id,
    room_id,
    check_in_date,
    check_out_date,
    adults,
    children,
    total_amount,
    special_requests
  } = req.body;

  // Validate dates
  const checkIn = moment(check_in_date);
  const checkOut = moment(check_out_date);

  if (!checkIn.isValid() || !checkOut.isValid()) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  if (checkOut.isSameOrBefore(checkIn)) {
    return res.status(400).json({ error: 'Check-out date must be after check-in date' });
  }

  // Check room availability
  const availabilityQuery = `
    SELECT COUNT(*) as count FROM reservations 
    WHERE room_id = ? AND status IN ('confirmed', 'checked-in') 
    AND (
      (check_in_date <= ? AND check_out_date > ?) OR
      (check_in_date < ? AND check_out_date >= ?) OR
      (check_in_date >= ? AND check_out_date <= ?)
    )
  `;

  db.getDb().get(availabilityQuery, [
    room_id, check_in_date, check_in_date, check_out_date, check_out_date, check_in_date, check_out_date
  ], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.count > 0) {
      return res.status(400).json({ error: 'Room is not available for the selected dates' });
    }

    const insertQuery = `
      INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, adults, children, total_amount, special_requests, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.getDb().run(insertQuery, [
      guest_id,
      room_id,
      check_in_date,
      check_out_date,
      adults,
      children,
      total_amount,
      special_requests,
      req.user.id
    ], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create reservation' });
      }

      res.status(201).json({
        message: 'Reservation created successfully',
        reservation: { id: this.lastID, guest_id, room_id, check_in_date, check_out_date, total_amount }
      });
    });
  });
});

// Update reservation
router.put('/:id', authenticateToken, [
  body('guest_id').isInt({ min: 1 }),
  body('room_id').isInt({ min: 1 }),
  body('check_in_date').isISO8601(),
  body('check_out_date').isISO8601(),
  body('adults').isInt({ min: 1 }),
  body('children').isInt({ min: 0 }),
  body('total_amount').isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const {
    guest_id,
    room_id,
    check_in_date,
    check_out_date,
    adults,
    children,
    total_amount,
    special_requests
  } = req.body;

  // Check room availability (excluding current reservation)
  const availabilityQuery = `
    SELECT COUNT(*) as count FROM reservations 
    WHERE room_id = ? AND id != ? AND status IN ('confirmed', 'checked-in') 
    AND (
      (check_in_date <= ? AND check_out_date > ?) OR
      (check_in_date < ? AND check_out_date >= ?) OR
      (check_in_date >= ? AND check_out_date <= ?)
    )
  `;

  db.getDb().get(availabilityQuery, [
    room_id, id, check_in_date, check_in_date, check_out_date, check_out_date, check_in_date, check_out_date
  ], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.count > 0) {
      return res.status(400).json({ error: 'Room is not available for the selected dates' });
    }

    const updateQuery = `
      UPDATE reservations 
      SET guest_id = ?, room_id = ?, check_in_date = ?, check_out_date = ?, 
          adults = ?, children = ?, total_amount = ?, special_requests = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.getDb().run(updateQuery, [
      guest_id,
      room_id,
      check_in_date,
      check_out_date,
      adults,
      children,
      total_amount,
      special_requests,
      id
    ], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update reservation' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      res.json({ message: 'Reservation updated successfully' });
    });
  });
});

// Update reservation status
router.patch('/:id/status', authenticateToken, [
  body('status').isIn(['confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { status } = req.body;

  // If checking in, update room status to occupied
  // If checking out, update room status to cleaning
  let roomStatusQuery = '';
  let roomStatusParams = [];

  if (status === 'checked-in') {
    roomStatusQuery = `
      UPDATE rooms SET status = 'occupied' 
      WHERE id = (SELECT room_id FROM reservations WHERE id = ?)
    `;
    roomStatusParams = [id];
  } else if (status === 'checked-out') {
    roomStatusQuery = `
      UPDATE rooms SET status = 'cleaning' 
      WHERE id = (SELECT room_id FROM reservations WHERE id = ?)
    `;
    roomStatusParams = [id];
  }

  const updateQuery = 'UPDATE reservations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

  db.getDb().run(updateQuery, [status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Update room status if needed
    if (roomStatusQuery) {
      db.getDb().run(roomStatusQuery, roomStatusParams, (err) => {
        if (err) {
          console.error('Failed to update room status:', err);
        }
      });
    }

    res.json({ message: 'Reservation status updated successfully' });
  });
});

// Update payment status
router.patch('/:id/payment', authenticateToken, [
  body('payment_status').isIn(['pending', 'partial', 'paid', 'refunded'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { payment_status } = req.body;

  const query = 'UPDATE reservations SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

  db.getDb().run(query, [payment_status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    res.json({ message: 'Payment status updated successfully' });
  });
});

// Cancel reservation
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager', 'receptionist']), (req, res) => {
  const { id } = req.params;

  const query = 'UPDATE reservations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

  db.getDb().run(query, ['cancelled', id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    res.json({ message: 'Reservation cancelled successfully' });
  });
});

// Get today's arrivals
router.get('/arrivals/today', authenticateToken, (req, res) => {
  const today = moment().format('YYYY-MM-DD');

  const query = `
    SELECT r.*, 
           g.first_name, g.last_name, g.phone,
           rooms.room_number, rooms.room_type
    FROM reservations r
    JOIN guests g ON r.guest_id = g.id
    JOIN rooms ON r.room_id = rooms.id
    WHERE r.check_in_date = ? AND r.status = 'confirmed'
    ORDER BY rooms.room_number
  `;

  db.getDb().all(query, [today], (err, arrivals) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ arrivals });
  });
});

// Get today's departures
router.get('/departures/today', authenticateToken, (req, res) => {
  const today = moment().format('YYYY-MM-DD');

  const query = `
    SELECT r.*, 
           g.first_name, g.last_name, g.phone,
           rooms.room_number, rooms.room_type
    FROM reservations r
    JOIN guests g ON r.guest_id = g.id
    JOIN rooms ON r.room_id = rooms.id
    WHERE r.check_out_date = ? AND r.status = 'checked-in'
    ORDER BY rooms.room_number
  `;

  db.getDb().all(query, [today], (err, departures) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ departures });
  });
});

module.exports = router;