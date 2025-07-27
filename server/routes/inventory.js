const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all inventory items
router.get('/', authenticateToken, (req, res) => {
  const { category, location, low_stock, search, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM inventory_items WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (location) {
    query += ' AND location = ?';
    params.push(location);
  }

  if (low_stock === 'true') {
    query += ' AND current_stock <= min_stock_level';
  }

  if (search) {
    query += ' AND (name LIKE ? OR barcode LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  query += ' ORDER BY name LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.getDb().all(query, params, (err, items) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ items });
  });
});

// Get inventory item by ID
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = 'SELECT * FROM inventory_items WHERE id = ?';

  db.getDb().get(query, [id], (err, item) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({ item });
  });
});

// Create inventory item
router.post('/', authenticateToken, requireRole(['admin', 'manager']), [
  body('name').notEmpty().trim(),
  body('category').notEmpty().trim(),
  body('unit').notEmpty().trim(),
  body('min_stock_level').isFloat({ min: 0 }),
  body('unit_cost').optional().isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    name,
    category,
    unit,
    current_stock = 0,
    min_stock_level,
    max_stock_level,
    unit_cost,
    supplier,
    location,
    barcode
  } = req.body;

  const query = `
    INSERT INTO inventory_items (name, category, unit, current_stock, min_stock_level, max_stock_level, unit_cost, supplier, location, barcode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.getDb().run(query, [
    name,
    category,
    unit,
    current_stock,
    min_stock_level,
    max_stock_level,
    unit_cost,
    supplier,
    location,
    barcode
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create inventory item' });
    }

    res.status(201).json({
      message: 'Inventory item created successfully',
      item: { id: this.lastID, name, category, current_stock }
    });
  });
});

// Update inventory item
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), [
  body('name').notEmpty().trim(),
  body('category').notEmpty().trim(),
  body('unit').notEmpty().trim(),
  body('min_stock_level').isFloat({ min: 0 }),
  body('unit_cost').optional().isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const {
    name,
    category,
    unit,
    min_stock_level,
    max_stock_level,
    unit_cost,
    supplier,
    location,
    barcode
  } = req.body;

  const query = `
    UPDATE inventory_items 
    SET name = ?, category = ?, unit = ?, min_stock_level = ?, max_stock_level = ?, 
        unit_cost = ?, supplier = ?, location = ?, barcode = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.getDb().run(query, [
    name,
    category,
    unit,
    min_stock_level,
    max_stock_level,
    unit_cost,
    supplier,
    location,
    barcode,
    id
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update inventory item' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({ message: 'Inventory item updated successfully' });
  });
});

// Delete inventory item
router.delete('/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM inventory_items WHERE id = ?';

  db.getDb().run(query, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({ message: 'Inventory item deleted successfully' });
  });
});

// INVENTORY TRANSACTIONS

// Get transactions for an item
router.get('/:id/transactions', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  const query = `
    SELECT t.*, u.username as created_by_username
    FROM inventory_transactions t
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.item_id = ?
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.getDb().all(query, [id, parseInt(limit), offset], (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ transactions });
  });
});

// Add stock (receive inventory)
router.post('/:id/receive', authenticateToken, [
  body('quantity').isFloat({ min: 0.01 }),
  body('unit_cost').optional().isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { quantity, unit_cost, notes, reference_type, reference_id } = req.body;

  const total_cost = unit_cost ? unit_cost * quantity : null;

  // Start transaction
  db.getDb().serialize(() => {
    db.getDb().run('BEGIN TRANSACTION');

    // Add transaction record
    const transactionQuery = `
      INSERT INTO inventory_transactions (item_id, transaction_type, quantity, unit_cost, total_cost, reference_type, reference_id, notes, created_by)
      VALUES (?, 'receive', ?, ?, ?, ?, ?, ?, ?)
    `;

    db.getDb().run(transactionQuery, [
      id, quantity, unit_cost, total_cost, reference_type, reference_id, notes, req.user.id
    ], function(err) {
      if (err) {
        db.getDb().run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to record transaction' });
      }

      // Update inventory stock
      const updateQuery = 'UPDATE inventory_items SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

      db.getDb().run(updateQuery, [quantity, id], function(err) {
        if (err) {
          db.getDb().run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to update stock' });
        }

        if (this.changes === 0) {
          db.getDb().run('ROLLBACK');
          return res.status(404).json({ error: 'Inventory item not found' });
        }

        db.getDb().run('COMMIT');
        res.json({ message: 'Stock received successfully' });
      });
    });
  });
});

// Issue stock (use inventory)
router.post('/:id/issue', authenticateToken, [
  body('quantity').isFloat({ min: 0.01 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { quantity, notes, reference_type, reference_id } = req.body;

  // Check if enough stock available
  const checkQuery = 'SELECT current_stock, unit_cost FROM inventory_items WHERE id = ?';

  db.getDb().get(checkQuery, [id], (err, item) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    if (item.current_stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock available' });
    }

    const total_cost = item.unit_cost ? item.unit_cost * quantity : null;

    // Start transaction
    db.getDb().serialize(() => {
      db.getDb().run('BEGIN TRANSACTION');

      // Add transaction record
      const transactionQuery = `
        INSERT INTO inventory_transactions (item_id, transaction_type, quantity, unit_cost, total_cost, reference_type, reference_id, notes, created_by)
        VALUES (?, 'issue', ?, ?, ?, ?, ?, ?, ?)
      `;

      db.getDb().run(transactionQuery, [
        id, quantity, item.unit_cost, total_cost, reference_type, reference_id, notes, req.user.id
      ], function(err) {
        if (err) {
          db.getDb().run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to record transaction' });
        }

        // Update inventory stock
        const updateQuery = 'UPDATE inventory_items SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

        db.getDb().run(updateQuery, [quantity, id], function(err) {
          if (err) {
            db.getDb().run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to update stock' });
          }

          db.getDb().run('COMMIT');
          res.json({ message: 'Stock issued successfully' });
        });
      });
    });
  });
});

// Adjust stock (manual adjustment)
router.post('/:id/adjust', authenticateToken, requireRole(['admin', 'manager']), [
  body('new_quantity').isFloat({ min: 0 }),
  body('reason').notEmpty().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { new_quantity, reason } = req.body;

  // Get current stock
  const checkQuery = 'SELECT current_stock, unit_cost FROM inventory_items WHERE id = ?';

  db.getDb().get(checkQuery, [id], (err, item) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const adjustment = new_quantity - item.current_stock;
    const transaction_type = adjustment >= 0 ? 'adjustment_in' : 'adjustment_out';
    const quantity = Math.abs(adjustment);

    if (quantity === 0) {
      return res.status(400).json({ error: 'No adjustment needed' });
    }

    // Start transaction
    db.getDb().serialize(() => {
      db.getDb().run('BEGIN TRANSACTION');

      // Add transaction record
      const transactionQuery = `
        INSERT INTO inventory_transactions (item_id, transaction_type, quantity, unit_cost, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.getDb().run(transactionQuery, [
        id, transaction_type, quantity, item.unit_cost, reason, req.user.id
      ], function(err) {
        if (err) {
          db.getDb().run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to record transaction' });
        }

        // Update inventory stock
        const updateQuery = 'UPDATE inventory_items SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

        db.getDb().run(updateQuery, [new_quantity, id], function(err) {
          if (err) {
            db.getDb().run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to update stock' });
          }

          db.getDb().run('COMMIT');
          res.json({ message: 'Stock adjusted successfully' });
        });
      });
    });
  });
});

// Get low stock items
router.get('/alerts/low-stock', authenticateToken, (req, res) => {
  const query = `
    SELECT * FROM inventory_items 
    WHERE current_stock <= min_stock_level 
    ORDER BY (current_stock / min_stock_level), name
  `;

  db.getDb().all(query, [], (err, items) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ items });
  });
});

// Get inventory categories
router.get('/categories/list', authenticateToken, (req, res) => {
  const query = 'SELECT DISTINCT category FROM inventory_items ORDER BY category';

  db.getDb().all(query, [], (err, categories) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const categoryList = categories.map(cat => cat.category);
    res.json({ categories: categoryList });
  });
});

// Get inventory locations
router.get('/locations/list', authenticateToken, (req, res) => {
  const query = 'SELECT DISTINCT location FROM inventory_items WHERE location IS NOT NULL ORDER BY location';

  db.getDb().all(query, [], (err, locations) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const locationList = locations.map(loc => loc.location);
    res.json({ locations: locationList });
  });
});

// Get inventory summary
router.get('/summary/overview', authenticateToken, (req, res) => {
  const queries = {
    totalItems: 'SELECT COUNT(*) as count FROM inventory_items',
    lowStockItems: 'SELECT COUNT(*) as count FROM inventory_items WHERE current_stock <= min_stock_level',
    totalValue: 'SELECT SUM(current_stock * unit_cost) as value FROM inventory_items WHERE unit_cost IS NOT NULL',
    categories: 'SELECT category, COUNT(*) as count FROM inventory_items GROUP BY category'
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    if (key === 'categories') {
      db.getDb().all(query, [], (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        results[key] = rows;
        completed++;
        if (completed === total) {
          res.json(results);
        }
      });
    } else {
      db.getDb().get(query, [], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        results[key] = row;
        completed++;
        if (completed === total) {
          res.json(results);
        }
      });
    }
  });
});

module.exports = router;