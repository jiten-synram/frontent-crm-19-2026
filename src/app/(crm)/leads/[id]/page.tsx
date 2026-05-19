'use client';
// src/app/(crm)/leads/[id]/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { leadsAPI, integrationsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { StatusBadge, SourceBadge, Avatar, Modal, Spinner, InfoRow } from '@/components/ui';
import StatusModal from '@/components/leads/StatusModal';
import { fmtINR, fmtDate, fmtDateTime, fmtRelative, fmtDuration, STATUS_CONFIG, avatarColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Lead } from '@/types';

export default function LeadDetailPage() {
  const { id }    = useParams();
  const router    = useRouter();
  const { user, isAdmin } = useAuthStore();

  const [lead, setLead]       = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<null | 'status' | 'call' | 'note' | 'assign'>(null);

  // Note form
  const [noteText, setNoteText]       = useState('');
  const [noteSaving, setNoteSaving]   = useState(false);
  const [notePrivate, setNotePrivate] = useState(false);

  // Call log form
  const [callForm, setCallForm] = useState({ call_type:'outbound', duration:'', outcome:'', notes:'' });
  const [callSaving, setCallSaving] = useState(false);

  // Assign form
  const [assignUsers, setAssignUsers] = useState<any[]>([]);
  const [assignTo, setAssignTo]       = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await leadsAPI.get(Number(id));
      setLead(res?.lead);
    } catch { toast.error('Lead not found'); router.push('/leads'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (modal === 'assign' && isAdmin()) {
      import('@/lib/api').then(({ authAPI }) =>
        authAPI.getUsers({ role:'sales', is_active:'true' }).then((d: any) => setAssignUsers(d?.users || []))
      );
    }
  }, [modal]);

  const saveNote = async () => {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    try {
      await leadsAPI.addNote(Number(id), { note: noteText.trim(), is_private: notePrivate });
      setNoteText(''); setNotePrivate(false);
      toast.success('Note saved');
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setNoteSaving(false); }
  };

  const saveCall = async () => {
    setCallSaving(true);
    try {
      await leadsAPI.addCallLog(Number(id), { ...callForm, duration: Number(callForm.duration) || 0 });
      setCallForm({ call_type:'outbound', duration:'', outcome:'', notes:'' });
      toast.success('Call logged');
      setModal(null);
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setCallSaving(false); }
  };

  const saveAssign = async () => {
    if (!assignTo) return;
    setAssignSaving(true);
    try {
      await leadsAPI.assign(Number(id), { assigned_to: Number(assignTo) });
      toast.success('Lead reassigned');
      setModal(null);
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setAssignSaving(false); }
  };

  const sendWA = async () => {
    if (!lead) return;
    try {
      await integrationsAPI.sendWA({
        phone: lead.phone,
        message: `Namaste ${lead.name}! 🙏 This is a follow-up from Yogveda Healthcare regarding your ${lead.category} treatment inquiry. Our specialist will assist you shortly.`,
      });
      toast.success('WhatsApp message sent!');
    } catch (e: any) { toast.error(e?.message || 'WhatsApp not configured'); }
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <div className="w-20 h-7 skeleton rounded" />
        <div className="w-32 h-7 skeleton rounded" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 h-96 skeleton rounded-xl" />
        <div className="h-96 skeleton rounded-xl" />
      </div>
    </div>
  );

  if (!lead) return null;

  return (
    <div>
      {/* Breadcrumb + actions */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button className="btn btn-ghost btn-sm text-xs" onClick={() => router.push('/leads')}>← Leads</button>
        <span className="text-gray-400 text-sm">/</span>
        <span className="text-sm font-medium text-gray-700">{lead.name}</span>
        <StatusBadge status={lead.status} />
        {lead.is_repeat && <span className="badge bg-amber-50 text-amber-700">⟳ Repeat #{lead.repeat_count}</span>}
        {lead.external_source === 'meta'    && <span className="badge bg-indigo-50 text-indigo-700">Meta Ads</span>}
        {lead.external_source === 'shopify' && <span className="badge bg-green-50 text-green-800">Shopify</span>}

        <div className="ml-auto flex gap-2">
          <button className="btn btn-outline btn-sm text-xs" onClick={sendWA}>💬 WhatsApp</button>
          <button className="btn btn-outline btn-sm text-xs" onClick={() => setModal('call')}>📞 Log Call</button>
          {isAdmin() && <button className="btn btn-outline btn-sm text-xs" onClick={() => setModal('assign')}>👤 Reassign</button>}
          <button className="btn btn-amber btn-sm text-xs" onClick={() => setModal('status')}>Update Status</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* LEFT — 2 cols */}
        <div className="col-span-2 space-y-4">
          {/* Lead info card */}
          <div className="card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Avatar name={lead.name} size={42} />
                <div>
                  <div className="text-base font-bold text-gray-900">{lead.name}</div>
                  <div className="text-xs text-gray-500">{lead.category}{lead.supplement ? ` · ${lead.supplement}` : ''}</div>
                </div>
              </div>
              <span className="text-xs text-gray-400">{fmtDate(lead.created_at)}</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-x-8">
                <InfoRow label="Phone"       value={lead.phone} />
                <InfoRow label="Alt. Phone"  value={lead.alt_phone} />
                <InfoRow label="Email"       value={lead.email} />
                <InfoRow label="City"        value={[lead.city, lead.state].filter(Boolean).join(', ')} />
                <InfoRow label="Source"      value={<SourceBadge source={lead.source} />} />
                <InfoRow label="Status"      value={<StatusBadge status={lead.status} />} />
                <InfoRow label="Product"     value={lead.product_name} />
                <InfoRow label="Order Amount" value={lead.order_amount ? fmtINR(lead.order_amount) : undefined} highlight={!!lead.order_amount} />
                <InfoRow label="Tracking ID" value={lead.tracking_id} />
                <InfoRow label="Assigned To" value={lead.assigned_name} />
                <InfoRow label="Follow-up"   value={lead.next_followup_at ? fmtDateTime(lead.next_followup_at) : undefined} />
                <InfoRow label="Created"     value={fmtDateTime(lead.created_at)} />
              </div>
            </div>
          </div>

          {/* Status history */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-forest-DEFAULT">Status History</span>
            </div>
            <div className="p-4">
              {(lead.history || []).length === 0 && <p className="text-xs text-gray-500 text-center py-4">No status changes yet</p>}
              {[...(lead.history || [])].reverse().map((h) => (
                <div key={h.id} className="timeline-item">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: (STATUS_CONFIG as any)[h.to_status]?.dot || '#9ca3af' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {h.from_status ? `${(STATUS_CONFIG as any)[h.from_status]?.label || h.from_status} → ` : ''}
                      {(STATUS_CONFIG as any)[h.to_status]?.label || h.to_status}
                    </div>
                    {h.remark && <div className="text-xs text-gray-500 mt-0.5">{h.remark}</div>}
                    <div className="text-xs text-gray-400 mt-0.5">{h.changed_by_name} · {fmtDateTime(h.changed_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Call logs */}
          {(lead.callLogs || []).length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-forest-DEFAULT">Call Logs ({lead.callLogs?.length})</span>
                <button className="btn btn-outline btn-sm text-xs" onClick={() => setModal('call')}>+ Log Call</button>
              </div>
              <div className="p-4 space-y-3">
                {lead.callLogs?.map((c) => (
                  <div key={c.id} className="timeline-item">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: c.call_type === 'inbound' ? '#22c55e' : '#3b82f6' }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {c.call_type === 'inbound' ? '← Inbound' : '→ Outbound'}
                        {c.duration ? ` · ${fmtDuration(c.duration)}` : ''}
                      </div>
                      {c.outcome && <div className="text-xs text-gray-700 mt-0.5">{c.outcome}</div>}
                      {c.notes   && <div className="text-xs text-gray-500 mt-0.5">{c.notes}</div>}
                      <div className="text-xs text-gray-400 mt-0.5">{c.caller_name} · {fmtDateTime(c.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — 1 col */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-forest-DEFAULT">Quick Actions</span>
            </div>
            <div className="p-3 space-y-2">
              <button className="btn btn-primary w-full justify-start text-xs" onClick={() => setModal('status')}>✦ Update Status</button>
              <button className="btn btn-outline w-full justify-start text-xs" onClick={() => setModal('call')}>📞 Log a Call</button>
              <button className="btn btn-outline w-full justify-start text-xs" onClick={sendWA}>💬 Send WhatsApp</button>
              {isAdmin() && <button className="btn btn-outline w-full justify-start text-xs" onClick={() => setModal('assign')}>👤 Reassign Lead</button>}
              {lead.linked_customer_id && (
                <button className="btn btn-ghost w-full justify-start text-xs" onClick={() => router.push(`/customers/${lead.linked_customer_id}`)}>
                  👥 Customer Profile →
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-forest-DEFAULT">Notes ({lead.notes?.length || 0})</span>
            </div>
            <div className="p-3">
              <div className="max-h-52 overflow-y-auto space-y-2 mb-3">
                {(lead.notes || []).length === 0 && <p className="text-xs text-gray-400 text-center py-3">No notes yet</p>}
                {lead.notes?.map((n) => (
                  <div key={n.id} className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-700 leading-relaxed">
                    {n.note}
                    <div className="text-gray-400 mt-1">{n.added_by_name} · {fmtRelative(n.created_at)}</div>
                  </div>
                ))}
              </div>
              <textarea className="form-textarea text-xs" value={noteText}
                onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" rows={2} />
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={notePrivate} onChange={(e) => setNotePrivate(e.target.checked)} className="rounded" />
                  Private
                </label>
                <button className="btn btn-primary btn-sm text-xs" onClick={saveNote} disabled={noteSaving || !noteText.trim()}>
                  {noteSaving ? <Spinner size={12} /> : 'Save Note'}
                </button>
              </div>
            </div>
          </div>

          {/* Linked customer */}
          {lead.linkedCustomer && (
            <div className="card">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-forest-DEFAULT">Customer Profile</span>
              </div>
              <div className="p-3">
                <InfoRow label="Total Orders"  value={String(lead.linkedCustomer.total_orders)} highlight />
                <InfoRow label="Lifetime Value" value={fmtINR(lead.linkedCustomer.lifetime_value)} highlight />
                <InfoRow label="Last Purchase"  value={fmtDate(lead.linkedCustomer.last_purchase)} />
                <button className="btn btn-outline w-full justify-center text-xs mt-3"
                  onClick={() => router.push(`/customers/${lead.linkedCustomer!.id}`)}>
                  View Full Profile →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status modal */}
      {modal === 'status' && (
        <StatusModal lead={lead} onClose={() => setModal(null)} onUpdated={load} />
      )}

      {/* Call log modal */}
      <Modal open={modal === 'call'} onClose={() => setModal(null)} title="Log Call"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(null)} disabled={callSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={saveCall} disabled={callSaving}>
              {callSaving ? <Spinner size={14} /> : 'Save Call Log'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="form-label">Call Type</label>
            <select className="form-select" value={callForm.call_type} onChange={(e) => setCallForm(f => ({...f, call_type: e.target.value}))}>
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
          </div>
          <div>
            <label className="form-label">Duration (seconds)</label>
            <input type="number" className="form-input" placeholder="e.g. 180"
              value={callForm.duration} onChange={(e) => setCallForm(f => ({...f, duration: e.target.value}))} />
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label">Outcome</label>
          <input className="form-input" placeholder="e.g. Interested, Will call back, Not answering"
            value={callForm.outcome} onChange={(e) => setCallForm(f => ({...f, outcome: e.target.value}))} />
        </div>
        <div>
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" placeholder="What was discussed…"
            value={callForm.notes} onChange={(e) => setCallForm(f => ({...f, notes: e.target.value}))} />
        </div>
      </Modal>

      {/* Reassign modal */}
      <Modal open={modal === 'assign'} onClose={() => setModal(null)} title="Reassign Lead"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(null)} disabled={assignSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={saveAssign} disabled={assignSaving || !assignTo}>
              {assignSaving ? <Spinner size={14} /> : 'Reassign'}
            </button>
          </>
        }
      >
        <div className="mb-3 bg-gray-50 rounded-lg p-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">Currently assigned to:</span>
          <span className="text-xs font-semibold">{lead.assigned_name || 'Unassigned'}</span>
        </div>
        <div>
          <label className="form-label">Assign To</label>
          <select className="form-select" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">Select agent…</option>
            {assignUsers.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </div>
      </Modal>
    </div>
  );
}
