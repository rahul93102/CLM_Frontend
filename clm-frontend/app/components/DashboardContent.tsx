'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { ApiClient } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';

// Type definitions
interface Statistics {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  executed: number;
  monthly_trends?: Array<{
    month: string;
    approved: number;
    rejected: number;
  }>;
}

interface Contract {
  id: string;
  title: string;
  contract_title?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface Clause {
  id: string;
  title: string;
  content: string;
  category?: string;
}

interface GenerationJob {
  id: string;
  status: string;
  created_at: string;
  contract_title?: string;
  progress?: number;
}

interface DashboardProps {
  onLogout: () => void;
}

const DashboardContent: React.FC<DashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [recentContracts, setRecentContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const client = new ApiClient();
      // Fetch all data in parallel
      const [contractsResponse, templatesResponse] = await Promise.all([
        client.getContracts().catch(() => ({ data: [] })),
        client.getTemplates().catch(() => ({ data: [] })),
      ]);

      setRecentContracts(contractsResponse?.data || []);
      setTemplates(templatesResponse?.data || []);
      setClauses([]);
      setJobs([]);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to get status pill styling
  const getStatusStyles = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    
    if (normalizedStatus.includes('approved') || normalizedStatus.includes('completed') || normalizedStatus.includes('success')) {
      return 'bg-green-100 text-green-700';
    } else if (normalizedStatus.includes('draft')) {
      return 'bg-yellow-100 text-yellow-700';
    } else if (normalizedStatus.includes('pending') || normalizedStatus.includes('processing')) {
      return 'bg-blue-100 text-blue-700';
    } else if (normalizedStatus.includes('rejected') || normalizedStatus.includes('failed')) {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-[#F2F0EB] min-h-screen font-sans">
      <Sidebar onLogout={onLogout} />
      
      <main className="ml-[90px] p-8 transition-all duration-300">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-[#2D3748]">Dashboard Overview</h1>
            <p className="text-gray-500 mt-1">
              Welcome back, {user?.full_name || user?.email || 'User'}! Here&apos;s your contract status.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <svg className="animate-spin h-5 w-5 mr-2 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Syncing Data...
              </div>
            )}
            
            <button 
              onClick={fetchAllData}
              className="p-3 rounded-full hover:bg-white/50 transition"
              title="Refresh data"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <button className="p-3 rounded-full hover:bg-white/50 transition">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            <button className="relative p-3 rounded-full hover:bg-white/50 transition">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {jobs.filter(j => j.status === 'processing').length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
            
            <button className="bg-[#0F141F] text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Contract
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 flex items-center justify-between">
            <p className="font-medium">Error: {error}</p>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Hero Card */}
          <div className="lg:col-span-2 rounded-[24px] p-8 text-white shadow-2xl relative overflow-hidden" 
               style={{ background: 'linear-gradient(135deg, #FF7E5F 0%, #FEB47B 100%)' }}>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="opacity-90 text-lg font-medium">Total Contracts</h3>
                <button className="text-white/80 hover:text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
              <div className="text-6xl font-bold mt-4 mb-6">
                {stats?.total.toLocaleString() || '0'}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>
                    {stats?.total && stats.total > 0 
                      ? `${Math.round((stats.approved / stats.total) * 100)}%` 
                      : '0%'}
                  </span>
                </div>
                <span className="text-white/80 text-sm">completion rate</span>
              </div>
              
              <svg className="absolute bottom-0 left-0 right-0 opacity-20" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25"></path>
                <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5"></path>
                <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
              </svg>
            </div>
          </div>

          {/* Draft Card */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-gray-500 text-sm font-medium">Drafts</h3>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold text-[#0F141F] mb-4">{stats?.draft || 0}</div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>In Progress</span>
                <span>{stats?.draft || 0} contracts</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all" 
                  style={{ width: `${stats && stats.total > 0 ? Math.min((stats.draft / stats.total) * 100, 100) : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Approved Card */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-gray-500 text-sm font-medium">Approved</h3>
              <div className="p-2 bg-green-50 rounded-lg">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold text-[#0F141F] mb-2">{stats?.approved || 0}</div>
            <div className="text-sm text-green-500 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Ready for execution
            </div>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-[20px] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm mb-2">Pending Review</h3>
                <div className="text-3xl font-bold text-[#0F141F]">{stats?.pending || 0}</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm mb-2">Rejected</h3>
                <div className="text-3xl font-bold text-[#0F141F]">{stats?.rejected || 0}</div>
              </div>
              <div className="p-4 bg-red-50 rounded-2xl">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm mb-2">Templates</h3>
                <div className="text-3xl font-bold text-[#0F141F]">{templates.length}</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-2xl">
                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[20px] p-6 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white/80 text-sm mb-2">Active Jobs</h3>
                <div className="text-3xl font-bold">{jobs.length}</div>
              </div>
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Recent Contracts - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-[#2D3748]">Recent Contracts</h3>
              <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
                View All
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {recentContracts.slice(0, 5).map((contract, index) => (
                <div 
                  key={contract.id || index} 
                  className="bg-white p-5 rounded-[20px] flex items-center justify-between shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-[#2D3748] text-base group-hover:text-indigo-600 transition-colors">
                        {contract.title || contract.contract_title || `Contract #${index + 1}`}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Updated {new Date(contract.updated_at || contract.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className={`px-4 py-2 rounded-full text-xs font-bold ${getStatusStyles(contract.status)}`}>
                      {contract.status || "Pending"}
                    </span>
                    
                    <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              
              {recentContracts.length === 0 && !loading && (
                <div className="bg-white rounded-[20px] p-12 text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-gray-500 font-medium">No contracts yet</h3>
                  <p className="text-gray-400 text-sm mt-2">Get started by creating your first contract</p>
                </div>
              )}
            </div>
          </div>

          {/* System Activity (Generation Jobs) */}
          <div className="lg:col-span-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-[#2D3748]">System Activity</h3>
            </div>
            
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              <div className="space-y-4">
                {jobs.slice(0, 5).map((job, index) => (
                  <div key={job.id || index} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className={`p-2 rounded-lg ${
                      job.status === 'completed' || job.status === 'success' ? 'bg-green-50' :
                      job.status === 'processing' ? 'bg-blue-50' :
                      job.status === 'failed' ? 'bg-red-50' :
                      'bg-gray-50'
                    }`}>
                      <svg className={`w-4 h-4 ${
                        job.status === 'completed' || job.status === 'success' ? 'text-green-500' :
                        job.status === 'processing' ? 'text-blue-500 animate-spin' :
                        job.status === 'failed' ? 'text-red-500' :
                        'text-gray-500'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {job.status === 'processing' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        )}
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {job.contract_title || 'Contract Generation'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(job.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {job.progress !== undefined && job.status === 'processing' && (
                        <div className="mt-2">
                          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all rounded-full" 
                              style={{ width: `${job.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusStyles(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                ))}
                
                {jobs.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="text-sm text-gray-500">No active jobs</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Templates & Clauses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Templates */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-[#2D3748]">Contract Templates</h3>
              <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                + Add Template
              </button>
            </div>
            
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              {templates.length > 0 ? (
                <div className="space-y-3">
                  {templates.slice(0, 4).map((template, index) => (
                    <div key={template.id || index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{template.name}</p>
                          {template.description && (
                            <p className="text-xs text-gray-500 truncate max-w-md">{template.description}</p>
                          )}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-gray-500 mb-3">No templates available</p>
                  <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    Create your first template
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Clauses */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-[#2D3748]">Standard Clauses</h3>
              <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                + Add Clause
              </button>
            </div>
            
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              {clauses.length > 0 ? (
                <div className="space-y-3">
                  {clauses.slice(0, 4).map((clause, index) => (
                    <div key={clause.id || index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{clause.title}</p>
                          {clause.category && (
                            <p className="text-xs text-gray-500">{clause.category}</p>
                          )}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-gray-500 mb-3">No clauses available</p>
                  <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    Add your first clause
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardContent;
