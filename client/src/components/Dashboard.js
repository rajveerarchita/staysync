import React, { useState, useEffect } from 'react';
import {
  Users,
  Bed,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/api/reports/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = [
    {
      name: "Today's Arrivals",
      value: dashboardData?.todayArrivals?.count || 0,
      icon: Calendar,
      color: 'bg-blue-500',
    },
    {
      name: "Today's Departures",
      value: dashboardData?.todayDepartures?.count || 0,
      icon: Clock,
      color: 'bg-green-500',
    },
    {
      name: 'Current Occupancy',
      value: `${dashboardData?.currentOccupancy?.occupied || 0}/${dashboardData?.currentOccupancy?.total || 0}`,
      icon: Bed,
      color: 'bg-purple-500',
    },
    {
      name: 'Monthly Revenue',
      value: `$${(dashboardData?.monthlyRevenue?.revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
    {
      name: 'Pending Orders',
      value: dashboardData?.pendingOrders?.count || 0,
      icon: UtensilsCrossed,
      color: 'bg-orange-500',
    },
    {
      name: 'Low Stock Items',
      value: dashboardData?.lowStockItems?.count || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      name: 'Maintenance Requests',
      value: dashboardData?.maintenanceRequests?.count || 0,
      icon: CheckCircle,
      color: 'bg-indigo-500',
    },
  ];

  const occupancyRate = dashboardData?.currentOccupancy ? 
    Math.round((dashboardData.currentOccupancy.occupied / dashboardData.currentOccupancy.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome to your hotel management system</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Occupancy Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Occupancy Rate</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Current Occupancy</span>
              <span className="text-sm font-medium text-gray-900">{occupancyRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${occupancyRate}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="text-gray-600">Occupied</p>
                <p className="font-semibold text-red-600">
                  {dashboardData?.currentOccupancy?.occupied || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Available</p>
                <p className="font-semibold text-green-600">
                  {(dashboardData?.currentOccupancy?.total || 0) - (dashboardData?.currentOccupancy?.occupied || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                <span className="text-sm font-medium">New Reservation</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-sm font-medium">Check-in Guest</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-purple-600 mr-3" />
                <span className="text-sm font-medium">Check-out Guest</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-orange-600 mr-3" />
                <span className="text-sm font-medium">View Reports</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span className="text-gray-600">Room 101 checked in - John Smith</span>
              <span className="ml-auto text-gray-400">2 hours ago</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
              <span className="text-gray-600">New reservation created - Emma Johnson</span>
              <span className="ml-auto text-gray-400">4 hours ago</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
              <span className="text-gray-600">Maintenance request for Room 205</span>
              <span className="ml-auto text-gray-400">6 hours ago</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
              <span className="text-gray-600">Low stock alert - Towels</span>
              <span className="ml-auto text-gray-400">8 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;