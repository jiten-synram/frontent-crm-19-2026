'use client';
// src/app/(crm)/pipeline/page.tsx
// PIPELINE — sirf 3 columns: Converted | Delivered | Cancelled

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { leadsAPI } from '@/lib/api';
import { Modal, Spinner, StatusBadge, Avatar } from '@/components/ui';
import { fmtINR, fmtDate, STATUS_CONFIG, PIPELINE_STATUSES, avatarColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Lead, LeadStatus } from '@/types';

type ColumnsMap = Record<string, Lead[]>;

// Allowed drag moves:
// any → converted ✅  (but only if not already delivered/cancelled)
// converted → delivered ✅
// converted → cancelled ✅
// delivered → cancelled ✅
// delivered → converted ❌
// cancelled → anything ❌
const ALLOWED_MOVES: Record<string, string[]> = {
  converted:  ['delivered', 'cancelled'],
  delivered:  ['cancelled'],
  cancelled:  [],   // lock karo
};

export default function PipelinePage() {
  const router = useRouter();
  const [columns,    setColumns]    = useState<ColumnsMap>({});
  const [loading,    setLoading]    = useState(true);
  const [moveModal,  setMoveModal]  = useState<{ lead: Lead; toStatus: LeadStatus } | null>(null);
  const [moveSaving, setMoveSaving] = useState(false);
  const [moveError,  setMoveError]  = useState('');

  // Converted form fields
  const [productName,     setProductName]     = useState('');
  const [orderAmount,     setOrderAmount]     = useState('');
  const [paymentStatus,   setPaymentStatus]   = useState<'cod'|'prepaid'|''>('');
  const [closeDate,       setCloseDate]       = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  // Delivered form fields
  const [trackingId,   setTrackingId]   = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // Cancelled form
  const [cancelledDate, setCancelledDate] = useState('');
  const [remark,        setRemark]        = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        PIPELINE_STATUSES.map((s) =>
          leadsAPI.list({ status: s, limit: 100 }).then((d: any) => ({ status: s, leads: d?.leads || [] }))
        )
      );
      const map: ColumnsMap = {};
      results.forEach(({ status, leads }) => { map[status] = leads; });
      setColumns(map);
    } catch { toast.error('Failed to load pipeline'); }
    finally { setLoading(false); }
  };

  const onDragEnd = (result: any) => {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    const fromStatus = source.droppableId as LeadStatus;
    const toStatus   = destination.droppableId as LeadStatus;
    if (fromStatus === toStatus) return;

    // Check allowed moves
    const allowed = ALLOWED_MOVES[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      toast.error(`${STATUS_CONFIG[fromStatus]?.label} → ${STATUS_CONFIG[toStatus]?.label} allowed nahi hai`);
      return;
    }

    const lead = columns[fromStatus]?.find((l) => String(l.id) === draggableId);
    if (!lead) return;

    // Reset form
    setProductName(lead.product_name || '');
    setOrderAmount(String(lead.order_amount || ''));
    setPaymentStatus(lead.payment_status || '');
    setCloseDate(lead.close_date?.split('T')[0] || '');
    setShippingAddress(lead.shipping_address || '');
    setTrackingId(lead.tracking_id || '');
    setDeliveryDate('');
    setCancelledDate('');
    setRemark('');
    setMoveError('');
    setMoveModal({ lead, toStatus });
  };

  const validateMove = (): string => {
    if (!moveModal) return '';
    const { toStatus } = moveModal;
    if (toStatus === 'converted') {
      if (!productName.trim()) return 'Product name required.';
      if (!orderAmount)        return 'Order amount required.';
      if (!paymentStatus)      return 'Payment status (COD/Prepaid) required.';
      if (!closeDate)          return 'Close date required.';
    }
    if (toStatus === 'delivered') {
      if (!deliveryDate) return 'Delivery date required.';
    }
    if (toStatus === 'cancelled') {
      if (!cancelledDate) return 'Cancelled date required.';
    }
    return '';
  };

  const confirmMove = async () => {
    if (!moveModal) return;
    const { lead, toStatus } = moveModal;
    setMoveError('');
    const err = validateMove();
    if (err) { setMoveError(err); return; }

    setMoveSaving(true);
    try {
      const payload: Record<string, unknown> = {
        status: toStatus,
        remark: remark || undefined,
      };

      if (toStatus === 'converted') {
        payload.product_name     = productName;
        payload.order_amount     = Number(orderAmount);
        payload.payment_status   = paymentStatus;
        payload.close_date       = closeDate;
        if (shippingAddress) payload.shipping_address = shippingAddress;
      }

      if (toStatus === 'delivered') {
        payload.delivery_date = deliveryDate;
        if (trackingId) payload.tracking_id = trackingId;
        if (remark)     payload.remark = remark; 
      }

      if (toStatus === 'cancelled') {
        payload.cancelled_date = cancelledDate;
      }

      await leadsAPI.updateStatus(lead.id, payload);
      toast.success(`${lead.name} → ${STATUS_CONFIG[toStatus].label}`);
      setMoveModal(null);
      await loadAll();
    } catch (e: any) {
      setMoveError(e?.message || 'Failed to update status.');
    } finally {
      setMoveSaving(false);
    }
  };

  const COLUMN_COLORS: Record<string, string> = {
    converted: '#22c55e',
    delivered: '#10b981',
    cancelled: '#f97316',
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Pipeline</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Converted → Delivered → Cancelled — drag karo status change karne ke liye
          </p>
        </div>
        <button className="btn btn-amber text-xs" onClick={() => router.push('/leads?action=new')}>
          + New Lead
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 skeleton rounded-xl" />
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-3 gap-3">
            {PIPELINE_STATUSES.map((s) => (
              <PipelineColumn
                key={s}
                status={s as LeadStatus}
                leads={columns[s] || []}
                color={COLUMN_COLORS[s]}
                onCardClick={(l) => router.push(`/leads/${l.id}`)}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Move modal */}
      {moveModal && (
        <Modal
          open
          title={`Move → ${STATUS_CONFIG[moveModal.toStatus]?.label}`}
          onClose={() => setMoveModal(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setMoveModal(null)} disabled={moveSaving}>
                Cancel
              </button>
              <button className="btn btn-amber" onClick={confirmMove} disabled={moveSaving}>
                {moveSaving ? <Spinner size={14} /> : 'Confirm Move'}
              </button>
            </>
          }
        >
          {moveError && <div className="alert alert-red text-xs mb-3">{moveError}</div>}

          <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-4 text-sm">
            Moving <strong>{moveModal.lead.name}</strong> →{' '}
            <span className="font-bold" style={{ color: COLUMN_COLORS[moveModal.toStatus] }}>
              {STATUS_CONFIG[moveModal.toStatus]?.label}
            </span>
          </div>

          <div className="space-y-3">

            {/* ── CONVERTED fields ── */}
            {moveModal.toStatus === 'converted' && (
              <>
                <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700 font-medium">
                  📦 Order details fill karo — sab required hain
                </div>
                <div>
                  <label className="form-label">Product Name <span className="text-red-500">*</span></label>
                  <input className="form-input" value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Kidney Care Plus" />
                </div>
                <div>
                  <label className="form-label">Order Amount (₹) <span className="text-red-500">*</span></label>
                  <input type="number" className="form-input" value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    placeholder="e.g. 2999" />
                </div>
                <div>
                  <label className="form-label">Payment Status <span className="text-red-500">*</span></label>
                  <div className="flex gap-3 mt-1">
                    {(['cod', 'prepaid'] as const).map((p) => (
                      <button key={p} type="button"
                        onClick={() => setPaymentStatus(p)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all uppercase
                          ${paymentStatus === p
                            ? p === 'cod'
                              ? 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-400'}`}>
                        {p === 'cod' ? '💵 COD' : '💳 Prepaid'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label">Close Date <span className="text-red-500">*</span></label>
                  <input type="date" className="form-input" value={closeDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCloseDate(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Shipping Address</label>
                  <textarea className="form-textarea" value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Full delivery address…" rows={2} />
                </div>
              </>
            )}

            {/* ── DELIVERED fields ── */}
            {moveModal.toStatus === 'delivered' && (
              <>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs text-emerald-700 font-medium">
                  🚚 Delivery details add karo
                </div>
                <div>
                  <label className="form-label">Delivery Date <span className="text-red-500">*</span></label>
                  <input type="date" className="form-input" value={deliveryDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDeliveryDate(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Tracking ID <span className="text-xs text-gray-400">(optional)</span></label>
                  <input className="form-input" value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="e.g. DTDC1234567890" />
                </div>
              </>
            )}

            {/* ── CANCELLED fields ── */}
            {moveModal.toStatus === 'cancelled' && (
              <>
                <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs text-orange-700 font-medium">
                  ❌ Cancellation details
                </div>
                <div>
                  <label className="form-label">Cancelled Date <span className="text-red-500">*</span></label>
                  <input type="date" className="form-input" value={cancelledDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCancelledDate(e.target.value)} />
                </div>
              </>
            )}

            {/* Remark — always */}
            <div>
              <label className="form-label">Remark</label>
              <textarea className="form-textarea" value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Reason for moving…" rows={2} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Pipeline Column ───────────────────────────────────────────────
function PipelineColumn({
  status, leads, color, onCardClick,
}: {
  status: LeadStatus; leads: Lead[]; color: string; onCardClick: (l: Lead) => void;
}) {
  const isCancelled = status === 'cancelled';

  return (
    <Droppable droppableId={status}>
      {(provided, snapshot) => (
        <div className={`rounded-xl border overflow-hidden transition-colors
          ${snapshot.isDraggingOver ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}
          ${isCancelled ? 'opacity-90' : ''}`}>
          <div className="flex items-center justify-between px-3 py-2.5 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs font-bold text-gray-700">{STATUS_CONFIG[status]?.label}</span>
              {isCancelled && <span className="text-[9px] text-gray-400">(lock)</span>}
            </div>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
              {leads.length}
            </span>
          </div>

          <div ref={provided.innerRef} {...provided.droppableProps} className="p-2 min-h-[120px]">
            {leads.map((lead, index) => (
              <Draggable
                key={String(lead.id)}
                draggableId={String(lead.id)}
                index={index}
                isDragDisabled={isCancelled}
              >
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                    className={`pipeline-card mb-2 ${snap.isDragging ? 'rotate-1 shadow-modal' : ''}`}
                    onClick={() => onCardClick(lead)}
                  >
                    <div className="font-semibold text-xs text-gray-900 mb-0.5">{lead.name}</div>
                    <div className="text-[10.5px] text-gray-500 mb-1">{lead.category}</div>
                    {/* Payment status badge */}
                    {lead.payment_status && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold mr-1
                        ${lead.payment_status === 'cod'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-green-50 text-green-700'}`}>
                        {lead.payment_status === 'cod' ? 'COD' : 'Prepaid'}
                      </span>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1.5">
                        {lead.assigned_name && <Avatar name={lead.assigned_name} size={18} />}
                        <span className="text-[10px] text-gray-500">{lead.assigned_name?.split(' ')[0]}</span>
                      </div>
                      <span className={`text-[10.5px] font-bold ${lead.order_amount ? 'text-forest-DEFAULT' : 'text-gray-300'}`}>
                        {lead.order_amount ? fmtINR(lead.order_amount) : 'No amt'}
                      </span>
                      {/* <span className={`text-[10.5px] font-bold ${lead.total_delivered_amount ? 'text-forest-DEFAULT' : 'text-gray-300'}`}>
                        {lead.total_delivered_amount ? fmtINR(lead.total_delivered_amount) : 'No amt'}
                      </span> */}
                    </div>
                    {/* Close date */}
                    {lead.close_date && (
                      <div className="mt-1 text-[9.5px] text-gray-400">
                        🗓 Close: {fmtDate(lead.close_date)}
                      </div>
                    )}
                    {/* Cancelled date */}
                    {lead.cancelled_date && (
                      <div className="mt-1 text-[9.5px] text-orange-600 font-semibold">
                        ❌ {fmtDate(lead.cancelled_date)}
                      </div>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
}
