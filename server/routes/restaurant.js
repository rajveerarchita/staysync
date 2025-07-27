const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// MENU MANAGEMENT

// Get all menu items
router.get('/menu', authenticateToken, (req, res) => {
  const { category, available } = req.query;

  let query = 'SELECT * FROM menu_items WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (available !== undefined) {
    query += ' AND available = ?';
    params.push(available === 'true' ? 1 : 0);
  }

  query += ' ORDER BY category, name';

  db.getDb().all(query, params, (err, menuItems) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ menuItems });
  });
});

// Get menu item by ID
router.get('/menu/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = 'SELECT * FROM menu_items WHERE id = ?';

  db.getDb().get(query, [id], (err, menuItem) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ menuItem });
  });
});

// Create menu item
router.post('/menu', authenticateToken, requireRole(['admin', 'manager']), [
  body('name').notEmpty().trim(),
  body('category').notEmpty().trim(),
  body('price').isFloat({ min: 0 }),
  body('cost').optional().isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, category, price, cost, image_url } = req.body;

  const query = `
    INSERT INTO menu_items (name, description, category, price, cost, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.getDb().run(query, [name, description, category, price, cost, image_url], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create menu item' });
    }

    res.status(201).json({
      message: 'Menu item created successfully',
      menuItem: { id: this.lastID, name, category, price }
    });
  });
});

// Update menu item
router.put('/menu/:id', authenticateToken, requireRole(['admin', 'manager']), [
  body('name').notEmpty().trim(),
  body('category').notEmpty().trim(),
  body('price').isFloat({ min: 0 }),
  body('cost').optional().isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, description, category, price, cost, available, image_url } = req.body;

  const query = `
    UPDATE menu_items 
    SET name = ?, description = ?, category = ?, price = ?, cost = ?, 
        available = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.getDb().run(query, [name, description, category, price, cost, available ? 1 : 0, image_url, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update menu item' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ message: 'Menu item updated successfully' });
  });
});

// Delete menu item
router.delete('/menu/:id', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM menu_items WHERE id = ?';

  db.getDb().run(query, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ message: 'Menu item deleted successfully' });
  });
});

// Get menu categories
router.get('/menu/categories/list', authenticateToken, (req, res) => {
  const query = 'SELECT DISTINCT category FROM menu_items ORDER BY category';

  db.getDb().all(query, [], (err, categories) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const categoryList = categories.map(cat => cat.category);
    res.json({ categories: categoryList });
  });
});

// ORDER MANAGEMENT

// Get all orders
router.get('/orders', authenticateToken, (req, res) => {
  const { status, order_type, date, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT o.*, 
           g.first_name, g.last_name,
           u.username as created_by_username
    FROM restaurant_orders o
    LEFT JOIN guests g ON o.guest_id = g.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND o.status = ?';
    params.push(status);
  }

  if (order_type) {
    query += ' AND o.order_type = ?';
    params.push(order_type);
  }

  if (date) {
    query += ' AND DATE(o.created_at) = ?';
    params.push(date);
  }

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.getDb().all(query, params, (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ orders });
  });
});

// Get order by ID with items
router.get('/orders/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const orderQuery = `
    SELECT o.*, 
           g.first_name, g.last_name, g.phone,
           u.username as created_by_username
    FROM restaurant_orders o
    LEFT JOIN guests g ON o.guest_id = g.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.id = ?
  `;

  const itemsQuery = `
    SELECT oi.*, mi.name, mi.description
    FROM restaurant_order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE oi.order_id = ?
  `;

  db.getDb().get(orderQuery, [id], (err, order) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    db.getDb().all(itemsQuery, [id], (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ order: { ...order, items } });
    });
  });
});

// Create new order
router.post('/orders', authenticateToken, [
  body('order_type').isIn(['dine-in', 'room-service', 'takeaway']),
  body('items').isArray({ min: 1 }),
  body('items.*.menu_item_id').isInt({ min: 1 }),
  body('items.*.quantity').isInt({ min: 1 }),
  body('total_amount').isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    table_number,
    room_number,
    guest_id,
    order_type,
    items,
    total_amount,
    tax_amount = 0,
    discount_amount = 0,
    notes
  } = req.body;

  // Start transaction
  db.getDb().serialize(() => {
    db.getDb().run('BEGIN TRANSACTION');

    const orderQuery = `
      INSERT INTO restaurant_orders (table_number, room_number, guest_id, order_type, total_amount, tax_amount, discount_amount, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.getDb().run(orderQuery, [
      table_number,
      room_number,
      guest_id,
      order_type,
      total_amount,
      tax_amount,
      discount_amount,
      notes,
      req.user.id
    ], function(err) {
      if (err) {
        db.getDb().run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to create order' });
      }

      const orderId = this.lastID;

      // Insert order items
      const itemQuery = `
        INSERT INTO restaurant_order_items (order_id, menu_item_id, quantity, unit_price, total_price, special_instructions)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      let itemsProcessed = 0;
      let hasError = false;

      items.forEach(item => {
        // Get menu item price
        db.getDb().get('SELECT price FROM menu_items WHERE id = ?', [item.menu_item_id], (err, menuItem) => {
          if (err || !menuItem) {
            if (!hasError) {
              hasError = true;
              db.getDb().run('ROLLBACK');
              return res.status(400).json({ error: 'Invalid menu item' });
            }
            return;
          }

          const unitPrice = item.unit_price || menuItem.price;
          const totalPrice = unitPrice * item.quantity;

          db.getDb().run(itemQuery, [
            orderId,
            item.menu_item_id,
            item.quantity,
            unitPrice,
            totalPrice,
            item.special_instructions
          ], (err) => {
            if (err && !hasError) {
              hasError = true;
              db.getDb().run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to create order items' });
            }

            itemsProcessed++;
            if (itemsProcessed === items.length && !hasError) {
              db.getDb().run('COMMIT');
              res.status(201).json({
                message: 'Order created successfully',
                order: { id: orderId, order_type, total_amount }
              });
            }
          });
        });
      });
    });
  });
});

// Update order status
router.patch('/orders/:id/status', authenticateToken, [
  body('status').isIn(['pending', 'preparing', 'ready', 'served', 'cancelled'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { status } = req.body;

  const query = 'UPDATE restaurant_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

  db.getDb().run(query, [status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order status updated successfully' });
  });
});

// Process payment for order
router.patch('/orders/:id/payment', authenticateToken, [
  body('payment_method').notEmpty().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { payment_method } = req.body;

  const query = 'UPDATE restaurant_orders SET payment_method = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

  db.getDb().run(query, [payment_method, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Payment processed successfully' });
  });
});

// Get orders summary for today
router.get('/orders/summary/today', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const query = `
    SELECT 
      status,
      COUNT(*) as count,
      SUM(total_amount) as total_amount
    FROM restaurant_orders 
    WHERE DATE(created_at) = ?
    GROUP BY status
  `;

  db.getDb().all(query, [today], (err, summary) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ summary });
  });
});

module.exports = router;