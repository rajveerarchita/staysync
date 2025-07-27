import React from 'react';
import { Settings, Users, Shield, Database } from 'lucide-react';

const Administration = () => {
  const adminSections = [
    {
      name: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      name: 'System Settings',
      description: 'Configure system preferences',
      icon: Settings,
      color: 'bg-green-500'
    },
    {
      name: 'Security',
      description: 'Security settings and access control',
      icon: Shield,
      color: 'bg-red-500'
    },
    {
      name: 'Database',
      description: 'Database management and backup',
      icon: Database,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-600">System administration and configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminSections.map((section, index) => (
          <div key={index} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
            <div className="p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${section.color}`}>
                  <section.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{section.name}</h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-gray-900">Database</p>
              <p className="text-xs text-gray-500">Connected</p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-gray-900">API Server</p>
              <p className="text-xs text-gray-500">Running</p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-gray-900">Services</p>
              <p className="text-xs text-gray-500">Online</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Administration;