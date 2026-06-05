'use client';
// src/app/(crm)/dashboard/page.tsx

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { dashAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { StatCard, Avatar, Skeleton, StatusBadge } from '@/components/ui';
import { fmtINR, fmtCurrency, fmtDateTime, avatarColor } from '@/lib/utils';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function DashboardPage() {
  const { user, isAdmin } = useAuthStore();
  const router = useRouter();
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fn = isAdmin() ? dashAPI.admin : dashAPI.user;
    fn().then((d: any) => setData(d))
       .catch(() => toast.error('Failed to load dashboard'))
       .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashSkeleton />;

  const cards = data?.cards || {};
  const fuCounts = data?.followUpCounts || {};
  const overdue  = fuCounts.overdue || 0;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 16 ? 'Afternoon' : new Date().getHours() < 19 ? 'Evening' : 'Night'
  }, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin() && (
            <button className="btn btn-outline text-xs" onClick={() => router.push('/reports')}>
              View Reports
            </button>
          )}
          <button className="btn btn-amber text-xs" onClick={() => router.push('/leads?action=new')}>
            + New Lead
          </button>
        </div>
      </div>

      {/* Alerts */}
      {overdue > 0 && (
        <div className="alert alert-red cursor-pointer mb-4" onClick={() => router.push('/follow-ups?tab=overdue')}>
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          <strong>{overdue} overdue follow-up{overdue > 1 ? 's' : ''}</strong> — action required now →
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Leads"    value={cards.total || 0}       icon="👥" color="green"  trend={12} onClick={() => router.push('/leads')} />
        <StatCard label="Revenue"        value={fmtCurrency(cards.total_revenue)} icon="💰" color="amber"  trend={22} onClick={() => router.push('/reports')} />
        <StatCard label="Delivered"      value={cards.delivered || 0}   icon="✅" color="green"  trend={8}  onClick={() => router.push('/leads?status=delivered')} />
        <StatCard label="Repeat Orders"  value={cards.repeat_orders || 0} icon="🔄" color="amber" trend={31} onClick={() => router.push('/customers')} />
        <StatCard label="In Process"     value={cards.in_process || 0}  icon="⚙️" color="blue"   trend={5}  onClick={() => router.push('/leads?status=in_process')} />
        <StatCard label="Follow-ups"     value={cards.follow_up || 0}   icon="📅" color="purple" sub={overdue > 0 ? `${overdue} overdue` : undefined} onClick={() => router.push('/follow-ups')} />
        <StatCard label="Converted"      value={cards.converted || 0}   icon="🎯" color="green"  trend={18} onClick={() => router.push('/leads?status=converted')} />
        <StatCard label="Customers"      value={cards?.customers || 0}   icon="🤝" color="green"  onClick={() => router.push('/customers')} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Revenue line chart */}
        <div className="card col-span-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-forest-DEFAULT">Monthly Revenue</span>
            <span className="text-xs text-gray-400">Last 12 months</span>
          </div>
          <div className="p-4" style={{ height: 220 }}>
            <Line
              data={{
                labels: (data?.monthlyRevenue || []).map((m: any) => `${MONTHS[m.mo-1]} ${m.yr}`),
                datasets: [{
                  label: 'Revenue',
                  data: (data?.monthlyRevenue || []).map((m: any) => Number(m.revenue)),
                  borderColor: '#162B20',
                  backgroundColor: 'rgba(22,43,32,0.05)',
                  borderWidth: 2.5,
                  fill: true,
                  tension: 0.45,
                  pointBackgroundColor: '#f59e0b',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                  pointRadius: 4,
                  pointHoverRadius: 7,
                }],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#0D2018', padding: 10, cornerRadius: 8,
                    displayColors: false,
                    callbacks: { label: (c) => ' ' + fmtINR(c.parsed.y) },
                  },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9ca3af' } },
                  y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: {
                    font: { size: 10 }, color: '#9ca3af',
                    callback: (v) => fmtCurrency(Number(v)),
                  }},
                },
              }}
            />
          </div>
        </div>

        {/* Status donut */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-forest-DEFAULT">Lead Status</span>
          </div>
          <div className="p-4" style={{ height: 220 }}>
            <Doughnut
              data={{
                labels: ['New','In Process','Follow-up','Converted','Delivered','Lost'],
                datasets: [{
                  data: [cards.new||0, cards.in_process||0, cards.follow_up||0, cards.converted||0, cards.delivered||0, cards.closed_lost||0],
                  backgroundColor: ['#3b82f6','#f59e0b','#8b5cf6','#22c55e','#10b981','#ef4444'],
                  borderWidth: 2.5, borderColor: '#fff',
                }],
              }}
              options={{
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                  legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 8, padding: 6, usePointStyle: true } },
                  tooltip: { backgroundColor: '#0D2018', padding: 9, cornerRadius: 8 },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Team performance — admin only */}
      {isAdmin() && data?.userPerformance?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-forest-DEFAULT">Team Performance</span>
            <button className="btn btn-ghost btn-sm text-xs" onClick={() => router.push('/reports')}>Full report →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th><th>Leads</th><th>Conv. Rate</th><th>Revenue</th><th>Delivered</th>
                </tr>
              </thead>
              <tbody>
                {data.userPerformance.map((u: any, i: number) => (
                  <tr key={u.id} className="hover:bg-gray-50 cursor-default">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size={28} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-semibold">{u.total_leads}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${u.conversionRate}%`, background: avatarColor(u.name) }} />
                        </div>
                        <span className="text-xs text-gray-600">{u.conversionRate}%</span>
                      </div>
                    </td>
                    <td className="font-bold text-forest-DEFAULT">{fmtINR(u.revenue)}</td>
                    <td className="font-medium">{u.delivered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales user — incentive summary */}
      {!isAdmin() && data?.incentiveSummary && (
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-forest-DEFAULT">My Incentives</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[
              { label: 'Pending',  key: 'pending',  color: 'text-amber-700' },
              { label: 'Approved', key: 'approved', color: 'text-blue-700' },
              { label: 'Paid',     key: 'paid',     color: 'text-green-700' },
            ].map(({ label, key, color }) => (
              <div key={key} className="p-4 text-center">
                <div className={`font-display text-xl font-semibold ${color}`}>{fmtINR(data.incentiveSummary[key] || 0)}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DashSkeleton() {
  return (
    <div>
      <Skeleton className="h-7 w-64 mb-2" />
      <Skeleton className="h-4 w-40 mb-5" />
      <div className="grid grid-cols-4 gap-3 mb-5">
        {Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-64 rounded-xl col-span-2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
