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
  const [tab, setTab]     = useState<Tab>(isAdmin() ? 'revenue' : 'incentives');
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
      else if (tab === 'incentives') res = await reportsAPI.incentives();
      setData(res);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);

  const TABS = [
    { key: 'revenue',    label: 'Revenue',          adminOnly: false },
    { key: 'team',       label: 'Team Performance',  adminOnly: false },
    { key: 'campaigns',  label: 'Campaigns',         adminOnly: false },
    { key: 'incentives', label: 'Incentives',        adminOnly: false },
  ].filter((t) => !t.adminOnly || isAdmin());

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
  onClick={() =>
    reportsAPI.export({
      format: 'excel',
      ...filters
    })
  }
>
  ↓ Excel
</button>

<button
  className="btn btn-outline btn-sm text-xs"
  onClick={() =>
    reportsAPI.export({
      format: 'csv',
      ...filters
    })
  }
>
  ↓ CSV
</button>
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
                    <tr><th>Agent</th><th>Leads</th><th>New</th><th>In Process</th><th>Follow-up</th><th>CNR</th><th>Dead</th><th>Converted</th><th>Delivered</th><th>Revenue</th><th>Conv. Rate</th><th>Lost</th></tr>
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
                        <td className="font-bold text-forest-DEFAULT">{fmtINR(u.revenue)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width:`${u.conversion_rate||0}%`, background: avatarColor(u.name) }} />
                            </div>
                            <span className="text-xs text-gray-600">{u.conversion_rate || 0}%</span>
                          </div>
                        </td>
                        <td>{u.closed_lost}</td>
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
              <div className="grid grid-cols-3 gap-3 mb-5">
                {['pending','approved','paid'].map((s) => {
                  // const item = (data?.summary || []).find((i:any) => i.status === s);
                  const summaryArr = Array.isArray(data?.summary) ? data.summary : [];
                  const item = summaryArr.find((i:any) => i.status === s);
                  return (
                    <div key={s} className="card p-4">
                      <div className="text-xs text-gray-500 capitalize mb-1">{s} Incentives</div>
                      <div className="font-display text-2xl font-semibold text-forest-DEFAULT">{fmtINR(item?.total || 0)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item?.cnt || 0} orders</div>
                    </div>
                  );
                })}
              </div>
              <div className="card">
                <div className="px-4 py-3 border-b border-gray-100"><span className="text-sm font-semibold text-forest-DEFAULT">Incentive Ledger</span></div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Agent</th><th>Lead</th><th>Product</th><th>Order Amt</th><th>Rate</th><th>Incentive</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {(data?.incentives || []).map((i: any) => (
                        <tr key={i.id}>
                          <td className="font-medium">{i.user_name}</td>
                          <td className="text-xs text-gray-600">{i.lead_name}</td>
                          <td className="text-xs text-gray-600 max-w-[100px] truncate">{i.product_name}</td>
                          <td>{fmtINR(i.order_amount)}</td>
                          <td>{i.rate}%</td>
                          <td className="font-bold text-forest-DEFAULT">{fmtINR(i.incentive_amount)}</td>
                          <td><span className={`badge ${i.status==='paid'?'badge-converted':i.status==='approved'?'badge-new':'badge-in_process'}`}>{i.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
