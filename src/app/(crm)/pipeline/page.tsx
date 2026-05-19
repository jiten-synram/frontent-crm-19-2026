'use client';
// src/app/(crm)/pipeline/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { leadsAPI } from '@/lib/api';
import { Modal, Spinner, StatusBadge, Avatar } from '@/components/ui';
import { fmtINR, fmtDate, STATUS_CONFIG, ALL_STATUSES, avatarColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Lead, LeadStatus } from '@/types';

type ColumnsMap = Record<LeadStatus, Lead[]>;

export default function PipelinePage() {
  const router = useRouter();
  const [columns, setColumns]   = useState<ColumnsMap>({} as ColumnsMap);
  const [loading, setLoading]   = useState(true);
  const [moveModal, setMoveModal] = useState<{ lead: Lead; toStatus: LeadStatus } | null>(null);
  const [moveForm, setMoveForm]   = useState({ remark:'', order_amount:'', tracking_id:'', next_followup_at:'' });
  const [moveSaving, setMoveSaving] = useState(false);
  const [moveError,  setMoveError]  = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        ALL_STATUSES.map((s) => leadsAPI.list({ status: s, limit: 50 }).then((d: any) => ({ status: s, leads: d?.leads || [] })))
      );
      const map: Partial<ColumnsMap> = {};
      results.forEach(({ status, leads }) => { map[status as LeadStatus] = leads; });
      setColumns(map as ColumnsMap);
    } catch { toast.error('Failed to load pipeline'); }
    finally { setLoading(false); }
  };

  const onDragEnd = (result: any) => {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const fromStatus = source.droppableId as LeadStatus;
    const toStatus   = destination.droppableId as LeadStatus;
    const lead       = columns[fromStatus]?.find((l) => String(l.id) === draggableId);
    if (!lead) return;

    setMoveModal({ lead, toStatus });
    setMoveForm({ remark:'', order_amount: String(lead.order_amount || ''), tracking_id: lead.tracking_id || '', next_followup_at:'' });
    setMoveError('');
  };

  const confirmMove = async () => {
    if (!moveModal) return;
    const { lead, toStatus } = moveModal;
    const { remark, order_amount, tracking_id, next_followup_at } = moveForm;
    setMoveError('');

    if (toStatus === 'delivered' && !tracking_id) { setMoveError('Tracking ID required for Delivered.'); return; }
    if (toStatus === 'converted' && !order_amount) { setMoveError('Order amount required for Converted.'); return; }
    if (toStatus === 'follow_up' && !next_followup_at) { setMoveError('Follow-up date required.'); return; }

    setMoveSaving(true);
    try {
      await leadsAPI.updateStatus(lead.id, {
        status: toStatus, remark: remark || undefined,
        order_amount:     order_amount  ? Number(order_amount)  : undefined,
        tracking_id:      tracking_id   || undefined,
        next_followup_at: next_followup_at || undefined,
      });
      toast.success(`${lead.name} → ${STATUS_CONFIG[toStatus].label}`);
      setMoveModal(null);
      await loadAll();
    } catch (e: any) { setMoveError(e?.message || 'Failed to update status.'); }
    finally { setMoveSaving(false); }
  };

  const COLUMN_COLORS: Record<LeadStatus, string> = {
    new:'#3b82f6', in_process:'#f59e0b', follow_up:'#8b5cf6',
    converted:'#22c55e', delivered:'#10b981', closed_lost:'#ef4444',
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Pipeline</h1>
          <p className="text-xs text-gray-500 mt-0.5">Drag cards between columns to update lead status</p>
        </div>
        <button className="btn btn-amber text-xs" onClick={() => router.push('/leads?action=new')}>+ New Lead</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({length:6}).map((_,i) => <div key={i} className="h-64 skeleton rounded-xl" />)}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-3 gap-3">
            {ALL_STATUSES.slice(0,3).map((s) => (
              <PipelineColumn key={s} status={s as LeadStatus} leads={columns[s as LeadStatus] || []}
                color={COLUMN_COLORS[s as LeadStatus]} onCardClick={(l) => router.push(`/leads/${l.id}`)} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {ALL_STATUSES.slice(3).map((s) => (
              <PipelineColumn key={s} status={s as LeadStatus} leads={columns[s as LeadStatus] || []}
                color={COLUMN_COLORS[s as LeadStatus]} onCardClick={(l) => router.push(`/leads/${l.id}`)} />
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Move confirm modal */}
      {moveModal && (
        <Modal open title={`Move to ${STATUS_CONFIG[moveModal.toStatus].label}`} onClose={() => setMoveModal(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setMoveModal(null)} disabled={moveSaving}>Cancel</button>
              <button className="btn btn-amber" onClick={confirmMove} disabled={moveSaving}>
                {moveSaving ? <Spinner size={14} /> : 'Confirm Move'}
              </button>
            </>
          }
        >
          {moveError && <div className="alert alert-red text-xs mb-3">{moveError}</div>}
          <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-4 text-sm">
            Moving <strong>{moveModal.lead.name}</strong> → <span className="font-bold" style={{ color: COLUMN_COLORS[moveModal.toStatus] }}>{STATUS_CONFIG[moveModal.toStatus].label}</span>
          </div>

          {!['new','closed_lost'].includes(moveModal.toStatus) && (
            <div className="mb-3">
              <label className="form-label">Order Amount (₹){moveModal.toStatus === 'converted' ? <span className="text-red-500"> *</span> : ''}</label>
              <input type="number" className="form-input" value={moveForm.order_amount} onChange={(e) => setMoveForm(f=>({...f,order_amount:e.target.value}))} placeholder="Enter amount" />
            </div>
          )}
          {moveModal.toStatus === 'delivered' && (
            <div className="mb-3">
              <label className="form-label">Tracking ID <span className="text-red-500">*</span></label>
              <input className="form-input" value={moveForm.tracking_id} onChange={(e) => setMoveForm(f=>({...f,tracking_id:e.target.value}))} placeholder="e.g. DTDC1234567" />
            </div>
          )}
          {moveModal.toStatus === 'follow_up' && (
            <div className="mb-3">
              <label className="form-label">Follow-up Date <span className="text-red-500">*</span></label>
              <input type="datetime-local" className="form-input" value={moveForm.next_followup_at}
                onChange={(e) => setMoveForm(f=>({...f,next_followup_at:e.target.value}))} />
            </div>
          )}
          <div>
            <label className="form-label">Remark</label>
            <textarea className="form-textarea" value={moveForm.remark} onChange={(e) => setMoveForm(f=>({...f,remark:e.target.value}))} rows={2} placeholder="Why are you moving this lead?" />
          </div>
        </Modal>
      )}
    </div>
  );
}

function PipelineColumn({ status, leads, color, onCardClick }: { status: LeadStatus; leads: Lead[]; color: string; onCardClick: (l: Lead) => void; }) {
  return (
    <Droppable droppableId={status}>
      {(provided, snapshot) => (
        <div className={`rounded-xl border overflow-hidden transition-colors ${snapshot.isDraggingOver ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between px-3 py-2.5 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs font-bold text-gray-700">{STATUS_CONFIG[status].label}</span>
            </div>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">{leads.length}</span>
          </div>
          <div ref={provided.innerRef} {...provided.droppableProps} className="p-2 min-h-[120px]">
            {leads.map((lead, index) => (
              <Draggable key={String(lead.id)} draggableId={String(lead.id)} index={index}>
                {(prov, snap) => (
                  <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                    className={`pipeline-card mb-2 ${snap.isDragging ? 'rotate-1 shadow-modal' : ''}`}
                    onClick={() => onCardClick(lead)}
                  >
                    <div className="font-semibold text-xs text-gray-900 mb-0.5">{lead.name}</div>
                    <div className="text-[10.5px] text-gray-500 mb-2">{lead.category}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {lead.assigned_name && <Avatar name={lead.assigned_name} size={18} />}
                        <span className="text-[10px] text-gray-500">{lead.assigned_name?.split(' ')[0]}</span>
                      </div>
                      <span className={`text-[10.5px] font-bold ${lead.order_amount ? 'text-forest-DEFAULT' : 'text-gray-300'}`}>
                        {lead.order_amount ? fmtINR(lead.order_amount) : 'No amt'}
                      </span>
                    </div>
                    {lead.next_followup_at && (
                      <div className={`mt-1.5 text-[9.5px] font-semibold ${new Date(lead.next_followup_at) < new Date() ? 'text-red-600' : 'text-amber-700'}`}>
                        📅 {fmtDate(lead.next_followup_at)}
                      </div>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            <button className="w-full text-center py-2 text-[10px] text-gray-400 border border-dashed border-gray-200 rounded-lg hover:border-green-400 hover:text-green-700 transition-colors"
              onClick={() => window.location.href = '/leads?action=new'}>
              + Add lead
            </button>
          </div>
        </div>
      )}
    </Droppable>
  );
}
