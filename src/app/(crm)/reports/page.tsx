'use client';
// src/app/(crm)/reports/page.tsx

import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { reportsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Avatar, Empty, Skeleton, Spinner } from '@/components/ui';
import { fmtINR, fmtDate, avatarColor } from '@/lib/utils';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
type Tab = 'revenue' | 'team' | 'campaigns' | 'incentives';

export default function ReportsPage() {
  const { isAdmin } = useAuthStore();
  // ✅ Fix 1 — Sales user ke liye 'incentives' se shuru karo
  // const [tab, setTab]     = useState<Tab>(isAdmin() ? 'revenue' : 'incentives');
  const [tab, setTab] = useState<Tab>('revenue');

  const [incStatusFilter, setIncStatusFilter] = useState('');
const [incUserFilter,   setIncUserFilter]   = useState('');
const [actionModal,     setActionModal]     = useState<any | null>(null);
const [actionType,      setActionType]      = useState<'approve' | 'paid' | 'reject' | null>(null);
const [actionNotes,     setActionNotes]     = useState('');
const [actionSaving,    setActionSaving]    = useState(false);
const [selected,        setSelected]        = useState<number[]>([]);
const [bulkSaving,      setBulkSaving]      = useState(false);
  
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ start_date:'', end_date:'', assigned_to:'' });
  const [users, setUsers]     = useState<any[]>([]); // ✅ NEW

  // ✅ Admin ke liye users load karo
  useEffect(() => {
    if (isAdmin()) {
      import('@/lib/api').then(({ authAPI }) => {
        authAPI.getUsers({ role:'sales', is_active:'true' })
          .then((d: any) => setUsers(d?.users || []))
          .catch(() => {});
      });
    }
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      let res: any;
      if      (tab === 'revenue')    res = await reportsAPI.revenue(filters);
      else if (tab === 'team')       res = await reportsAPI.team(filters);
      else if (tab === 'campaigns')  res = await reportsAPI.campaigns();
      // else if (tab === 'incentives') res = await reportsAPI.incentives();
      else if (tab === 'incentives') {
        const p: Record<string, string> = {};
        if (incStatusFilter) p.status  = incStatusFilter;
        if (incUserFilter)   p.user_id = incUserFilter;
        res = await reportsAPI.incentives(p);
      }
      setData(res);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  // useEffect(() => { load(); }, [tab]);
  useEffect(() => { load(); }, [tab, incStatusFilter, incUserFilter]);

  const TABS = [
    { key: 'revenue',    label: 'Revenue',          adminOnly: false },
    { key: 'team',       label: 'Team Performance',  adminOnly: false },
    { key: 'campaigns',  label: 'Campaigns',         adminOnly: false },
    { key: 'incentives', label: 'Incentives',        adminOnly: false },
  ].filter((t) => !t.adminOnly || isAdmin());

  const INC_STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:  { label: 'Pending',  bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  approved: { label: 'Approved', bg: 'bg-blue-50',  text: 'text-blue-700',  dot: 'bg-blue-500'  },
  paid:     { label: 'Paid',     bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-50',   text: 'text-red-600',   dot: 'bg-red-400'   },
};

const openAction = (incentive: any, type: 'approve' | 'paid' | 'reject') => {
  setActionModal(incentive);
  setActionType(type);
  setActionNotes('');
};

const saveAction = async () => {
  if (!actionModal || !actionType) return;
  setActionSaving(true);
  try {
    const statusMap = { approve: 'approved', paid: 'paid', reject: 'rejected' };
    await api.patch(`/reports/incentives/${actionModal.id}/status`, {
      status: statusMap[actionType],
      notes:  actionNotes || undefined,
    });
    toast.success(
      actionType === 'approve' ? 'Incentive approved ✓' :
      actionType === 'paid'    ? 'Marked as paid ✓'     : 'Incentive rejected'
    );
    setActionModal(null);
    setActionType(null);
    load();
  } catch (e: any) { toast.error(e?.message || 'Failed'); }
  finally { setActionSaving(false); }
};

const bulkAction = async (status: 'approved' | 'paid' | 'rejected') => {
  if (!selected.length) { toast.error('Select incentives first'); return; }
  setBulkSaving(true);
  try {
    await api.patch('/reports/incentives/bulk-status', { ids: selected, status });
    toast.success(`${selected.length} incentive${selected.length > 1 ? 's' : ''} updated`);
    setSelected([]);
    load();
  } catch (e: any) { toast.error(e?.message || 'Failed'); }
  finally { setBulkSaving(false); }
};

const toggleSelect    = (id: number) =>
  setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
const toggleSelectAll = () => {
  const allIds = (data?.incentives || []).map((i: any) => i.id);
  setSelected(s => s.length === allIds.length ? [] : allIds);
};

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Reports & Analytics</h1>
          <p className="text-xs text-gray-500 mt-0.5">Performance, revenue, and team insights</p>
        </div>
        <div className="flex gap-2">
          {/* ✅ User filter — sirf admin ke liye */}
          {isAdmin() && (
            <select className="form-select text-xs py-1.5"
              value={filters.assigned_to}
              onChange={(e) => setFilters(f => ({ ...f, assigned_to: e.target.value }))}>
              <option value="">All Users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <input type="date" className="form-input text-xs py-1.5" value={filters.start_date} onChange={(e) => setFilters(f=>({...f,start_date:e.target.value}))} />
          <input type="date" className="form-input text-xs py-1.5" value={filters.end_date}   onChange={(e) => setFilters(f=>({...f,end_date:e.target.value}))} />
          <button className="btn btn-outline btn-sm text-xs" onClick={load}>Apply</button>
          {/* ✅ Fix 2 — Export with user filter */}
          {/* <button className="btn btn-outline btn-sm text-xs" onClick={() => reportsAPI.export({ format: 'excel', ...filters, ...(selectedUser ? { assigned_to: selectedUser } : {}) })}>↓ Excel</button>
          <button className="btn btn-outline btn-sm text-xs" onClick={() => reportsAPI.export({ format: 'csv', ...filters, ...(selectedUser ? { assigned_to: selectedUser } : {}) })}>↓ CSV</button> */}
        <button
  className="btn btn-outline btn-sm text-xs"
  onClick={() => {
    // ✅ Empty values filter karo
    const p: Record<string, string> = { format: 'excel' };
    if (filters.start_date)  p.start_date  = filters.start_date;
    if (filters.end_date)    p.end_date    = filters.end_date;
    if (filters.assigned_to) p.assigned_to = filters.assigned_to;
    reportsAPI.exportCombined(p);
    
  }}
>↓ Excel</button>

<button
  className="btn btn-outline btn-sm text-xs"
  onClick={() => {
    const p: Record<string, string> = { format: 'csv' };
    if (filters.start_date)  p.start_date  = filters.start_date;
    if (filters.end_date)    p.end_date    = filters.end_date;
    if (filters.assigned_to) p.assigned_to = filters.assigned_to;
    reportsAPI.exportCombined(p);
  }}
>↓ CSV</button> 
        </div>
      </div>

      <div className="tab-nav mb-5">
        {TABS.map(({ key, label }) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key as Tab)}>{label}</button>
        ))}
      </div>

      {loading ? <div className="h-64 skeleton rounded-xl" /> : (
        <>
          {/* Revenue tab */}
          {tab === 'revenue' && data && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label:'Total Revenue',  value: fmtINR(data.summary?.total || 0) },
                  { label:'Total Orders',   value: data.summary?.cnt || 0 },
                  { label:'Avg. Order Value', value: fmtINR(data.summary?.cnt ? Math.round(data.summary.total / data.summary.cnt) : 0) },
                ].map((m) => (
                  <div key={m.label} className="card p-4">
                    <div className="text-xs text-gray-500 mb-1">{m.label}</div>
                    <div className="font-display text-2xl font-semibold text-forest-DEFAULT">{m.value}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-forest-DEFAULT">Revenue by Month</span>
                </div>
                <div className="p-4" style={{ height: 280 }}>
                  <Bar
                    data={{
                      labels: (data.data || []).map((m: any) => `${MONTHS[m.mo-1]} ${m.yr}`),
                      datasets: [{
                        label: 'Revenue (₹)',
                        data: (data.data || []).map((m: any) => Number(m.revenue)),
                        backgroundColor: 'rgba(22,43,32,0.12)', borderColor: '#162B20',
                        borderWidth: 2, borderRadius: 6,
                        hoverBackgroundColor: 'rgba(22,43,32,0.22)',
                      }],
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { backgroundColor:'#0D2018', padding:10, cornerRadius:8, displayColors:false, callbacks:{label:(c)=>' '+fmtINR(c.parsed.y)} } },
                      scales: { x:{grid:{display:false},ticks:{font:{size:10},color:'#9ca3af'}}, y:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{size:10},color:'#9ca3af',callback:(v)=>fmtINR(Number(v))}} },
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Team tab */}
          {tab === 'team' && (
            <div className="card">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-forest-DEFAULT">Team Performance</span>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>Agent</th><th>Leads</th><th>New</th><th>In Process</th><th>Follow-up</th><th>CNR</th><th>Dead</th><th>Converted</th><th>Delivered</th><th>Reorder Delivered</th><th>Revenue</th><th>Conv. Rate</th><th>Lost</th></tr>
                  </thead>
                  <tbody>
                    {(data?.performance || []).map((u: any) => (
                      <tr key={u.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.name} size={28} />
                            <div>
                              <div className="text-sm font-semibold">{u.name}</div>
                              <div className="text-xs text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="font-semibold">{u.total_leads}</td>
                        <td>{u.new_cnt || 0}</td>
                        <td>{u.in_process || 0}</td>
                        <td>{u.follow_up || 0}</td>
                        <td>{u.cnr || 0}</td>
                        <td>{u.dead || 0}</td>
                        <td>{u.converted}</td>
                        <td>{u.delivered}</td>
                        <td>{u.reorder_count}</td>
                        <td className="font-bold text-forest-DEFAULT">{fmtINR(u.revenue)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width:`${u.conversion_rate||0}%`, background: avatarColor(u.name) }} />
                            </div>
                            <span className="text-xs text-gray-600">{u.conversion_rate || 0}%</span>
                          </div>
                        </td>
                        <td>{u.cancelled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Campaigns tab */}
          {tab === 'campaigns' && (
            <div className="card">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-forest-DEFAULT">Campaign Performance</span>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>Campaign</th><th>Platform</th><th>Status</th><th>Leads</th><th>Converted</th><th>Revenue</th><th>Conv. Rate</th></tr>
                  </thead>
                  <tbody>
                    {(data?.data || []).length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">No campaign data</td></tr>}
                    {(data?.data || []).map((c: any) => (
                      <tr key={c.id}>
                        <td className="font-medium">{c.name}</td>
                        <td><span className="badge bg-indigo-50 text-indigo-700">{c.platform}</span></td>
                        <td><span className={`badge ${c.status==='active'?'badge-converted':c.status==='paused'?'badge-in_process':'badge-closed_lost'}`}>{c.status}</span></td>
                        <td>{c.total_leads}</td>
                        <td>{c.converted}</td>
                        <td className="font-bold text-forest-DEFAULT">{fmtINR(c.revenue)}</td>
                        <td className={`font-semibold ${Number(c.conversion_rate)>40?'text-green-700':Number(c.conversion_rate)>20?'text-amber-700':'text-red-600'}`}>{c.conversion_rate || 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Incentives tab */}
{tab === 'incentives' && (
  <div>
    {/* Summary cards — click to filter */}
    <div className="grid grid-cols-4 gap-3 mb-4">
      {['pending','approved','paid','rejected'].map((s) => {
        const summaryArr = Array.isArray(data?.summary) ? data.summary : [];
        const item = summaryArr.find((i: any) => i.status === s);
        const cfg  = INC_STATUS[s];
        return (
          <div key={s}
            className={`card p-4 cursor-pointer border-2 transition-all ${incStatusFilter===s?'border-green-700':'border-transparent hover:border-gray-300'}`}
            onClick={() => setIncStatusFilter(incStatusFilter===s ? '' : s)}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-gray-500 font-medium capitalize">{s}</span>
            </div>
            <div className="font-display text-xl font-semibold text-forest-DEFAULT">
              {fmtINR(item?.total || 0)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {item?.cnt || 0} order{Number(item?.cnt||0) !== 1 ? 's' : ''}
            </div>
          </div>
        );
      })}
    </div>

    {/* Filter row */}
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <div className="flex gap-1 flex-wrap">
        <button
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${!incStatusFilter?'border-green-800 bg-green-50 text-green-900':'border-gray-200 text-gray-500 hover:border-gray-300'}`}
          onClick={() => setIncStatusFilter('')}>
          All
        </button>
        {Object.entries(INC_STATUS).map(([k, v]) => (
          <button key={k}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${incStatusFilter===k?'border-green-800 bg-green-50 text-green-900':'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            onClick={() => setIncStatusFilter(incStatusFilter===k ? '' : k)}>
            {v.label}
          </button>
        ))}
      </div>

      {/* User filter — admin only */}
      {isAdmin() && (
        <select className="form-select text-xs py-1.5 max-w-[160px]"
          value={incUserFilter}
          onChange={(e) => setIncUserFilter(e.target.value)}>
          <option value="">All Agents</option>
          {users.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      )}

      {/* Bulk actions */}
      {isAdmin() && selected.length > 0 && (
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">{selected.length} selected</span>
          <button
            className="btn btn-sm text-xs border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
            disabled={bulkSaving} onClick={() => bulkAction('approved')}>
            {bulkSaving ? <Spinner size={12} /> : '✓ Bulk Approve'}
          </button>
          <button
            className="btn btn-sm text-xs border border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
            disabled={bulkSaving} onClick={() => bulkAction('paid')}>
            {bulkSaving ? <Spinner size={12} /> : '💰 Bulk Mark Paid'}
          </button>
        </div>
      )}
    </div>

    {/* Table */}
    <div className="card">
      <div className="px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-forest-DEFAULT">Incentive Ledger</span>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {isAdmin() && (
                <th className="w-8">
                  <input type="checkbox"
                    checked={selected.length > 0 && selected.length === (data?.incentives||[]).length}
                    onChange={toggleSelectAll} className="rounded cursor-pointer" />
                </th>
              )}
              <th>Agent</th><th>Lead</th><th>Product</th>
              <th>Order Amt</th><th>Rate</th><th>Incentive</th>
              <th>Status</th><th>Date</th>
              {isAdmin() && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {!(data?.incentives?.length) && (
              <tr>
                <td colSpan={isAdmin() ? 10 : 8} className="py-10 text-center">
                  <div className="text-2xl mb-2">💰</div>
                  <p className="text-sm text-gray-500">No incentives found</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Incentives are created automatically when orders are delivered
                  </p>
                </td>
              </tr>
            )}
            {(data?.incentives || []).map((inc: any) => {
              const cfg = INC_STATUS[inc.status] || INC_STATUS.pending;
              return (
                <tr key={inc.id} className={selected.includes(inc.id) ? 'bg-blue-50/40' : ''}>
                  {isAdmin() && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox"
                        checked={selected.includes(inc.id)}
                        onChange={() => toggleSelect(inc.id)}
                        className="rounded cursor-pointer" />
                    </td>
                  )}
                  <td className="font-medium">{inc.user_name}</td>
                  <td className="text-xs text-gray-600">{inc.lead_name || '—'}</td>
                  <td className="text-xs text-gray-600 max-w-[100px] truncate">{inc.product_name || '—'}</td>
                  <td>{fmtINR(inc.order_amount)}</td>
                  <td>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {inc.rate}%
                    </span>
                  </td>
                  <td className="font-bold text-forest-DEFAULT">{fmtINR(inc.incentive_amount)}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500">
                    {fmtDate(inc.created_at)}
                    {inc.paid_at && (
                      <div className="text-[10px] text-green-600 mt-0.5">
                        Paid: {fmtDate(inc.paid_at)}
                      </div>
                    )}
                  </td>
                  {isAdmin() && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 flex-wrap">
                        {inc.status === 'pending' && (
                          <button
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors whitespace-nowrap"
                            onClick={() => openAction(inc, 'approve')}>
                            ✓ Approve
                          </button>
                        )}
                        {inc.status === 'approved' && (
                          <button
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors whitespace-nowrap"
                            onClick={() => openAction(inc, 'paid')}>
                            💰 Mark Paid
                          </button>
                        )}
                        {['pending','approved'].includes(inc.status) && (
                          <button
                            className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                            onClick={() => openAction(inc, 'reject')}>
                            ✕
                          </button>
                        )}
                        {inc.status === 'paid' && (
                          <span className="text-[10px] text-green-600 font-medium">✓ Done</span>
                        )}
                        {inc.status === 'rejected' && (
                          <button
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                            onClick={() => openAction(inc, 'approve')}>
                            ↩ Re-approve
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(data?.incentives || []).length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-between">
          <span className="text-xs text-gray-500">
            {(data.incentives as any[]).length} incentives
          </span>
          <span className="text-xs font-bold text-forest-DEFAULT">
            Total: {fmtINR((data.incentives as any[]).reduce((s: number, i: any) => s + Number(i.incentive_amount), 0))}
          </span>
        </div>
      )}
    </div>
  </div>
)}
        </>
      )}

      {/* Action Modal — Approve / Mark Paid / Reject */}
{actionModal && actionType && (
  <Modal
    open
    onClose={() => { setActionModal(null); setActionType(null); }}
    title={
      actionType === 'approve' ? '✓ Approve Incentive' :
      actionType === 'paid'    ? '💰 Mark as Paid'     :
                                 '✕ Reject Incentive'
    }
    size="sm"
    footer={
      <>
        <button className="btn btn-outline"
          onClick={() => { setActionModal(null); setActionType(null); }}
          disabled={actionSaving}>Cancel</button>
        <button
          className={`btn ${actionType === 'approve' ? 'bg-blue-600 hover:bg-blue-700 text-white' : actionType === 'paid' ? 'btn-primary' : 'btn-danger'}`}
          onClick={saveAction} disabled={actionSaving}>
          {actionSaving ? <Spinner size={14} /> :
            actionType === 'approve' ? 'Approve' :
            actionType === 'paid'    ? 'Mark as Paid' : 'Reject'}
        </button>
      </>
    }
  >
    <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Agent</span>
        <span className="font-semibold">{actionModal.user_name}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Order Amount</span>
        <span className="font-semibold">{fmtINR(actionModal.order_amount)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Rate</span>
        <span className="font-semibold">{actionModal.rate}%</span>
      </div>
      <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5 mt-1">
        <span className="text-gray-600 font-medium">Incentive Amount</span>
        <span className="font-bold text-forest-DEFAULT text-base">{fmtINR(actionModal.incentive_amount)}</span>
      </div>
    </div>
    {actionType === 'paid' && (
      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3 text-xs text-green-700">
        ✓ Payment date will be recorded as today automatically
      </div>
    )}
    {actionType === 'reject' && (
      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 text-xs text-red-700">
        ⚠ Please provide a reason for rejection
      </div>
    )}
    <div>
      <label className="form-label">Notes</label>
      <textarea className="form-textarea" rows={2}
        value={actionNotes}
        onChange={(e) => setActionNotes(e.target.value)}
        placeholder={
          actionType === 'approve' ? 'Optional notes…' :
          actionType === 'paid'    ? 'UPI ID, bank reference…' :
                                     'Reason for rejection…'
        }
      />
    </div>
  </Modal>
)}
    </div>
  );
}
