import React from 'react';
import { Clipboard, Plus, CheckCircle, Clock } from 'lucide-react';

const FrontOffice = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Front Office</h1>
          <p className="text-gray-600">Manage tasks and maintenance requests</p>
        </div>
        <button className="btn-primary flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <Clipboard className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create tasks to manage daily operations.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Maintenance Requests</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                Maintenance requests will appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrontOffice;