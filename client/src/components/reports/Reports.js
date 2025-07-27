import React from 'react';
import { FileText, BarChart3, TrendingUp, Users } from 'lucide-react';

const Reports = () => {
  const reportTypes = [
    {
      name: 'Occupancy Report',
      description: 'Room occupancy rates and trends',
      icon: BarChart3,
      color: 'bg-blue-500'
    },
    {
      name: 'Revenue Report',
      description: 'Financial performance and revenue analysis',
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      name: 'Guest Analytics',
      description: 'Guest demographics and behavior',
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      name: 'Operational Report',
      description: 'Daily operations and performance metrics',
      icon: FileText,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600">Generate comprehensive reports and analyze performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report, index) => (
          <div key={index} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
            <div className="p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${report.color}`}>
                  <report.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{report.name}</h3>
                  <p className="text-sm text-gray-600">{report.description}</p>
                </div>
              </div>
              <div className="mt-4">
                <button className="btn-primary w-full">Generate Report</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Reports</h3>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reports generated</h3>
            <p className="mt-1 text-sm text-gray-500">
              Generate your first report to see it here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;