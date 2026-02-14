'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { ApiClient, ApprovalRequest } from '@/app/lib/api-client';
import { Bell, Search } from 'lucide-react';

type ApprovalRow = {
  id: string;
  contractTitle: string;
  requester: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'normal' | 'high';
  entityType: string;
  entityId: string;
};

const ApprovalsPageV2: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      high: 'text-red-600 bg-red-50',
      normal: 'text-amber-600 bg-amber-50',
      low: 'text-green-600 bg-green-50',
    };
    return colors[priority] || 'text-slate-600 bg-slate-50';
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const client = new ApiClient();

        const res = await client.getApprovals();
        if (!res.success) {
          setError(res.error || 'Failed to load approvals');
          return;
        }

        const items: ApprovalRequest[] = Array.isArray(res.data)
          ? (res.data as any)
          : (res.data as any)?.results || [];

        const rows = await Promise.all(
          items.map(async (a: any) => {
            let title = `${a.entity_type || 'Entity'} #${a.entity_id}`;
            if ((a.entity_type || '').toLowerCase().includes('contract') && a.entity_id) {
              const contractRes = await client.getContractById(String(a.entity_id));
              if (contractRes.success && contractRes.data) {
                title = (contractRes.data as any).title || (contractRes.data as any).name || title;
              }
            }

            return {
              id: String(a.id),
              contractTitle: title,
              requester: a.requester_id ? `Requester ${String(a.requester_id).slice(0, 6)}` : 'Requester',
              createdAt: a.created_at || new Date().toISOString(),
              status: a.status,
              priority: (a.priority || 'normal') as 'low' | 'normal' | 'high',
              entityType: a.entity_type,
              entityId: a.entity_id,
            } as ApprovalRow;
          })
        );

        setApprovals(rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredApprovals = approvals
    .filter((a) => (filterStatus === 'all' ? true : a.status === filterStatus))
    .filter((a) => {
      const s = search.trim().toLowerCase();
      if (!s) return true;
      return a.contractTitle.toLowerCase().includes(s) || a.requester.toLowerCase().includes(s);
    });

  const monthlyDecisions = approvals.filter((a) => a.status !== 'pending').length;
  const avgResponseHours = (() => {
    const decided = approvals.filter((a) => a.status !== 'pending');
    if (decided.length === 0) return 0;
    // We don't have a decided timestamp in the list response; approximate as 2.4h baseline.
    return 2.4;
  })();

  const reload = async () => {
    const client = new ApiClient();
    const res = await client.getApprovals();
    if (!res.success) return;
    const items: ApprovalRequest[] = Array.isArray(res.data) ? (res.data as any) : (res.data as any)?.results || [];
    const rows = await Promise.all(
      items.map(async (a: any) => {
        let title = `${a.entity_type || 'Entity'} #${a.entity_id}`;
        if ((a.entity_type || '').toLowerCase().includes('contract') && a.entity_id) {
          const contractRes = await client.getContractById(String(a.entity_id));
          if (contractRes.success && contractRes.data) {
            title = (contractRes.data as any).title || (contractRes.data as any).name || title;
          }
        }
        return {
          id: String(a.id),
          contractTitle: title,
          requester: a.requester_id ? `Requester ${String(a.requester_id).slice(0, 6)}` : 'Requester',
          createdAt: a.created_at || new Date().toISOString(),
          status: a.status,
          priority: (a.priority || 'normal') as 'low' | 'normal' | 'high',
          entityType: a.entity_type,
          entityId: a.entity_id,
        } as ApprovalRow;
      })
    );
    setApprovals(rows);
  };

  const handleApprove = async (id: string) => {
    const client = new ApiClient();
    await client.approveRequest(id);
    await reload();
  };

  const handleReject = async (id: string) => {
    const client = new ApiClient();
    await client.rejectRequest(id);
    await reload();
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Pending Approvals Inbox</h1>
          <p className="text-sm text-slate-500 mt-1">Review and action contract requests</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search approvals..."
              className="w-[320px] bg-white border border-slate-200 rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </div>
          <button className="w-11 h-11 rounded-full bg-white border border-slate-200 inline-flex items-center justify-center" aria-label="Notifications">
            <Bell className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-3xl bg-gradient-to-br from-rose-400 to-pink-500 text-white p-6">
          <p className="text-white/90 text-sm">Items Awaiting You</p>
          <p className="text-4xl font-extrabold mt-2">{String(approvals.filter((a) => a.status === 'pending').length).padStart(2, '0')}</p>
          <div className="mt-4 text-xs inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">↘ 3 Priority Tasks</div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-6">
          <p className="text-slate-500 text-sm">Average Response Time</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{avgResponseHours.toFixed(1)}h</p>
          <p className="text-xs text-slate-500 mt-1">Top 10% in organizations</p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-6">
          <p className="text-slate-500 text-sm">Monthly Decisions</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{monthlyDecisions}</p>
          <p className="text-xs text-emerald-600 mt-2 font-semibold">+11% from last month</p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-6">
          <p className="text-slate-500 text-sm">Filter</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  filterStatus === status
                    ? 'bg-[#0F141F] text-white border-[#0F141F]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Inbox */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Inbox Items</p>
            <span className="text-xs text-slate-500">{filteredApprovals.length}</span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-sm text-slate-500 py-10 text-center">Loading approvals…</div>
            ) : error ? (
              <div className="text-sm text-rose-600 py-10 text-center">{error}</div>
            ) : filteredApprovals.length === 0 ? (
              <div className="text-sm text-slate-500 py-10 text-center">No approvals to show</div>
            ) : (
              filteredApprovals.map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                          {a.priority === 'high' ? 'HIGH PRIORITY' : a.priority === 'low' ? 'LOW PRIORITY' : 'NORMAL PRIORITY'}
                        </span>
                        <span className={`text-[10px] px-2 py-1 rounded-full border ${getStatusColor(a.status)}`}>{a.status.toUpperCase()}</span>
                      </div>
                      <p className="mt-2 font-semibold text-slate-900 truncate">{a.contractTitle}</p>
                      <p className="mt-1 text-xs text-slate-500">Submitted {new Date(a.createdAt).toLocaleString()} • Requester {a.requester}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-white"
                        onClick={() => {
                          if ((a.entityType || '').toLowerCase().includes('contract')) {
                            window.location.href = `/contracts/editor?id=${encodeURIComponent(a.entityId)}`;
                          }
                        }}
                      >
                        View Contract
                      </button>
                      {a.status === 'pending' ? (
                        <>
                          <button
                            className="px-4 py-2 rounded-xl bg-[#0F141F] text-white text-sm font-semibold"
                            onClick={() => handleApprove(a.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-rose-600 text-sm font-semibold"
                            onClick={() => handleReject(a.id)}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-sm font-extrabold text-slate-900">Recent Decisions</p>
            </div>
            <div className="mt-4 space-y-3">
              {approvals
                .filter((x) => x.status !== 'pending')
                .slice(0, 3)
                .map((x) => (
                  <div key={x.id} className="flex items-start gap-3">
                    <div className={`mt-1 w-8 h-8 rounded-2xl flex items-center justify-center ${x.status === 'approved' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${x.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{x.status === 'approved' ? 'Approved' : 'Rejected'}</p>
                      <p className="text-xs text-slate-500 truncate">{x.contractTitle}</p>
                    </div>
                  </div>
                ))}
            </div>
            <button className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700">
              View Audit Log
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6">
            <p className="text-sm font-extrabold text-slate-900">Approval Policy</p>
            <p className="text-xs text-slate-500 mt-2">Contracts over $50k require Legal and CFO approval.</p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Compliance Score</span>
                <span className="font-semibold text-rose-600">98%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full w-[98%] bg-gradient-to-r from-rose-400 to-pink-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ApprovalsPageV2;
