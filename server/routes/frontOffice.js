const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// FRONT OFFICE TASKS

// Get all tasks
router.get('/tasks', authenticateToken, (req, res) => {
  const { status, priority, assigned_to, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT t.*, 
           u1.username as assigned_to_username,
           u2.username as created_by_username
    FROM front_office_tasks t
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.created_by = u2.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  if (priority) {
    query += ' AND t.priority = ?';
    params.push(priority);
  }

  if (assigned_to) {
    query += ' AND t.assigned_to = ?';
    params.push(assigned_to);
  }

  query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.getDb().all(query, params, (err, tasks) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ tasks });
  });
});

// Get task by ID
router.get('/tasks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT t.*, 
           u1.username as assigned_to_username,
           u2.username as created_by_username
    FROM front_office_tasks t
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.created_by = u2.id
    WHERE t.id = ?
  `;

  db.getDb().get(query, [id], (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  });
});

// Create new task
router.post('/tasks', authenticateToken, [
  body('title').notEmpty().trim(),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']),
  body('assigned_to').optional().isInt({ min: 1 }),
  body('due_date').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title,
    description,
    priority,
    assigned_to,
    due_date
  } = req.body;

  const query = `
    INSERT INTO front_office_tasks (title, description, priority, assigned_to, due_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.getDb().run(query, [
    title,
    description,
    priority,
    assigned_to,
    due_date,
    req.user.id
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create task' });
    }

    res.status(201).json({
      message: 'Task created successfully',
      task: { id: this.lastID, title, priority, assigned_to }
    });
  });
});

// Update task
router.put('/tasks/:id', authenticateToken, [
  body('title').notEmpty().trim(),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']),
  body('status').isIn(['pending', 'in-progress', 'completed', 'cancelled']),
  body('assigned_to').optional().isInt({ min: 1 }),
  body('due_date').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const {
    title,
    description,
    priority,
    status,
    assigned_to,
    due_date
  } = req.body;

  // If marking as completed, set completed_at timestamp
  const completed_at = status === 'completed' ? new Date().toISOString() : null;

  const query = `
    UPDATE front_office_tasks 
    SET title = ?, description = ?, priority = ?, status = ?, assigned_to = ?, 
        due_date = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.getDb().run(query, [
    title,
    description,
    priority,
    status,
    assigned_to,
    due_date,
    completed_at,
    id
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update task' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task updated successfully' });
  });
});

// Update task status
router.patch('/tasks/:id/status', authenticateToken, [
  body('status').isIn(['pending', 'in-progress', 'completed', 'cancelled'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { status } = req.body;

  const completed_at = status === 'completed' ? new Date().toISOString() : null;

  const query = 'UPDATE front_office_tasks SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

  db.getDb().run(query, [status, completed_at, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task status updated successfully' });
  });
});

// Delete task
router.delete('/tasks/:id', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM front_office_tasks WHERE id = ?';

  db.getDb().run(query, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  });
});

// MAINTENANCE REQUESTS

// Get all maintenance requests
router.get('/maintenance', authenticateToken, (req, res) => {
  const { status, priority, room_id, assigned_to, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT m.*, 
           r.room_number,
           u1.username as assigned_to_username,
           u2.username as created_by_username
    FROM maintenance_requests m
    LEFT JOIN rooms r ON m.room_id = r.id
    LEFT JOIN users u1 ON m.assigned_to = u1.id
    LEFT JOIN users u2 ON m.created_by = u2.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND m.status = ?';
    params.push(status);
  }

  if (priority) {
    query += ' AND m.priority = ?';
    params.push(priority);
  }

  if (room_id) {
    query += ' AND m.room_id = ?';
    params.push(room_id);
  }

  if (assigned_to) {
    query += ' AND m.assigned_to = ?';
    params.push(assigned_to);
  }

  query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.getDb().all(query, params, (err, requests) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ requests });
  });
});

// Get maintenance request by ID
router.get('/maintenance/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT m.*, 
           r.room_number, r.room_type, r.floor,
           u1.username as assigned_to_username,
           u2.username as created_by_username
    FROM maintenance_requests m
    LEFT JOIN rooms r ON m.room_id = r.id
    LEFT JOIN users u1 ON m.assigned_to = u1.id
    LEFT JOIN users u2 ON m.created_by = u2.id
    WHERE m.id = ?
  `;

  db.getDb().get(query, [id], (err, request) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!request) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    res.json({ request });
  });
});

// Create maintenance request
router.post('/maintenance', authenticateToken, [
  body('title').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']),
  body('room_id').optional().isInt({ min: 1 }),
  body('estimated_cost').optional().isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    room_id,
    title,
    description,
    priority,
    assigned_to,
    estimated_cost
  } = req.body;

  const query = `
    INSERT INTO maintenance_requests (room_id, title, description, priority, assigned_to, estimated_cost, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.getDb().run(query, [
    room_id,
    title,
    description,
    priority,
    assigned_to,
    estimated_cost,
    req.user.id
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create maintenance request' });
    }

    // If room_id is provided, update room status to maintenance if priority is high/urgent
    if (room_id && ['high', 'urgent'].includes(priority)) {
      const updateRoomQuery = 'UPDATE rooms SET status = ? WHERE id = ?';
      db.getDb().run(updateRoomQuery, ['maintenance', room_id], (err) => {
        if (err) {
          console.error('Failed to update room status:', err);
        }
      });
    }

    res.status(201).json({
      message: 'Maintenance request created successfully',
      request: { id: this.lastID, title, priority, room_id }
    });
  });
});

// Update maintenance request
router.put('/maintenance/:id', authenticateToken, [
  body('title').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']),
  body('status').isIn(['open', 'in-progress', 'completed', 'cancelled']),
  body('room_id').optional().isInt({ min: 1 }),
  body('estimated_cost').optional().isFloat({ min: 0 }),
  body('actual_cost').optional().isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const {
    room_id,
    title,
    description,
    priority,
    status,
    assigned_to,
    estimated_cost,
    actual_cost
  } = req.body;

  const completed_at = status === 'completed' ? new Date().toISOString() : null;

  const query = `
    UPDATE maintenance_requests 
    SET room_id = ?, title = ?, description = ?, priority = ?, status = ?, 
        assigned_to = ?, estimated_cost = ?, actual_cost = ?, completed_at = ?, 
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.getDb().run(query, [
    room_id,
    title,
    description,
    priority,
    status,
    assigned_to,
    estimated_cost,
    actual_cost,
    completed_at,
    id
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update maintenance request' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    // If completed and room_id exists, update room status to available
    if (status === 'completed' && room_id) {
      const updateRoomQuery = 'UPDATE rooms SET status = ? WHERE id = ?';
      db.getDb().run(updateRoomQuery, ['available', room_id], (err) => {
        if (err) {
          console.error('Failed to update room status:', err);
        }
      });
    }

    res.json({ message: 'Maintenance request updated successfully' });
  });
});

// Update maintenance request status
router.patch('/maintenance/:id/status', authenticateToken, [
  body('status').isIn(['open', 'in-progress', 'completed', 'cancelled'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { status } = req.body;

  const completed_at = status === 'completed' ? new Date().toISOString() : null;

  // Get room_id first
  const getRoomQuery = 'SELECT room_id FROM maintenance_requests WHERE id = ?';
  
  db.getDb().get(getRoomQuery, [id], (err, request) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!request) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    const updateQuery = 'UPDATE maintenance_requests SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

    db.getDb().run(updateQuery, [status, completed_at, id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // If completed and room_id exists, update room status to available
      if (status === 'completed' && request.room_id) {
        const updateRoomQuery = 'UPDATE rooms SET status = ? WHERE id = ?';
        db.getDb().run(updateRoomQuery, ['available', request.room_id], (err) => {
          if (err) {
            console.error('Failed to update room status:', err);
          }
        });
      }

      res.json({ message: 'Maintenance request status updated successfully' });
    });
  });
});

// Assign maintenance request
router.patch('/maintenance/:id/assign', authenticateToken, requireRole(['admin', 'manager']), [
  body('assigned_to').isInt({ min: 1 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { assigned_to } = req.body;

  const query = 'UPDATE maintenance_requests SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

  db.getDb().run(query, [assigned_to, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    res.json({ message: 'Maintenance request assigned successfully' });
  });
});

// Delete maintenance request
router.delete('/maintenance/:id', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM maintenance_requests WHERE id = ?';

  db.getDb().run(query, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    res.json({ message: 'Maintenance request deleted successfully' });
  });
});

// Get my tasks (for current user)
router.get('/my-tasks', authenticateToken, (req, res) => {
  const { status = 'pending' } = req.query;

  const query = `
    SELECT t.*, u.username as created_by_username
    FROM front_office_tasks t
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.assigned_to = ? AND t.status = ?
    ORDER BY t.priority DESC, t.created_at ASC
  `;

  db.getDb().all(query, [req.user.id, status], (err, tasks) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ tasks });
  });
});

// Get my maintenance assignments
router.get('/my-maintenance', authenticateToken, (req, res) => {
  const { status = 'open' } = req.query;

  const query = `
    SELECT m.*, r.room_number, u.username as created_by_username
    FROM maintenance_requests m
    LEFT JOIN rooms r ON m.room_id = r.id
    LEFT JOIN users u ON m.created_by = u.id
    WHERE m.assigned_to = ? AND m.status = ?
    ORDER BY m.priority DESC, m.created_at ASC
  `;

  db.getDb().all(query, [req.user.id, status], (err, requests) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ requests });
  });
});

module.exports = router;