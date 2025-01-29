import React, { useState, useEffect } from 'react';
import { BarChart, Activity, Users, Clock, TrendingUp, Calendar, Download, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, subDays } from 'date-fns';

interface AnalyticsData {
  total_queries: number;
  popular_categories: Record<string, number>;
  average_confidence: number;
  query_history: Array<{
    query: string;
    timestamp: string;
    confidence: number;
  }>;
  daily_stats: Array<{
    date: string;
    queries: number;
    confidence: number;
  }>;
  user_engagement: {
    total_users: number;
    active_users: number;
    new_users: number;
  };
}

interface FilterOptions {
  category?: string;
  confidence?: number;
  dateRange?: [Date, Date];
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    let interval: number;
    
    if (autoRefresh) {
      interval = setInterval(fetchAnalytics, 30000) as unknown as number;
    }
    
    return () => clearInterval(interval);
  }, [timeRange, filters, autoRefresh]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'json' | 'pdf') => {
    if (!data) return;

    switch (format) {
      case 'csv':
        const csvContent = [
          ['Date', 'Queries', 'Confidence'],
          ...data.daily_stats.map(day => [
            day.date,
            day.queries.toString(),
            day.confidence.toString()
          ])
        ].map(row => row.join(',')).join('\n');
        
        downloadFile(csvContent, 'analytics.csv', 'text/csv');
        break;

      case 'json':
        const jsonContent = JSON.stringify(data, null, 2);
        downloadFile(jsonContent, 'analytics.json', 'application/json');
        break;

      case 'pdf':
        // In a real implementation, you'd use a PDF library
        alert('PDF export would be implemented with a PDF generation library');
        break;
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderTimeSeriesChart = () => {
    if (!data?.daily_stats) return null;

    const maxQueries = Math.max(...data.daily_stats.map(d => d.queries));
    const chartHeight = 200;

    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold">Query Trends</h3>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded ${
                autoRefresh ? 'text-blue-600' : 'text-gray-400'
              }`}
              title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <div className="flex space-x-2">
            {['week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`px-3 py-1 rounded text-sm ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="relative h-[200px]">
          <div className="absolute inset-0 flex items-end space-x-1">
            {data.daily_stats.map((day, index) => (
              <div
                key={index}
                className="flex-1 flex flex-col items-center group relative"
                style={{ height: '100%' }}
              >
                <div
                  className="w-full bg-blue-500 rounded-t group-hover:bg-blue-600 transition-colors"
                  style={{
                    height: `${(day.queries / maxQueries) * chartHeight}px`,
                    opacity: 0.7 + (day.confidence * 0.3)
                  }}
                />
                <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">
                  {format(new Date(day.date), 'MMM d')}
                </span>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 bg-gray-800 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p>Queries: {day.queries}</p>
                  <p>Confidence: {(day.confidence * 100).toFixed(1)}%</p>
                  <p>Date: {format(new Date(day.date), 'MMM d, yyyy')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFilters = () => (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        <button
          onClick={() => setFilters({})}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Reset
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {Object.keys(data?.popular_categories || {}).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Confidence
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={(filters.confidence || 0) * 100}
            onChange={(e) =>
              setFilters({
                ...filters,
                confidence: parseInt(e.target.value) / 100,
              })
            }
            className="w-full"
          />
          <div className="text-sm text-gray-500 text-center">
            {((filters.confidence || 0) * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <div className="flex space-x-2">
            <input
              type="date"
              value={filters.dateRange?.[0]?.toISOString().split('T')[0] || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateRange: [new Date(e.target.value), filters.dateRange?.[1] || new Date()],
                })
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.dateRange?.[1]?.toISOString().split('T')[0] || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateRange: [filters.dateRange?.[0] || new Date(), new Date(e.target.value)],
                })
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-600">
        Failed to load analytics data
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Export Options */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
          <div className="relative group">
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={() => exportData('csv')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Export as CSV
              </button>
              <button
                onClick={() => exportData('json')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Export as JSON
              </button>
              <button
                onClick={() => exportData('pdf')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Export as PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && renderFilters()}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold">Total Queries</h3>
          </div>
          <p className="text-3xl font-bold mt-2">{data.total_queries}</p>
          <p className="text-sm text-gray-500 mt-1">
            +{data.daily_stats[data.daily_stats.length - 1].queries} today
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold">Success Rate</h3>
          </div>
          <p className="text-3xl font-bold mt-2">
            {(data.average_confidence * 100).toFixed(1)}%
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 rounded-full h-2"
              style={{ width: `${data.average_confidence * 100}%` }}
            />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold">User Engagement</h3>
          </div>
          <p className="text-3xl font-bold mt-2">
            {data.user_engagement.active_users}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            +{data.user_engagement.new_users} new users today
          </p>
        </div>
      </div>

      {/* Time Series Chart */}
      {renderTimeSeriesChart()}

      {/* Popular Categories */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Popular Categories</h3>
        <div className="space-y-3">
          {Object.entries(data.popular_categories)
            .sort(([, a], [, b]) => b - a)
            .map(([category, count]) => (
              <div key={category} className="flex items-center">
                <div className="flex-1">
                  <div className="h-2.5 bg-gray-200 rounded-full">
                    <div
                      className="h-2.5 bg-blue-600 rounded-full"
                      style={{
                        width: `${(count / data.total_queries) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <span className="ml-4 text-sm text-gray-600">
                  {category} ({count})
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Recent Queries */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Recent Queries</h3>
        <div className="space-y-4">
          {data.query_history.map((query, index) => (
            <div
              key={index}
              className="flex items-center justify-between border-b pb-2"
            >
              <div>
                <p className="text-sm font-medium">{query.query}</p>
                <p className="text-xs text-gray-500">
                  {new Date(query.timestamp).toLocaleString()}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  query.confidence > 0.7
                    ? 'bg-green-100 text-green-800'
                    : query.confidence > 0.4
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {(query.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}