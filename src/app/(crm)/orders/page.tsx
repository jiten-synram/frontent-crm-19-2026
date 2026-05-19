'use client';
// src/app/(crm)/orders/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ordersAPI } from '@/lib/api';
import { Avatar, Pagination, Empty, Skeleton, Modal, Spinner } from '@/components/ui';
import { fmtINR, fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Order } from '@/types';

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders]   = useState<Order[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [trackModal, setTrackModal]     = useState<Order | null>(null);
  const [trackForm,  setTrackForm]      = useState({ tracking_id:'', courier:'', delivery_date:'' });
  const [trackSaving, setTrackSaving]   = useState(false);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await ordersAPI.list({ page, limit: LIMIT, status: statusFilter || undefined });
      setOrders(res?.orders || []);
      setTotal(res?.total || 0);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const saveTracking = async () => {
    if (!trackModal) return;
    setTrackSaving(true);
    try {
      await ordersAPI.updateTracking(trackModal.id, {
        tracking_id:   trackForm.tracking_id || undefined,
        courier:       trackForm.courier || undefined,
        delivery_date: trackForm.delivery_date || undefined,
      });
      toast.success('Tracking updated');
      setTrackModal(null);
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setTrackSaving(false); }
  };

  const pages = Math.ceil(total / LIMIT);
  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700', dispatched: 'bg-blue-50 text-blue-700',
    delivered: 'bg-green-50 text-green-700', returned: 'bg-red-50 text-red-700', cancelled: 'bg-gray-100 text-gray-500',
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Orders</h1>
          <p className="text-xs text-gray-500 mt-0.5">{total} orders total</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 p-3 border-b border-gray-100 flex-wrap">
          {['','pending','dispatched','delivered','returned','cancelled'].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${statusFilter === s ? 'border-forest-DEFAULT bg-green-50 text-forest-DEFAULT' : 'border-gray-200 text-gray-600'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-4 space-y-3">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-12 rounded"/>)}</div>
        ) : orders.length === 0 ? (
          <Empty icon="📦" title="No orders found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Agent</th><th>Amount</th><th>Tracking</th><th>Order Date</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div className="text-sm font-semibold text-gray-900 max-w-[140px] truncate">{o.product_name}</div>
                      <div className="text-xs text-gray-500">{o.source === 'shopify' ? '🛍 Shopify' : '🏢 CRM'}{o.is_repeat ? ' · Repeat' : ''}</div>
                    </td>
                    <td>
                      <div className="text-sm font-medium">{o.customer_name || o.lead_name || '—'}</div>
                      <div className="text-xs text-gray-500">{o.lead_phone}</div>
                    </td>
                    <td className="text-xs text-gray-600">{o.agent_name || '—'}</td>
                    <td className="text-sm font-bold text-forest-DEFAULT">{fmtINR(o.amount)}</td>
                    <td className="text-xs text-gray-600 font-mono">{o.tracking_id || <span className="text-gray-300">—</span>}</td>
                    <td className="text-xs text-gray-500">{fmtDate(o.order_date)}</td>
                    <td>
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      {['pending','dispatched'].includes(o.status) && (
                        <button className="btn btn-outline btn-xs"
                          onClick={() => { setTrackModal(o); setTrackForm({ tracking_id: o.tracking_id||'', courier: o.courier||'', delivery_date: '' }); }}>
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pages > 1 && <Pagination page={page} pages={pages} total={total} limit={LIMIT} onChange={setPage} />}
      </div>

      {/* Tracking modal */}
      <Modal open={!!trackModal} onClose={() => setTrackModal(null)} title="Update Tracking"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setTrackModal(null)} disabled={trackSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={saveTracking} disabled={trackSaving}>
              {trackSaving ? <Spinner size={14} /> : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="form-label">Tracking ID</label>
            <input className="form-input" value={trackForm.tracking_id} onChange={(e) => setTrackForm(f=>({...f,tracking_id:e.target.value}))} placeholder="e.g. DTDC1234567890" />
          </div>
          <div>
            <label className="form-label">Courier</label>
            <input className="form-input" value={trackForm.courier} onChange={(e) => setTrackForm(f=>({...f,courier:e.target.value}))} placeholder="e.g. DTDC, BlueDart, Delhivery" />
          </div>
          <div>
            <label className="form-label">Delivery Date (marks as Delivered)</label>
            <input type="date" className="form-input" value={trackForm.delivery_date} onChange={(e) => setTrackForm(f=>({...f,delivery_date:e.target.value}))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
