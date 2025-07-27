const express = require('express');
const moment = require('moment');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Occupancy Report
router.get('/occupancy', authenticateToken, (req, res) => {
  const { start_date, end_date, room_type } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  let query = `
    SELECT 
      DATE(r.check_in_date) as date,
      COUNT(DISTINCT r.room_id) as occupied_rooms,
      (SELECT COUNT(*) FROM rooms ${room_type ? 'WHERE room_type = ?' : ''}) as total_rooms,
      ROUND((COUNT(DISTINCT r.room_id) * 100.0 / (SELECT COUNT(*) FROM rooms ${room_type ? 'WHERE room_type = ?' : ''})), 2) as occupancy_rate
    FROM reservations r
    JOIN rooms rm ON r.room_id = rm.id
    WHERE r.status IN ('confirmed', 'checked-in') 
    AND r.check_in_date <= ? AND r.check_out_date > ?
  `;

  const params = [];
  if (room_type) {
    query += ' AND rm.room_type = ?';
    params.push(room_type, room_type, end_date, start_date, room_type);
  } else {
    params.push(end_date, start_date);
  }

  query += ' GROUP BY DATE(r.check_in_date) ORDER BY date';

  db.getDb().all(query, params, (err, occupancyData) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ occupancyData });
  });
});

// Revenue Report
router.get('/revenue', authenticateToken, (req, res) => {
  const { start_date, end_date, breakdown = 'daily' } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  let dateFormat;
  switch (breakdown) {
    case 'monthly':
      dateFormat = '%Y-%m';
      break;
    case 'weekly':
      dateFormat = '%Y-%W';
      break;
    default:
      dateFormat = '%Y-%m-%d';
  }

  const query = `
    SELECT 
      strftime('${dateFormat}', created_at) as period,
      'reservations' as source,
      SUM(total_amount) as revenue,
      COUNT(*) as count
    FROM reservations 
    WHERE payment_status = 'paid' 
    AND DATE(created_at) BETWEEN ? AND ?
    GROUP BY period
    
    UNION ALL
    
    SELECT 
      strftime('${dateFormat}', created_at) as period,
      'restaurant' as source,
      SUM(total_amount) as revenue,
      COUNT(*) as count
    FROM restaurant_orders 
    WHERE payment_method IS NOT NULL 
    AND DATE(created_at) BETWEEN ? AND ?
    GROUP BY period
    
    ORDER BY period, source
  `;

  db.getDb().all(query, [start_date, end_date, start_date, end_date], (err, revenueData) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ revenueData });
  });
});

// Guest Demographics Report
router.get('/guest-demographics', authenticateToken, (req, res) => {
  const queries = {
    byNationality: `
      SELECT nationality, COUNT(*) as count 
      FROM guests 
      WHERE nationality IS NOT NULL 
      GROUP BY nationality 
      ORDER BY count DESC 
      LIMIT 10
    `,
    byAgeGroup: `
      SELECT 
        CASE 
          WHEN julianday('now') - julianday(date_of_birth) < 365.25 * 25 THEN 'Under 25'
          WHEN julianday('now') - julianday(date_of_birth) < 365.25 * 35 THEN '25-34'
          WHEN julianday('now') - julianday(date_of_birth) < 365.25 * 45 THEN '35-44'
          WHEN julianday('now') - julianday(date_of_birth) < 365.25 * 55 THEN '45-54'
          WHEN julianday('now') - julianday(date_of_birth) < 365.25 * 65 THEN '55-64'
          ELSE '65+'
        END as age_group,
        COUNT(*) as count
      FROM guests 
      WHERE date_of_birth IS NOT NULL
      GROUP BY age_group
      ORDER BY count DESC
    `,
    totalGuests: 'SELECT COUNT(*) as count FROM guests'
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.getDb().all(query, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      results[key] = key === 'totalGuests' ? rows[0] : rows;
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  });
});

// Room Performance Report
router.get('/room-performance', authenticateToken, (req, res) => {
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  const query = `
    SELECT 
      r.room_number,
      r.room_type,
      r.floor,
      COUNT(res.id) as total_bookings,
      SUM(res.total_amount) as total_revenue,
      AVG(res.total_amount) as avg_booking_value,
      AVG(julianday(res.check_out_date) - julianday(res.check_in_date)) as avg_stay_duration
    FROM rooms r
    LEFT JOIN reservations res ON r.id = res.room_id 
      AND res.status IN ('confirmed', 'checked-in', 'checked-out')
      AND DATE(res.created_at) BETWEEN ? AND ?
    GROUP BY r.id, r.room_number, r.room_type, r.floor
    ORDER BY total_revenue DESC
  `;

  db.getDb().all(query, [start_date, end_date], (err, roomData) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ roomData });
  });
});

// Restaurant Performance Report
router.get('/restaurant-performance', authenticateToken, (req, res) => {
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  const queries = {
    ordersByType: `
      SELECT order_type, COUNT(*) as count, SUM(total_amount) as revenue
      FROM restaurant_orders 
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY order_type
    `,
    popularItems: `
      SELECT mi.name, mi.category, SUM(oi.quantity) as total_sold, SUM(oi.total_price) as revenue
      FROM restaurant_order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      JOIN restaurant_orders ro ON oi.order_id = ro.id
      WHERE DATE(ro.created_at) BETWEEN ? AND ?
      GROUP BY mi.id, mi.name, mi.category
      ORDER BY total_sold DESC
      LIMIT 10
    `,
    dailySales: `
      SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total_amount) as revenue
      FROM restaurant_orders 
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.getDb().all(query, [start_date, end_date], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      results[key] = rows;
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  });
});

// Financial Summary Report
router.get('/financial-summary', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  const queries = {
    roomRevenue: `
      SELECT SUM(total_amount) as revenue, COUNT(*) as bookings
      FROM reservations 
      WHERE payment_status = 'paid' 
      AND DATE(created_at) BETWEEN ? AND ?
    `,
    restaurantRevenue: `
      SELECT SUM(total_amount) as revenue, COUNT(*) as orders
      FROM restaurant_orders 
      WHERE payment_method IS NOT NULL 
      AND DATE(created_at) BETWEEN ? AND ?
    `,
    pendingPayments: `
      SELECT SUM(total_amount) as amount, COUNT(*) as count
      FROM reservations 
      WHERE payment_status IN ('pending', 'partial') 
      AND DATE(created_at) BETWEEN ? AND ?
    `,
    cancellations: `
      SELECT COUNT(*) as count, SUM(total_amount) as lost_revenue
      FROM reservations 
      WHERE status = 'cancelled' 
      AND DATE(created_at) BETWEEN ? AND ?
    `
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.getDb().get(query, [start_date, end_date], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      results[key] = row;
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  });
});

// Inventory Valuation Report
router.get('/inventory-valuation', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { category } = req.query;

  let query = `
    SELECT 
      category,
      COUNT(*) as item_count,
      SUM(current_stock * unit_cost) as total_value,
      SUM(CASE WHEN current_stock <= min_stock_level THEN 1 ELSE 0 END) as low_stock_items
    FROM inventory_items 
    WHERE unit_cost IS NOT NULL
  `;

  const params = [];
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' GROUP BY category ORDER BY total_value DESC';

  db.getDb().all(query, params, (err, valuationData) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_items,
        SUM(current_stock * unit_cost) as total_portfolio_value,
        SUM(CASE WHEN current_stock <= min_stock_level THEN 1 ELSE 0 END) as total_low_stock
      FROM inventory_items 
      WHERE unit_cost IS NOT NULL
      ${category ? 'AND category = ?' : ''}
    `;

    db.getDb().get(summaryQuery, params, (err, summary) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ 
        valuationData,
        summary
      });
    });
  });
});

// Maintenance Report
router.get('/maintenance', authenticateToken, (req, res) => {
  const { start_date, end_date, status } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  let query = `
    SELECT 
      mr.*,
      r.room_number,
      u1.username as assigned_to_username,
      u2.username as created_by_username
    FROM maintenance_requests mr
    LEFT JOIN rooms r ON mr.room_id = r.id
    LEFT JOIN users u1 ON mr.assigned_to = u1.id
    LEFT JOIN users u2 ON mr.created_by = u2.id
    WHERE DATE(mr.created_at) BETWEEN ? AND ?
  `;

  const params = [start_date, end_date];

  if (status) {
    query += ' AND mr.status = ?';
    params.push(status);
  }

  query += ' ORDER BY mr.created_at DESC';

  db.getDb().all(query, params, (err, maintenanceData) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get summary stats
    const summaryQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(CASE WHEN completed_at IS NOT NULL 
            THEN julianday(completed_at) - julianday(created_at) 
            ELSE NULL END) as avg_completion_days,
        SUM(actual_cost) as total_cost
      FROM maintenance_requests 
      WHERE DATE(created_at) BETWEEN ? AND ?
      ${status ? 'AND status = ?' : ''}
      GROUP BY status
    `;

    db.getDb().all(summaryQuery, params, (err, summary) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ 
        maintenanceData,
        summary
      });
    });
  });
});

// Dashboard Summary
router.get('/dashboard', authenticateToken, (req, res) => {
  const today = moment().format('YYYY-MM-DD');
  const thisMonth = moment().format('YYYY-MM');

  const queries = {
    todayArrivals: `
      SELECT COUNT(*) as count 
      FROM reservations 
      WHERE check_in_date = ? AND status = 'confirmed'
    `,
    todayDepartures: `
      SELECT COUNT(*) as count 
      FROM reservations 
      WHERE check_out_date = ? AND status = 'checked-in'
    `,
    currentOccupancy: `
      SELECT COUNT(*) as occupied, (SELECT COUNT(*) FROM rooms) as total
      FROM reservations r
      WHERE r.status = 'checked-in' AND r.check_in_date <= ? AND r.check_out_date > ?
    `,
    monthlyRevenue: `
      SELECT 
        (SELECT COALESCE(SUM(total_amount), 0) FROM reservations WHERE payment_status = 'paid' AND strftime('%Y-%m', created_at) = ?) +
        (SELECT COALESCE(SUM(total_amount), 0) FROM restaurant_orders WHERE payment_method IS NOT NULL AND strftime('%Y-%m', created_at) = ?) as revenue
    `,
    pendingOrders: `
      SELECT COUNT(*) as count 
      FROM restaurant_orders 
      WHERE status IN ('pending', 'preparing')
    `,
    lowStockItems: `
      SELECT COUNT(*) as count 
      FROM inventory_items 
      WHERE current_stock <= min_stock_level
    `,
    maintenanceRequests: `
      SELECT COUNT(*) as count 
      FROM maintenance_requests 
      WHERE status = 'open'
    `
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    let params = [];
    
    switch (key) {
      case 'todayArrivals':
      case 'todayDepartures':
        params = [today];
        break;
      case 'currentOccupancy':
        params = [today, today];
        break;
      case 'monthlyRevenue':
        params = [thisMonth, thisMonth];
        break;
    }

    db.getDb().get(query, params, (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      results[key] = row;
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  });
});

module.exports = router;