'use client';
// src/app/(crm)/follow-ups/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { followUpsAPI, leadsAPI } from '@/lib/api';
import { StatusBadge, Modal, Spinner, Empty, Skeleton } from '@/components/ui';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { FollowUp } from '@/types';

type Tab = 'overdue' | 'today' | 'upcoming';

export default function FollowUpsPage() {
  const router = useRouter();
  const sp     = useSearchParams();
  const [tab, setTab]         = useState<Tab>((sp.get('tab') as Tab) || 'overdue');
  const [items, setItems]     = useState<FollowUp[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts]   = useState({ overdue:0, today:0, upcoming:0 });
  const [completeModal, setCompleteModal] = useState<FollowUp | null>(null);
  const [completeForm, setCompleteForm]   = useState({ notes:'', rescheduled_to:'' });
  const [completeSaving, setCompleteSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, countsRes]: any[] = await Promise.all([
        followUpsAPI.list({ tab, limit: 50 }),
        followUpsAPI.counts(),
      ]);
      setItems(itemsRes?.items || []);
      setTotal(itemsRes?.total || 0);
      setCounts(countsRes?.counts || { overdue:0, today:0, upcoming:0 });
    } catch { toast.error('Failed to load follow-ups'); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const completeFollowUp = async () => {
    if (!completeModal) return;
    setCompleteSaving(true);
    try {
      await followUpsAPI.complete(completeModal.id, {
        notes:          completeForm.notes || undefined,
        rescheduled_to: completeForm.rescheduled_to || undefined,
      });
      toast.success(completeForm.rescheduled_to ? 'Rescheduled' : 'Follow-up marked done');
      setCompleteModal(null);
      setCompleteForm({ notes:'', rescheduled_to:'' });
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setCompleteSaving(false); }
  };

  const TAB_CONFIG = [
    { key: 'overdue',  label: 'Overdue',  count: counts.overdue,  bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'  },
    { key: 'today',    label: 'Today',    count: counts.today,    bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200' },
    { key: 'upcoming', label: 'Upcoming', count: counts.upcoming, bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'  },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Follow-ups</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {counts.overdue} overdue · {counts.today} today · {counts.upcoming} upcoming
          </p>
        </div>
      </div>

      {counts.overdue > 0 && (
        <div className="alert alert-red cursor-pointer mb-4" onClick={() => setTab('overdue')}>
          ⚠ <strong>{counts.overdue} overdue follow-up{counts.overdue > 1 ? 's' : ''}</strong> — take action now
        </div>
      )}

      {/* Tabs */}
      <div className="tab-nav mb-5">
        {TAB_CONFIG.map(({ key, label, count }) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key as Tab)}>
            {label} {count > 0 && <span className="ml-1 bg-gray-100 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">{Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <Empty icon="🎉" title={`No ${tab} follow-ups`} description={tab === 'overdue' ? 'All caught up!' : 'Nothing scheduled for this period'} />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="card p-4 hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-bold text-gray-900 cursor-pointer hover:text-green-800" onClick={() => router.push(`/leads/${item.lead_id}`)}>
                    {item.lead_name}
                  </div>
                  <div className="text-xs text-gray-500">{item.lead_phone} · {item.category}</div>
                </div>
                <StatusBadge status={item.lead_status} />
              </div>
              <div className={`text-xs font-semibold mb-2 ${tab === 'overdue' ? 'text-red-600' : tab === 'today' ? 'text-amber-700' : 'text-blue-600'}`}>
                📅 {fmtDateTime(item.scheduled_at)}
              </div>
              <div className="text-xs text-gray-500 mb-3">Agent: {item.agent_name}</div>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm text-xs flex-1" onClick={() => { setCompleteModal(item); setCompleteForm({ notes:'', rescheduled_to:'' }); }}>
                  Mark Done
                </button>
                <button className="btn btn-ghost btn-sm text-xs" onClick={() => router.push(`/leads/${item.lead_id}`)}>
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complete / Reschedule modal */}
      <Modal
        open={!!completeModal} onClose={() => setCompleteModal(null)}
        title={`Complete Follow-up — ${completeModal?.lead_name}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setCompleteModal(null)} disabled={completeSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={completeFollowUp} disabled={completeSaving}>
              {completeSaving ? <Spinner size={14} /> : (completeForm.rescheduled_to ? 'Reschedule' : 'Mark Done')}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={completeForm.notes} onChange={(e) => setCompleteForm(f=>({...f,notes:e.target.value}))} placeholder="Outcome of follow-up…" rows={2} />
        </div>
        <div>
          <label className="form-label">Reschedule to (optional — leave blank to mark done)</label>
          <input type="datetime-local" className="form-input" value={completeForm.rescheduled_to}
            onChange={(e) => setCompleteForm(f=>({...f,rescheduled_to:e.target.value}))}
            min={new Date().toISOString().slice(0,16)} />
        </div>
      </Modal>
    </div>
  );
}
