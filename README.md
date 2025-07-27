# 🏨 Hotel Management System

A comprehensive hotel management software solution built with Node.js, React, and SQLite. This system provides complete functionality for managing hotel operations including reception work, restaurant operations, administration, reporting, front office management, and inventory tracking.

## ✨ Features

### 🏢 Core Modules

1. **Reception & Front Office**
   - Guest check-in/check-out
   - Room assignments
   - Daily tasks management
   - Maintenance requests

2. **Room Management**
   - Room inventory and status tracking
   - Room types and amenities
   - Availability management
   - Housekeeping coordination

3. **Guest Management**
   - Guest profiles and information
   - Contact details and preferences
   - Guest history and analytics

4. **Reservation System**
   - Online booking management
   - Reservation status tracking
   - Payment processing
   - Cancellation handling

5. **Restaurant Management**
   - Menu management
   - Order processing (dine-in, room service, takeaway)
   - Kitchen operations
   - POS system

6. **Inventory Management**
   - Stock tracking and management
   - Low stock alerts
   - Supplier management
   - Cost tracking

7. **Reports & Analytics**
   - Occupancy reports
   - Revenue analysis
   - Guest demographics
   - Operational metrics

8. **Administration**
   - User management
   - Role-based access control
   - System configuration
   - Database management

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hotel-management-system
   ```

2. **Install dependencies**
   ```bash
   npm run install-deps
   ```

3. **Initialize the database**
   ```bash
   cd server
   npm run init-db
   ```

4. **Start the development servers**
   ```bash
   cd ..
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Demo Credentials

```
Admin User:
Username: admin
Password: admin123

Manager User:
Username: manager  
Password: admin123

Receptionist User:
Username: receptionist
Password: admin123

Staff User:
Username: staff
Password: admin123
```

## 🏗️ Architecture

### Backend (Node.js/Express)

- **RESTful API** with comprehensive endpoints
- **SQLite Database** for data persistence
- **JWT Authentication** for secure access
- **Role-based Authorization** (Admin, Manager, Staff, Receptionist)
- **Input Validation** with express-validator
- **Security** with helmet and rate limiting

### Frontend (React)

- **Modern React** with hooks and context
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Responsive Design** for mobile and desktop
- **Real-time Notifications** with react-hot-toast

### Database Schema

The system uses SQLite with the following main tables:
- `users` - User accounts and authentication
- `rooms` - Room inventory and details
- `guests` - Guest information
- `reservations` - Booking and reservation data
- `menu_items` - Restaurant menu
- `restaurant_orders` - Food orders and billing
- `inventory_items` - Stock and inventory
- `front_office_tasks` - Daily tasks and operations
- `maintenance_requests` - Maintenance and repairs

## 📋 API Documentation

### Authentication Endpoints

```
POST /api/auth/login          # User login
POST /api/auth/register       # User registration
GET  /api/auth/me            # Get current user
GET  /api/auth/users         # Get all users (admin only)
```

### Room Management

```
GET    /api/rooms            # Get all rooms
GET    /api/rooms/:id        # Get room by ID
POST   /api/rooms            # Create new room
PUT    /api/rooms/:id        # Update room
DELETE /api/rooms/:id        # Delete room
PATCH  /api/rooms/:id/status # Update room status
```

### Reservation Management

```
GET    /api/reservations              # Get all reservations
GET    /api/reservations/:id          # Get reservation by ID
POST   /api/reservations              # Create new reservation
PUT    /api/reservations/:id          # Update reservation
PATCH  /api/reservations/:id/status   # Update reservation status
GET    /api/reservations/arrivals/today    # Today's arrivals
GET    /api/reservations/departures/today  # Today's departures
```

### Restaurant Management

```
GET    /api/restaurant/menu           # Get menu items
POST   /api/restaurant/menu           # Create menu item
GET    /api/restaurant/orders         # Get all orders
POST   /api/restaurant/orders         # Create new order
PATCH  /api/restaurant/orders/:id/status # Update order status
```

### Inventory Management

```
GET    /api/inventory                 # Get all inventory items
POST   /api/inventory                 # Create inventory item
POST   /api/inventory/:id/receive     # Receive stock
POST   /api/inventory/:id/issue       # Issue stock
GET    /api/inventory/alerts/low-stock # Get low stock alerts
```

### Reports

```
GET /api/reports/dashboard            # Dashboard summary
GET /api/reports/occupancy           # Occupancy report
GET /api/reports/revenue             # Revenue report
GET /api/reports/guest-demographics  # Guest analytics
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the server directory:

```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
```

### Database Configuration

The system uses SQLite by default. The database file is created automatically at `server/database/hotel.db`.

## 🛡️ Security Features

- **JWT Authentication** with token expiration
- **Password Hashing** using bcryptjs
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **CORS Protection** with configurable origins
- **Helmet** for security headers

## 👥 User Roles & Permissions

### Admin
- Full system access
- User management
- System configuration
- All reports and analytics

### Manager
- Room and reservation management
- Restaurant operations
- Inventory management
- Operational reports

### Receptionist
- Guest check-in/check-out
- Reservation management
- Front office tasks
- Basic reporting

### Staff
- Assigned task management
- Basic operational functions
- Limited access to sensitive data

## 📱 Features by Module

### Dashboard
- Real-time metrics and KPIs
- Quick action buttons
- Recent activity feed
- Occupancy visualization

### Room Management
- Visual room status grid
- Room type categorization
- Amenities management
- Maintenance scheduling

### Guest Management
- Comprehensive guest profiles
- Contact information tracking
- Guest history and preferences
- Search and filtering

### Reservation System
- Calendar-based booking
- Availability checking
- Payment tracking
- Automated confirmations

### Restaurant POS
- Menu item management
- Order processing workflow
- Table and room service
- Kitchen display system

### Inventory Control
- Stock level monitoring
- Automatic reorder alerts
- Supplier management
- Cost tracking and analysis

### Reporting Suite
- Occupancy rate analysis
- Revenue performance
- Guest demographics
- Operational efficiency metrics

### Front Office
- Task assignment and tracking
- Maintenance request system
- Daily operations checklist
- Staff communication tools

## 🚀 Production Deployment

### Environment Setup

1. **Server Requirements**
   - Node.js 16+ runtime
   - 512MB+ RAM
   - 10GB+ storage

2. **Database Migration**
   ```bash
   npm run init-db
   ```

3. **Build Frontend**
   ```bash
   cd client
   npm run build
   ```

4. **Start Production Server**
   ```bash
   cd server
   NODE_ENV=production npm start
   ```

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔄 Backup & Recovery

### Database Backup
```bash
# Backup SQLite database
cp server/database/hotel.db backups/hotel_$(date +%Y%m%d).db

# Automated backup script
0 2 * * * /path/to/backup-script.sh
```

### Data Migration
```bash
# Export data
npm run export-data

# Import data
npm run import-data backup.json
```

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd server
npm test

# Frontend tests  
cd client
npm test

# Integration tests
npm run test:integration
```

### Test Coverage
- Unit tests for API endpoints
- Frontend component testing
- Database integration tests
- Authentication flow testing

## 📖 Documentation

### API Documentation
- Full API documentation available at `/api/docs` when server is running
- Postman collection available in `/docs/postman/`

### User Manual
- Complete user guide in `/docs/user-manual.pdf`
- Video tutorials available in `/docs/videos/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in `/docs/`
- Review the FAQ section

## 🎯 Roadmap

### Version 2.0 Features
- [ ] Mobile app integration
- [ ] Advanced analytics dashboard
- [ ] Multi-property management
- [ ] Integration with booking platforms
- [ ] IoT device integration
- [ ] AI-powered recommendations

### Performance Improvements
- [ ] Database optimization
- [ ] Caching implementation
- [ ] API rate optimization
- [ ] Frontend performance tuning

---

**Built with ❤️ for the hospitality industry**

This comprehensive hotel management system provides everything needed to run a modern hotel efficiently, from guest management to operational reporting. The modular architecture ensures scalability and easy customization for specific hotel needs.
