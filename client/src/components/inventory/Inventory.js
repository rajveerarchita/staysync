import React from 'react';
import { Package, Plus, Search } from 'lucide-react';

const Inventory = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Track and manage inventory items</p>
        </div>
        <button className="btn-primary flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search inventory..."
              className="form-input pl-10"
            />
          </div>
          <select className="form-select">
            <option value="">All Categories</option>
            <option value="housekeeping">Housekeeping</option>
            <option value="restaurant">Restaurant</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <button className="btn-secondary">Filter</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Inventory Items</h3>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory items</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start by adding inventory items.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;