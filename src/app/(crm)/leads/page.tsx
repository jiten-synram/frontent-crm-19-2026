'use client';
// src/app/(crm)/leads/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { leadsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { StatusBadge, SourceBadge, Avatar, Pagination, Empty, Skeleton, SearchInput } from '@/components/ui';
import NewLeadModal from '@/components/leads/NewLeadModal';
import StatusModal  from '@/components/leads/StatusModal';
import { fmtINR, fmtDate, STATUS_CONFIG, SOURCE_CONFIG, ALL_STATUSES, SOURCES, SOURCE_CONFIG as SC, avatarColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Lead, LeadStatus, LeadSource } from '@/types';

export default function LeadsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin }  = useAuthStore();

  const [leads, setLeads]     = useState<Lead[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState(searchParams.get('search') || '');
  const [status, setStatus]   = useState<string>(searchParams.get('status') || '');
  const [source, setSource]   = useState<string>('');

  const [showNew,    setShowNew]    = useState(searchParams.get('action') === 'new');
  const [statusLead, setStatusLead] = useState<Lead | null>(null);

  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: LIMIT };
      if (search) params.search = search;
      if (status) params.status = status;
      if (source) params.source = source;
      const res: any = await leadsAPI.list(params);
      setLeads(res?.leads || []);
      setTotal(res?.total || 0);
    } catch { toast.error('Failed to load leads'); }
    finally { setLoading(false); }
  }, [page, search, status, source]);

  useEffect(() => { load(); }, [load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const pages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Leads</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {total} lead{total !== 1 ? 's' : ''} {status ? `· filtered by ${STATUS_CONFIG[status as LeadStatus]?.label}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline text-xs" onClick={() => leadsAPI.list({ format: 'csv', status, source, search }).catch(() => toast.error('Export failed'))}>
            ↓ Export
          </button>
          <button className="btn btn-amber text-xs" onClick={() => setShowNew(true)}>+ New Lead</button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 p-3 border-b border-gray-100 flex-wrap">
          <SearchInput
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email…" className="max-w-xs text-xs"
          />

          {/* Status chips */}
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => { setStatus(''); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${!status ? 'border-forest-DEFAULT bg-green-50 text-forest-DEFAULT' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              All
            </button>
            {ALL_STATUSES.map((s) => (
              <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${status === s ? 'border-forest-DEFAULT bg-green-50 text-forest-DEFAULT' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>

          {/* Source filter */}
          <select className="form-select text-xs max-w-[130px]" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
            <option value="">All Sources</option>
            {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_CONFIG[s as LeadSource]?.label}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({length:8}).map((_,i) => <Skeleton key={i} className="h-12 rounded" />)}
          </div>
        ) : leads.length === 0 ? (
          <Empty icon="🔍" title="No leads found" description="Try adjusting your filters or create a new lead" action={<button className="btn btn-amber text-xs" onClick={() => setShowNew(true)}>+ Add Lead</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th><th>Category</th><th>Source</th><th>Status</th>
                  <th>Assigned To</th><th>Amount</th><th>Follow-up</th><th></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)}>
                    <td>
                      <div className="font-semibold text-gray-900 text-sm">
                        {lead.name}
                        {/* {lead.is_repeat && <span className="ml-1.5 text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">⟳ Repeat</span>}
                        {lead.is_duplicate && <span className="ml-1.5 text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded-full font-bold">⚠ Dup</span>} */}
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
                    <td className={`text-sm font-semibold ${lead.order_amount ? 'text-forest-DEFAULT' : 'text-gray-300'}`}>
                      {lead.order_amount ? fmtINR(lead.order_amount) : '—'}
                    </td>
                    <td className={`text-xs ${lead.next_followup_at && new Date(lead.next_followup_at) < new Date() ? 'text-red-600 font-semibold' : lead.next_followup_at ? 'text-amber-700' : 'text-gray-400'}`}>
                      {lead.next_followup_at ? fmtDate(lead.next_followup_at) : '—'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button className="btn btn-outline btn-xs"
                          onClick={(e) => { e.stopPropagation(); setStatusLead(lead); }}>
                          Status
                        </button>
                        {isAdmin() && (
                          <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); router.push(`/leads/${lead.id}#assign`); }}>
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

        {/* Pagination */}
        {!loading && pages > 1 && (
          <Pagination page={page} pages={pages} total={total} limit={LIMIT} onChange={(p) => { setPage(p); }} />
        )}
      </div>

      {/* Modals */}
      <NewLeadModal open={showNew} onClose={() => setShowNew(false)} onCreated={load} />
      {statusLead && <StatusModal lead={statusLead} onClose={() => setStatusLead(null)} onUpdated={load} />}
    </div>
  );
}
