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
  const [status, setStatus]   = useState<LeadStatus>(lead.status);
  const [remark, setRemark]   = useState('');
  const [amount, setAmount]   = useState(String(lead.order_amount || ''));
  const [trackId, setTrackId] = useState(lead.tracking_id || '');
  const [fuDate, setFuDate]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const requiresAmount = !['new', 'closed_lost'].includes(status);
  const requiresTrack  = status === 'delivered';
  const requiresFu     = status === 'follow_up';

  const handleSubmit = async () => {
    setError('');
    if (requiresAmount && !amount) { setError('Order amount is required.'); return; }
    if (requiresTrack  && !trackId) { setError('Tracking ID is required for Delivered status.'); return; }
    if (requiresFu     && !fuDate)  { setError('Follow-up date is required.'); return; }

    setLoading(true);
    try {
      await leadsAPI.updateStatus(lead.id, {
        status,
        remark: remark || undefined,
        order_amount:    amount  ? Number(amount) : undefined,
        tracking_id:     trackId || undefined,
        next_followup_at: fuDate || undefined,
      });
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
      open title={`Update Status — ${lead.name}`} onClose={onClose}
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
      </div>

      {/* Status buttons */}
      <div className="mb-4">
        <label className="form-label">New Status</label>
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                style={{
                  borderColor: status === s ? cfg.color : '#e5e7eb',
                  background:  status === s ? cfg.bg : '#fff',
                  color:       status === s ? cfg.color : '#6b7280',
                }}>
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional fields */}
      <div className="space-y-3">
        {requiresAmount && (
          <div>
            <label className="form-label">Order Amount (₹){requiresAmount && status !== 'in_process' && <span className="text-red-500"> *</span>}</label>
            <input type="number" className={`form-input ${!amount && error ? 'error' : ''}`}
              value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 3500" />
          </div>
        )}
        {requiresTrack && (
          <div>
            <label className="form-label">Tracking ID <span className="text-red-500">*</span></label>
            <input className={`form-input ${!trackId && error ? 'error' : ''}`}
              value={trackId} onChange={(e) => setTrackId(e.target.value)} placeholder="e.g. DTDC1234567890" />
          </div>
        )}
        {requiresFu && (
          <div>
            <label className="form-label">Follow-up Date & Time <span className="text-red-500">*</span></label>
            <input type="datetime-local" className={`form-input ${!fuDate && error ? 'error' : ''}`}
              value={fuDate} onChange={(e) => setFuDate(e.target.value)}
              min={new Date().toISOString().slice(0,16)} />
          </div>
        )}
        <div>
          <label className="form-label">Remark</label>
          <textarea className="form-textarea" value={remark} onChange={(e) => setRemark(e.target.value)}
            placeholder="Add context about this status change…" rows={2} />
        </div>
      </div>
    </Modal>
  );
}
