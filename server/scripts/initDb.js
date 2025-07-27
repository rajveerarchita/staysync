const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function initializeDatabase() {
  console.log('🔄 Initializing database with sample data...');

  try {
    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    db.getDb().serialize(() => {
      // Insert sample users
      db.getDb().run(`
        INSERT OR IGNORE INTO users (username, email, password, role) VALUES
        ('admin', 'admin@hotel.com', ?, 'admin'),
        ('manager', 'manager@hotel.com', ?, 'manager'),
        ('receptionist', 'reception@hotel.com', ?, 'receptionist'),
        ('staff', 'staff@hotel.com', ?, 'staff')
      `, [hashedPassword, hashedPassword, hashedPassword, hashedPassword]);

      // Insert sample rooms
      db.getDb().run(`
        INSERT OR IGNORE INTO rooms (room_number, room_type, floor, capacity, price_per_night, amenities, description) VALUES
        ('101', 'Standard Single', 1, 1, 89.99, 'WiFi, TV, AC, Mini Fridge', 'Comfortable single room with city view'),
        ('102', 'Standard Double', 1, 2, 129.99, 'WiFi, TV, AC, Mini Fridge', 'Spacious double room with modern amenities'),
        ('103', 'Standard Twin', 1, 2, 119.99, 'WiFi, TV, AC, Mini Fridge', 'Twin bed room perfect for friends or colleagues'),
        ('201', 'Deluxe King', 2, 2, 189.99, 'WiFi, TV, AC, Mini Bar, Balcony', 'Luxurious king room with balcony'),
        ('202', 'Deluxe Queen', 2, 2, 169.99, 'WiFi, TV, AC, Mini Bar, Balcony', 'Elegant queen room with modern furnishing'),
        ('301', 'Suite', 3, 4, 299.99, 'WiFi, TV, AC, Mini Bar, Balcony, Living Area', 'Premium suite with separate living area'),
        ('302', 'Executive Suite', 3, 4, 399.99, 'WiFi, TV, AC, Mini Bar, Balcony, Living Area, Kitchen', 'Executive suite with full amenities'),
        ('401', 'Penthouse', 4, 6, 599.99, 'WiFi, TV, AC, Mini Bar, Balcony, Living Area, Kitchen, Jacuzzi', 'Luxury penthouse with panoramic views')
      `);

      // Insert sample guests
      db.getDb().run(`
        INSERT OR IGNORE INTO guests (first_name, last_name, email, phone, address, id_type, id_number, nationality) VALUES
        ('John', 'Smith', 'john.smith@email.com', '+1-555-0101', '123 Main St, New York, NY', 'Passport', 'P123456789', 'USA'),
        ('Emma', 'Johnson', 'emma.johnson@email.com', '+1-555-0102', '456 Oak Ave, Los Angeles, CA', 'Drivers License', 'DL987654321', 'USA'),
        ('Michael', 'Brown', 'michael.brown@email.com', '+44-20-1234567', '789 High St, London, UK', 'Passport', 'UK987654321', 'UK'),
        ('Sarah', 'Davis', 'sarah.davis@email.com', '+33-1-23456789', '321 Rue de la Paix, Paris, FR', 'Passport', 'FR123456789', 'France'),
        ('David', 'Wilson', 'david.wilson@email.com', '+49-30-12345678', '654 Unter den Linden, Berlin, DE', 'Passport', 'DE987654321', 'Germany')
      `);

      // Insert sample menu items
      db.getDb().run(`
        INSERT OR IGNORE INTO menu_items (name, description, category, price, cost, available) VALUES
        ('Classic Burger', 'Beef patty with lettuce, tomato, onion and cheese', 'Main Course', 14.99, 6.50, 1),
        ('Grilled Chicken Salad', 'Fresh mixed greens with grilled chicken breast', 'Salads', 12.99, 5.25, 1),
        ('Pasta Carbonara', 'Creamy pasta with bacon and parmesan cheese', 'Main Course', 16.99, 7.00, 1),
        ('Fish & Chips', 'Beer-battered fish with crispy fries', 'Main Course', 18.99, 8.50, 1),
        ('Caesar Salad', 'Crisp romaine lettuce with caesar dressing', 'Salads', 9.99, 4.00, 1),
        ('Chocolate Cake', 'Rich chocolate cake with vanilla ice cream', 'Desserts', 8.99, 3.50, 1),
        ('Coffee', 'Freshly brewed coffee', 'Beverages', 3.99, 1.00, 1),
        ('Fresh Orange Juice', 'Freshly squeezed orange juice', 'Beverages', 4.99, 2.00, 1),
        ('Breakfast Special', 'Eggs, bacon, toast, and hash browns', 'Breakfast', 11.99, 5.50, 1),
        ('Club Sandwich', 'Triple-decker sandwich with turkey and bacon', 'Light Meals', 13.99, 6.00, 1)
      `);

      // Insert sample inventory items
      db.getDb().run(`
        INSERT OR IGNORE INTO inventory_items (name, category, unit, current_stock, min_stock_level, max_stock_level, unit_cost, supplier, location) VALUES
        ('Toilet Paper', 'Housekeeping', 'Rolls', 150, 50, 200, 1.25, 'Cleaning Supplies Co', 'Storage Room A'),
        ('Towels', 'Housekeeping', 'Pieces', 80, 20, 100, 12.50, 'Linen Plus', 'Storage Room B'),
        ('Bed Sheets', 'Housekeeping', 'Sets', 60, 15, 80, 25.00, 'Linen Plus', 'Storage Room B'),
        ('Coffee Beans', 'Restaurant', 'Kg', 25, 10, 50, 15.00, 'Coffee Roasters Inc', 'Kitchen Storage'),
        ('Ground Beef', 'Restaurant', 'Kg', 20, 5, 30, 8.50, 'Fresh Meat Suppliers', 'Kitchen Freezer'),
        ('Chicken Breast', 'Restaurant', 'Kg', 15, 5, 25, 12.00, 'Fresh Meat Suppliers', 'Kitchen Freezer'),
        ('Lettuce', 'Restaurant', 'Heads', 30, 10, 50, 2.50, 'Fresh Produce Co', 'Kitchen Refrigerator'),
        ('Pasta', 'Restaurant', 'Kg', 40, 15, 60, 3.00, 'Italian Foods Ltd', 'Kitchen Pantry'),
        ('Cleaning Detergent', 'Housekeeping', 'Bottles', 25, 10, 40, 6.50, 'Cleaning Supplies Co', 'Storage Room A'),
        ('Light Bulbs', 'Maintenance', 'Pieces', 100, 20, 150, 3.50, 'Electrical Supply Co', 'Maintenance Room')
      `);

      console.log('✅ Database initialized with sample data');
      console.log('👤 Default admin user created:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Email: admin@hotel.com');
      console.log('');
      console.log('👤 Other test users:');
      console.log('   Manager - username: manager, password: admin123');
      console.log('   Receptionist - username: receptionist, password: admin123');
      console.log('   Staff - username: staff, password: admin123');
    });

  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;