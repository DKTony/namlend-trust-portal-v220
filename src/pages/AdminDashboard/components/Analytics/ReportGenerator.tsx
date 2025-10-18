import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle
} from 'lucide-react';

const ReportGenerator: React.FC = () => {
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const reportTypes = [
    {
      id: 'portfolio-summary',
      name: 'Portfolio Summary Report',
      description: 'Comprehensive overview of loan portfolio performance',
      icon: PieChart,
      category: 'Portfolio',
      estimatedTime: '2-3 minutes'
    },
    {
      id: 'financial-performance',
      name: 'Financial Performance Report',
      description: 'Revenue, disbursements, and collection analytics',
      icon: TrendingUp,
      category: 'Financial',
      estimatedTime: '3-4 minutes'
    },
    {
      id: 'risk-assessment',
      name: 'Risk Assessment Report',
      description: 'Risk analysis and default probability metrics',
      icon: AlertTriangle,
      category: 'Risk',
      estimatedTime: '4-5 minutes'
    },
    {
      id: 'client-analytics',
      name: 'Client Analytics Report',
      description: 'Client demographics and behavior analysis',
      icon: Users,
      category: 'Clients',
      estimatedTime: '2-3 minutes'
    },
    {
      id: 'payment-analysis',
      name: 'Payment Analysis Report',
      description: 'Payment patterns and collection efficiency',
      icon: DollarSign,
      category: 'Payments',
      estimatedTime: '3-4 minutes'
    },
    {
      id: 'regulatory-compliance',
      name: 'Regulatory Compliance Report',
      description: 'Compliance status and regulatory metrics',
      icon: FileText,
      category: 'Compliance',
      estimatedTime: '5-6 minutes'
    }
  ];

  const handleReportSelection = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const generateReports = () => {
    // Implementation for report generation
    console.log('Generating reports:', selectedReports, dateRange);
  };

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReports.includes(report.id);
          
          return (
            <Card 
              key={report.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => handleReportSelection(report.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-full ${
                    isSelected ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`h-6 w-6 ${
                      isSelected ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{report.name}</h3>
                      {isSelected && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                        {report.category}
                      </span>
                      <span className="text-gray-500">{report.estimatedTime}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Generate Reports Section */}
      {selectedReports.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  {selectedReports.length} report{selectedReports.length > 1 ? 's' : ''} selected
                </h3>
                <p className="text-sm text-blue-700">
                  Estimated generation time: {Math.max(...selectedReports.map(id => 
                    parseInt(reportTypes.find(r => r.id === id)?.estimatedTime?.split('-')[1] || '0')
                  ))} minutes
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setSelectedReports([])}>
                  Clear Selection
                </Button>
                <Button onClick={generateReports}>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Reports
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Portfolio Summary - December 2024', date: '2025-01-03', status: 'completed' },
              { name: 'Risk Assessment - Q4 2024', date: '2025-01-02', status: 'completed' },
              { name: 'Financial Performance - December 2024', date: '2025-01-01', status: 'processing' }
            ].map((report, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">{report.name}</p>
                    <p className="text-sm text-gray-500">Generated on {report.date}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    report.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {report.status}
                  </span>
                  {report.status === 'completed' && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportGenerator;
