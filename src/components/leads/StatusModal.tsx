'use client';
// src/components/leads/StatusModal.tsx

import { useState } from 'react';
import { Modal, Spinner, StatusBadge } from '@/components/ui';
import { leadsAPI } from '@/lib/api';
import { STATUS_CONFIG, ALL_STATUSES } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Lead, LeadStatus } from '@/types';

interface Props { lead: Lead; onClose: () => void; onUpdated: () => void; }

export default function StatusModal({ lead, onClose, onUpdated }: Props) {
  const [status,   setStatus]   = useState<LeadStatus>(lead.status);
  const [remark,   setRemark]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Converted fields
  const [productName,      setProductName]      = useState(lead.product_name || '');
  const [amount,           setAmount]           = useState(String(lead.order_amount || ''));
  const [paymentStatus,    setPaymentStatus]    = useState<'cod'|'prepaid'|''>(lead.payment_status || '');
  const [closeDate,        setCloseDate]        = useState(lead.close_date?.split('T')[0] || '');
  const [shippingAddress,  setShippingAddress]  = useState(lead.shipping_address || '');

  // Delivered fields
  const [trackingId,    setTrackingId]    = useState(lead.tracking_id || '');
  const [deliveryDate,  setDeliveryDate]  = useState('');

  // Cancelled fields
  const [cancelledDate, setCancelledDate] = useState('');

  // Follow-up fields
  const [fuDate, setFuDate] = useState('');

  // These statuses — sirf pipeline se milenge, StatusModal mein nahi dikhenge
  const PIPELINE_ONLY: LeadStatus[] = ['delivered', 'cancelled'];

  // Current status agar pipeline_only hai toh woh already wahan hai
  // User wapas normal statuses pe la sakta hai (e.g. cancelled → in_process)
  const availableStatuses = ALL_STATUSES.filter(s => !PIPELINE_ONLY.includes(s));

  const validate = (): string => {
    if (status === 'converted') {
      if (!productName.trim()) return 'Product name required.';
      if (!amount)             return 'Order amount required.';
      if (!paymentStatus)      return 'Payment status (COD/Prepaid) required.';
      if (!closeDate)          return 'Close date required.';
    }
    if (status === 'follow_up' && !fuDate) return 'Follow-up date required.';
    return '';
  };

  const handleSubmit = async () => {
    setError('');
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = { status, remark: remark || undefined };

      if (status === 'converted') {
        payload.product_name     = productName;
        payload.order_amount     = Number(amount);
        payload.payment_status   = paymentStatus;
        payload.close_date       = closeDate;
        if (shippingAddress) payload.shipping_address = shippingAddress;
      }

      if (status === 'follow_up') {
        payload.next_followup_at = fuDate;
      }

      await leadsAPI.updateStatus(lead.id, payload);
      toast.success(`Status updated → ${STATUS_CONFIG[status].label}`);
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      title={`Update Status — ${lead.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-amber" onClick={handleSubmit} disabled={loading}>
            {loading ? <><Spinner size={14} /> Updating…</> : 'Update Status'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-red text-xs mb-4">{error}</div>}

      {/* Current status */}
      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 mb-4 text-sm">
        <span className="text-gray-500 text-xs">Current:</span>
        <StatusBadge status={lead.status} />
        {PIPELINE_ONLY.includes(lead.status) && (
          <span className="text-xs text-orange-600 ml-2">
            ⚠ Pipeline status — sirf pipeline se change hoga
          </span>
        )}
      </div>

      {/* Status buttons — pipeline only statuses nahi dikhenge */}
      <div className="mb-4">
        <label className="form-label">New Status</label>
        <div className="flex flex-wrap gap-2">
          {availableStatuses.map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                style={{
                  borderColor: status === s ? cfg.color : '#e5e7eb',
                  background:  status === s ? cfg.bg    : '#fff',
                  color:       status === s ? cfg.color : '#6b7280',
                }}>
                {cfg.label}
              </button>
            );
          })}
        </div>
        {/* Agar lead delivered/cancelled hai toh info show karo */}
        {PIPELINE_ONLY.includes(lead.status) && (
          <p className="text-xs text-gray-400 mt-2">
            Delivered/Cancelled lead ka status change karna ho toh Pipeline page use karo.
          </p>
        )}
      </div>

      {/* ── Conditional fields ── */}
      <div className="space-y-3">

        {/* CONVERTED — saare fields required */}
        {status === 'converted' && (
          <>
            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700 font-medium mb-1">
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
              <input type="number" className="form-input" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 2999" />
            </div>

            <div>
              <label className="form-label">Payment Status <span className="text-red-500">*</span></label>
              <div className="flex gap-3 mt-1">
                {(['cod', 'prepaid'] as const).map((p) => (
                  <button key={p} type="button"
                    onClick={() => setPaymentStatus(p)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all uppercase tracking-wide
                      ${paymentStatus === p
                        ? p === 'cod'
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                    {p === 'cod' ? '💵 COD' : '💳 Prepaid'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Close Date <span className="text-red-500">*</span></label>
              <input type="date" className="form-input" value={closeDate}
                max={new Date().toISOString().split('T')[0]}
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

        {/* FOLLOW UP */}
        {status === 'follow_up' && (
          <div>
            <label className="form-label">Follow-up Date & Time <span className="text-red-500">*</span></label>
            <input type="datetime-local" className="form-input" value={fuDate}
              onChange={(e) => setFuDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)} />
          </div>
        )}

        {/* REMARK — always */}
        <div>
          <label className="form-label">Remark</label>
          <textarea className="form-textarea" value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Status change ka reason…" rows={2} />
        </div>
      </div>
    </Modal>
  );
}
