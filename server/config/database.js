const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/hotel.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('✅ Connected to SQLite database');
        this.initializeTables();
      }
    });
  }

  async initializeTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Users table for authentication
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'staff',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Rooms table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_number TEXT UNIQUE NOT NULL,
            room_type TEXT NOT NULL,
            floor INTEGER NOT NULL,
            capacity INTEGER NOT NULL,
            price_per_night DECIMAL(10,2) NOT NULL,
            status TEXT DEFAULT 'available',
            amenities TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Guests table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS guests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT,
            address TEXT,
            id_type TEXT,
            id_number TEXT,
            nationality TEXT,
            date_of_birth DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Reservations table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guest_id INTEGER NOT NULL,
            room_id INTEGER NOT NULL,
            check_in_date DATE NOT NULL,
            check_out_date DATE NOT NULL,
            adults INTEGER DEFAULT 1,
            children INTEGER DEFAULT 0,
            total_amount DECIMAL(10,2) NOT NULL,
            status TEXT DEFAULT 'confirmed',
            payment_status TEXT DEFAULT 'pending',
            special_requests TEXT,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guest_id) REFERENCES guests (id),
            FOREIGN KEY (room_id) REFERENCES rooms (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
          )
        `);

        // Menu items for restaurant
        this.db.run(`
          CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            price DECIMAL(8,2) NOT NULL,
            cost DECIMAL(8,2),
            available BOOLEAN DEFAULT 1,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Restaurant orders
        this.db.run(`
          CREATE TABLE IF NOT EXISTS restaurant_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_number TEXT,
            room_number TEXT,
            guest_id INTEGER,
            order_type TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            total_amount DECIMAL(10,2) NOT NULL,
            tax_amount DECIMAL(10,2) DEFAULT 0,
            discount_amount DECIMAL(10,2) DEFAULT 0,
            payment_method TEXT,
            notes TEXT,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guest_id) REFERENCES guests (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
          )
        `);

        // Restaurant order items
        this.db.run(`
          CREATE TABLE IF NOT EXISTS restaurant_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            menu_item_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(8,2) NOT NULL,
            total_price DECIMAL(8,2) NOT NULL,
            special_instructions TEXT,
            FOREIGN KEY (order_id) REFERENCES restaurant_orders (id),
            FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
          )
        `);

        // Inventory items
        this.db.run(`
          CREATE TABLE IF NOT EXISTS inventory_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            unit TEXT NOT NULL,
            current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
            min_stock_level DECIMAL(10,2) NOT NULL DEFAULT 0,
            max_stock_level DECIMAL(10,2),
            unit_cost DECIMAL(8,2),
            supplier TEXT,
            location TEXT,
            barcode TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Inventory transactions
        this.db.run(`
          CREATE TABLE IF NOT EXISTS inventory_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            transaction_type TEXT NOT NULL,
            quantity DECIMAL(10,2) NOT NULL,
            unit_cost DECIMAL(8,2),
            total_cost DECIMAL(10,2),
            reference_type TEXT,
            reference_id INTEGER,
            notes TEXT,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES inventory_items (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
          )
        `);

        // Front office tasks
        this.db.run(`
          CREATE TABLE IF NOT EXISTS front_office_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            assigned_to INTEGER,
            due_date DATETIME,
            completed_at DATETIME,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assigned_to) REFERENCES users (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
          )
        `);

        // Maintenance requests
        this.db.run(`
          CREATE TABLE IF NOT EXISTS maintenance_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'open',
            assigned_to INTEGER,
            estimated_cost DECIMAL(10,2),
            actual_cost DECIMAL(10,2),
            completed_at DATETIME,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (room_id) REFERENCES rooms (id),
            FOREIGN KEY (assigned_to) REFERENCES users (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
          )
        `);

        console.log('✅ Database tables initialized');
        resolve();
      });
    });
  }

  getDb() {
    return this.db;
  }

  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error(err.message);
        }
        console.log('Database connection closed');
        resolve();
      });
    });
  }
}

module.exports = new Database();