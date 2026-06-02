'use client';
// src/app/(crm)/leads/page.tsx

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// import { leadsAPI, authAPI } from '@/lib/api';
import { leadsAPI, authAPI, reportsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { StatusBadge, SourceBadge, Avatar, Pagination, Empty, Skeleton, SearchInput } from '@/components/ui';
import NewLeadModal from '@/components/leads/NewLeadModal';
import StatusModal  from '@/components/leads/StatusModal';
import { fmtINR, fmtDate, STATUS_CONFIG, SOURCE_CONFIG, ALL_STATUSES, SOURCES, avatarColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Lead, LeadStatus, LeadSource } from '@/types';

// ── Date shortcut helpers ────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};
const startOfMonth = () => {
  const d = new Date(); d.setDate(1);
  return d.toISOString().split('T')[0];
};
const DATE_SHORTCUTS = [
  { label: 'Today',       start: today(),        end: today() },
  { label: 'Yesterday',   start: daysAgo(1),     end: daysAgo(1) },
  { label: 'Last 7 days', start: daysAgo(7),     end: today() },
  { label: 'This Month',  start: startOfMonth(), end: today() },
];

// Leads page mein sirf yahi statuses dikhenge filter chips mein
// delivered aur cancelled pipeline se aayenge — directly select nahi hoga
const LEADS_PAGE_STATUSES: LeadStatus[] = [
  'new',
  'in_process',
  'follow_up',
  'cnr',
  'converted',
  'dead',
];

// ── Remark Cell — inline auto-save input ─────────────────────────
function RemarkCell({ lead, onSaved }: { lead: Lead; onSaved: (id: number, val: string) => void }) {
  const [value,  setValue]  = useState(lead.remark || '');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setValue(lead.remark || ''); }, [lead.remark]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await leadsAPI.update(lead.id, { remark: v });
        onSaved(lead.id, v);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      } catch { toast.error('Remark save failed'); }
      finally  { setSaving(false); }
    }, 800);
  };

  return (
    <div className="relative flex items-center min-w-[150px]" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Add remark…"
        className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 bg-white
                   focus:outline-none focus:border-forest-DEFAULT focus:ring-1
                   focus:ring-forest-DEFAULT/20 placeholder:text-gray-300 transition-all pr-6"
      />
      {saving && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3
                         border-2 border-forest-DEFAULT border-t-transparent
                         rounded-full animate-spin" />
      )}
      {!saving && saved && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-forest-DEFAULT text-[11px] font-bold">✓</span>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function LeadsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin }  = useAuthStore();

  const [leads,         setLeads]         = useState<Lead[]>([]);
  const [total,         setTotal]         = useState(0);
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState(searchParams.get('search') || '');
  const [status,        setStatus]        = useState<string>(searchParams.get('status') || '');
  const [source,        setSource]        = useState<string>('');
  const [category,      setCategory]      = useState<string>('');
  const [assignedTo,    setAssignedTo]    = useState<string>('');
  const [startDate,     setStartDate]     = useState<string>('');
  const [endDate,       setEndDate]       = useState<string>('');
  const [users,         setUsers]         = useState<any[]>([]);
  const [campaigns,     setCampaigns]     = useState<any[]>([]);
  const [campaignId,    setCampaignId]    = useState<string>('');
  const [selected,      setSelected]      = useState<Set<number>>(new Set());
  const [exporting,     setExporting]     = useState(false);

  // ── Show Delivered toggle — default: OFF ──────────────────────
  const [showDelivered, setShowDelivered] = useState(false);

  const [showNew,    setShowNew]    = useState(searchParams.get('action') === 'new');
  const [statusLead, setStatusLead] = useState<Lead | null>(null);

  const LIMIT = 25;

  useEffect(() => {
    if (isAdmin()) {
      authAPI.getUsers({ role: 'sales', is_active: 'true' })
        .then((d: any) => setUsers(d?.users || []))
        .catch(() => {});
    }
        // Campaigns load karo — admin + sales dono ke liye
      reportsAPI.campaignsList()
        .then((d: any) => setCampaigns(d?.campaigns || []))
        .catch(() => {});

  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params: Record<string, unknown> = { page, limit: LIMIT };
      if (search)     params.search      = search;
      if (source)     params.source      = source;
      if (category)   params.category    = category;
      if (assignedTo) params.assigned_to = assignedTo;
      if (campaignId) params.campaign_id  = campaignId;
      if (startDate)  params.start_date  = startDate;
      if (endDate)    params.end_date    = endDate;

      // Status logic:
      // - Koi status chip select kiya → wahi bhejo
      // - showDelivered ON hai aur koi chip select nahi → delivered bhejo
      // - Default → delivered ko exclude karo (backend ko batao)
      if (status) {
        params.status = status;
      } else if (showDelivered) {
        params.status = 'delivered';
      } else {
        // Delivered aur cancelled hide karo by default
        // Backend ko exclude_statuses parameter bhejo
        params.exclude_statuses = 'delivered,cancelled';
      }

      const res: any = await leadsAPI.list(params);
      setLeads(res?.leads || []);
      setTotal(res?.total || 0);
    } catch { toast.error('Failed to load leads'); }
    finally  { setLoading(false); }
  }, [page, search, status, source, category, assignedTo, campaignId, startDate, endDate, showDelivered]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Toggle karne par status chip reset karo
  const handleDeliveredToggle = () => {
    setShowDelivered(prev => !prev);
    setStatus('');
    setPage(1);
  };

  const handleRemarkSaved = (id: number, val: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, remark: val } : l));
  };

  const applyShortcut = (start: string, end: string) => {
    setStartDate(start); setEndDate(end); setPage(1);
  };

  const clearFilters = () => {
    setStatus(''); setSource(''); setCategory('');
    setAssignedTo(''); setCampaignId(''); setStartDate(''); setEndDate('');
    setSearch(''); setShowDelivered(false); setPage(1);
  };
  

  const toggleSelect = (id: number) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };
  const toggleAll = () => {
    selected.size === leads.length ? setSelected(new Set()) : setSelected(new Set(leads.map(l => l.id)));
  };

  const bulkExport = async (format: 'excel' | 'csv') => {
    if (selected.size === 0) { toast.error('Koi lead select nahi kiya!'); return; }
    setExporting(true);
    try {
      const params: Record<string, string> = { format };
      if (startDate)  params.start_date  = startDate;
      if (endDate)    params.end_date    = endDate;
      if (status)     params.status      = status;
      if (assignedTo) params.assigned_to = assignedTo;
      params.ids = Array.from(selected).join(',');

      const token    = localStorage.getItem('access_token');
      const qs       = new URLSearchParams(params).toString();
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res      = await fetch(`${BASE_URL}/reports/export?${qs}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `leads-${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${selected.size} leads exported!`);
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const pages      = Math.ceil(total / LIMIT);
  // const hasFilters = status || source || category || assignedTo || startDate || endDate || search || showDelivered;
  const hasFilters = status || source || category || assignedTo || campaignId || startDate || endDate || search || showDelivered;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Leads</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {total} lead{total !== 1 ? 's' : ''}
            {status ? ` · ${STATUS_CONFIG[status as LeadStatus]?.label}` : ''}
            {showDelivered && !status ? ' · Delivered' : ''}
            {assignedTo && users.length > 0
              ? ` · ${users.find(u => String(u.id) === assignedTo)?.name || ''}`
              : ''}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {selected.size > 0 && (
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold text-forest-DEFAULT">{selected.size} selected</span>
              {isAdmin() && (
                <select
                  className="form-select text-xs py-1 max-w-[140px]"
                  defaultValue=""
                  onChange={async (e) => {
                    const agentId = Number(e.target.value);
                    if (!agentId) return;
                    try {
                      await leadsAPI.bulkAssign({ ids: Array.from(selected), assigned_to: agentId });
                      toast.success(`${selected.size} leads assigned!`);
                      setSelected(new Set()); load();
                    } catch { toast.error('Assign failed'); }
                    e.target.value = '';
                  }}
                >
                  <option value="">👤 Assign to...</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
              <button className="btn btn-outline btn-xs" onClick={() => bulkExport('excel')} disabled={exporting}>
                {exporting ? '...' : '↓ Excel'}
              </button>
              <button className="btn btn-outline btn-xs" onClick={() => bulkExport('csv')} disabled={exporting}>
                {exporting ? '...' : '↓ CSV'}
              </button>
              <button className="text-gray-400 hover:text-red-500 text-xs" onClick={() => setSelected(new Set())}>✕</button>
            </div>
          )}
          <button className="btn btn-amber text-xs" onClick={() => setShowNew(true)}>+ New Lead</button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="card mb-4">
        <div className="p-3 border-b border-gray-100 space-y-2.5">

          {/* Row 1 — Search + Status chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <SearchInput
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email…" className="max-w-xs text-xs"
            />
            <div className="flex gap-1 flex-wrap">

              {/* All chip */}
              <button
                onClick={() => { setStatus(''); setShowDelivered(false); setPage(1); }}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all
                  ${!status && !showDelivered
                    ? 'border-forest-DEFAULT bg-green-50 text-forest-DEFAULT'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                All
              </button>

              {/* Normal status chips — delivered/cancelled nahi */}
              {LEADS_PAGE_STATUSES.map((s) => (
                <button key={s}
                  onClick={() => { setStatus(s); setShowDelivered(false); setPage(1); }}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all
                    ${status === s
                      ? 'border-forest-DEFAULT bg-green-50 text-forest-DEFAULT'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {STATUS_CONFIG[s as LeadStatus]?.label || s}
                </button>
              ))}

              {/* ── Show Delivered toggle — admin + sales dono ke liye ── */}
              <button
                onClick={handleDeliveredToggle}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all flex items-center gap-1.5
                  ${showDelivered
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-dashed border-gray-300 text-gray-400 hover:border-emerald-400 hover:text-emerald-600'}`}>
                <span className={`inline-block w-3.5 h-3.5 rounded-full border-2 transition-colors flex-shrink-0
                  ${showDelivered ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`} />
                {showDelivered ? '✓ Delivered' : 'Show Delivered'}
              </button>

            </div>
          </div>

          {/* Row 2 — Date shortcuts + range */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-medium">Quick:</span>
            {DATE_SHORTCUTS.map((sc) => (
              <button key={sc.label} onClick={() => applyShortcut(sc.start, sc.end)}
                className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all
                  ${startDate === sc.start && endDate === sc.end
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {sc.label}
              </button>
            ))}
            <span className="text-gray-200">|</span>
            <input type="date" className="form-input text-xs py-1 px-2 max-w-[130px]"
              value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" className="form-input text-xs py-1 px-2 max-w-[130px]"
              value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
          </div>

          {/* Row 3 — Source + campaign + Agent + Clear */}
          <div className="flex items-center gap-2 flex-wrap">
            <select className="form-select text-xs max-w-[130px]" value={source}
              onChange={(e) => { setSource(e.target.value); setPage(1); }}>
              <option value="">All Sources</option>
              {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_CONFIG[s as LeadSource]?.label}</option>)}
            </select>
            
            {/* ── Campaign filter ── */}
            {campaigns.length > 0 && (
              <select className="form-select text-xs max-w-[160px]" value={campaignId}
                onChange={(e) => { setCampaignId(e.target.value); setPage(1); }}>
                <option value="">All Campaigns</option>
                {campaigns.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            {isAdmin() && (
              <select className="form-select text-xs max-w-[160px]" value={assignedTo}
                onChange={(e) => { setAssignedTo(e.target.value); setPage(1); }}>
                <option value="">All Agents</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            {hasFilters && (
              <button onClick={clearFilters}
                className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-all">
                ✕ Clear filters
              </button>
            )}
          </div>

          {/* Agent summary banner */}
          {isAdmin() && assignedTo && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-3">
              <span className="text-xs text-blue-700 font-semibold">
                📊 {users.find(u => String(u.id) === assignedTo)?.name} —
              </span>
              <span className="text-xs text-blue-600">
                {total} leads
                {startDate ? ` (${startDate === endDate ? startDate : `${startDate} to ${endDate}`})` : ' (all time)'}
              </span>
            </div>
          )}

          {/* Delivered view banner */}
          {showDelivered && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-emerald-700 font-semibold">
                📦 Delivered leads dikh rahe hain — Pipeline se aaye hain
              </span>
              <button
                onClick={handleDeliveredToggle}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
                Hide ✕
              </button>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
          </div>
        ) : leads.length === 0 ? (
          <Empty
            icon={showDelivered ? '📦' : '🔍'}
            title={showDelivered ? 'Koi delivered lead nahi' : 'No leads found'}
            description={showDelivered
              ? 'Pipeline mein lead ko Converted → Delivered karo'
              : 'Try adjusting your filters or create a new lead'}
            action={!showDelivered
              ? <button className="btn btn-amber text-xs" onClick={() => setShowNew(true)}>+ Add Lead</button>
              : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8">
                    <input type="checkbox"
                      checked={selected.size === leads.length && leads.length > 0}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-forest-DEFAULT"
                    />
                  </th>
                  <th>Lead</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Campaign</th>
                  <th>Date</th>
                  <th>Remark</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={selected.has(lead.id) ? 'bg-green-50' : ''}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="rounded border-gray-300 text-forest-DEFAULT"
                      />
                    </td>

                    <td>
                      <div className="font-semibold text-gray-900 text-sm">
                        {lead.name}
                        {/* {lead.is_repeat && (
                          <span className="ml-1.5 text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
                            ⟳ Repeat
                          </span>
                        )} */}
                      </div>
                      <div className="text-xs text-gray-500">{lead.phone}</div>
                    </td>

                    <td className="text-xs text-gray-600 max-w-[100px] truncate">{lead.category}</td>
                    <td><SourceBadge source={lead.source} /></td>
                    <td><StatusBadge status={lead.status} /></td>

                    <td>
                      <div className="flex items-center gap-1.5">
                        {lead.assigned_name && <Avatar name={lead.assigned_name} size={22} />}
                        <span className="text-xs">{lead.assigned_name?.split(' ')[0] || '—'}</span>
                      </div>
                    </td>

                    {/* <td className={`text-sm font-semibold ${lead.order_amount ? 'text-forest-DEFAULT' : 'text-gray-300'}`}>
                      {lead.order_amount ? fmtINR(lead.order_amount) : '—'}
                    </td> */}
                    <td className="text-xs text-gray-500">
                      {lead.campaign_name || '—'}
                    </td>

                    <td className="text-xs text-gray-400">
                      {lead.created_at ? fmtDate(lead.created_at) : '—'}
                    </td>

                    <td onClick={(e) => e.stopPropagation()}>
                      <RemarkCell lead={lead} onSaved={handleRemarkSaved} />
                    </td>

                    {/* Actions — delivered leads ke liye Status button nahi */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {lead.status !== 'delivered' && lead.status !== 'cancelled' && (
                          <button className="btn btn-outline btn-xs"
                            onClick={(e) => { e.stopPropagation(); setStatusLead(lead); }}>
                            Status
                          </button>
                        )}
                        {isAdmin() && (
                          <button className="btn btn-ghost btn-xs"
                            onClick={(e) => { e.stopPropagation(); router.push(`/leads/${lead.id}#assign`); }}>
                            Assign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pages > 1 && (
          <Pagination page={page} pages={pages} total={total} limit={LIMIT} onChange={(p) => setPage(p)} />
        )}
      </div>

      <NewLeadModal open={showNew} onClose={() => setShowNew(false)} onCreated={load} />
      {statusLead && <StatusModal lead={statusLead} onClose={() => setStatusLead(null)} onUpdated={load} />}
    </div>
  );
}
