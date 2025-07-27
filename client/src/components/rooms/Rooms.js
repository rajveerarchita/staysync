import React, { useState, useEffect } from 'react';
import { Bed, Plus, Edit, Trash2, Search } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await api.get('/api/rooms');
      setRooms(response.data.rooms);
    } catch (error) {
      toast.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      available: 'status-available',
      occupied: 'status-occupied',
      maintenance: 'status-maintenance',
      cleaning: 'status-cleaning',
      'out-of-order': 'status-maintenance'
    };
    
    return (
      <span className={statusClasses[status] || 'status-available'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredRooms = rooms.filter(room =>
    room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.room_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
          <p className="text-gray-600">Manage hotel rooms and their status</p>
        </div>
        <button className="btn-primary flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Room
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search rooms..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="form-select">
            <option value="">All Floors</option>
            <option value="1">Floor 1</option>
            <option value="2">Floor 2</option>
            <option value="3">Floor 3</option>
            <option value="4">Floor 4</option>
          </select>
          <select className="form-select">
            <option value="">All Types</option>
            <option value="Standard Single">Standard Single</option>
            <option value="Standard Double">Standard Double</option>
            <option value="Deluxe">Deluxe</option>
            <option value="Suite">Suite</option>
          </select>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRooms.map((room) => (
          <div key={room.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Bed className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="font-semibold text-lg">{room.room_number}</span>
                </div>
                {getStatusBadge(room.status)}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Type:</span> {room.room_type}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Floor:</span> {room.floor}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Capacity:</span> {room.capacity} guests
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Rate:</span> ${room.price_per_night}/night
                </p>
              </div>

              {room.amenities && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 font-medium mb-1">Amenities:</p>
                  <p className="text-xs text-gray-600">{room.amenities}</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details
                </button>
                <div className="flex items-center space-x-2">
                  <button className="text-gray-400 hover:text-gray-600">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12">
          <Bed className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No rooms found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding a new room.
          </p>
          <div className="mt-6">
            <button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;