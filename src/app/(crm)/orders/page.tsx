'use client';
// src/app/(crm)/orders/page.tsx
// Orders: Converted hone par order create hota hai (pending status)
// Status filters: pending | dispatched | delivered | cancelled

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ordersAPI } from '@/lib/api';
import { Avatar, Pagination, Empty, Skeleton, Modal, Spinner } from '@/components/ui';
import { fmtINR, fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Order } from '@/types';

type OrderStatus = 'pending' | 'dispatched' | 'delivered' | 'cancelled';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '',           label: 'All' },
  { value: 'pending',    label: '⏳ Pending' },
  { value: 'dispatched', label: '🚚 Dispatched' },
  { value: 'delivered',  label: '✅ Delivered' },
  { value: 'cancelled',  label: '❌ Cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700 border border-amber-200',
  dispatched: 'bg-blue-50 text-blue-700 border border-blue-200',
  delivered:  'bg-green-50 text-green-700 border border-green-200',
  cancelled:  'bg-orange-50 text-orange-700 border border-orange-200',
};

const PAYMENT_COLORS: Record<string, string> = {
  cod:     'bg-amber-50 text-amber-700',
  prepaid: 'bg-green-50 text-green-700',
};

export default function OrdersPage() {
  const [orders,       setOrders]       = useState<Order[]>([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  // const [statusFilter, setStatusFilter] = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
const [paymentFilter, setPaymentFilter] = useState('');
  const [repeatFilter,  setRepeatFilter]  = useState(false); // ✅ NEW
const [exporting,     setExporting]     = useState(false);
  const [dateFrom,      setDateFrom]      = useState('');
const [dateTo,        setDateTo]        = useState('');

  // Update modal — for dispatching / delivering / cancelling
  const [updateModal,  setUpdateModal]  = useState<Order | null>(null);
  const [updateForm,   setUpdateForm]   = useState({
    tracking_id: '', courier: '', dispatch_date: '',
    delivery_date: '', cancelled_date: '', new_status: '' as OrderStatus | '', remark: '',
  });
  const [updateSaving, setUpdateSaving] = useState(false);

  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // const res: any = await ordersAPI.list({ page, limit: LIMIT, status: statusFilter || undefined });
      const res: any = await ordersAPI.list({
        page, limit: LIMIT,
        status:         statusFilter  || undefined,
        payment_status: paymentFilter || undefined,
        date_from:      dateFrom      || undefined, 
        date_to:        dateTo        || undefined,
        // ✅ Pass is_repeat only when toggled on
        is_repeat:      repeatFilter  ? 'true' : undefined,
      });
      setOrders(res?.orders || []);
      setTotal(res?.total || 0);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [page, statusFilter, paymentFilter, dateFrom, dateTo, repeatFilter]);

  useEffect(() => { load(); }, [load]);

  const openUpdate = (order: Order) => {
    setUpdateModal(order);
    setUpdateForm({
      tracking_id:   order.tracking_id || '',
      courier:       order.courier || '',
      dispatch_date: '',
      delivery_date: '',
      cancelled_date: '',
      new_status: '',
      remark: '',
    });
  };

  const saveUpdate = async () => {
    if (!updateModal) return;
    if (!updateForm.new_status) { toast.error('Please select a new status'); return; }

    // Validation
    if (updateForm.new_status === 'dispatched' && !updateForm.dispatch_date) {
      toast.error('Dispatch date required'); return;
    }
    if (updateForm.new_status === 'delivered' && !updateForm.delivery_date) {
      toast.error('Delivery date required'); return;
    }
    if (updateForm.new_status === 'cancelled' && !updateForm.cancelled_date) {
      toast.error('Cancellation date required'); return;
    }

    setUpdateSaving(true);
    try {
      await ordersAPI.updateTracking(updateModal.id, {
        status:         updateForm.new_status,
        tracking_id:    updateForm.tracking_id || undefined,
        courier:        updateForm.courier || undefined,
        dispatch_date:  updateForm.dispatch_date || undefined,
        delivery_date:  updateForm.delivery_date || undefined,
        cancelled_date: updateForm.cancelled_date || undefined,
        remark:         updateForm.remark          || undefined,
      });
      toast.success('Order updated!');
      setUpdateModal(null);
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setUpdateSaving(false); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Orders</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {total} orders — Automatically created when a lead is converted
          </p>
        </div>
      </div>

      <div className="card">
        {/* Status filter chips */}
        {/* <div className="flex items-center gap-2 p-3 border-b border-gray-100 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all
                ${statusFilter === f.value
                  ? 'border-forest-DEFAULT bg-green-50 text-forest-DEFAULT'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {f.label}
            </button>
          ))}
        </div> */}

        {/* Status filter chips */}
<div className="flex items-center gap-2 p-3 border-b border-gray-100 flex-wrap">
  {/* Existing status chips — same rahenge */}
  {STATUS_FILTERS.map((f) => (
    <button key={f.value}
      onClick={() => { setStatusFilter(f.value); setPage(1); }}
      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all
        ${statusFilter === f.value
          ? 'border-forest-DEFAULT bg-green-50 text-forest-DEFAULT'
          : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
      {f.label}
    </button>
  ))}

  {/* ✅ Payment filter */}
  <span className="text-gray-200 mx-1">|</span>
  {[
    { value: '',        label: 'All Payments' },
    { value: 'cod',     label: '💵 COD' },
    { value: 'prepaid', label: '💳 Prepaid' },
  ].map((f) => (
    <button key={f.value}
      onClick={() => { setPaymentFilter(f.value); setPage(1); }}
      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all
        ${paymentFilter === f.value
          ? 'border-forest-DEFAULT bg-green-50 text-forest-DEFAULT'
          : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
      {f.label}
    </button>
  ))}

  {repeatFilter && (
  <>
    <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-[10px] font-semibold">
      ⟳ Repeat Only
    </span>

    <button
      onClick={() => {
        setRepeatFilter(false);
        setPage(1);
      }}
      className="text-xs text-red-500 hover:text-red-700"
    >
      ✕ Clear
    </button>
  </>
)}

  {/* ✅ Date range filter */}
<span className="text-gray-200 mx-1">|</span>
<div className="flex items-center gap-1.5">
  <span className="text-xs text-gray-400">From</span>
  <input
    type="date"
    className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:border-forest-DEFAULT"
    value={dateFrom}
    max={dateTo || new Date().toISOString().split('T')[0]}
    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
  />
  <span className="text-xs text-gray-400">To</span>
  <input
    type="date"
    className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:border-forest-DEFAULT"
    value={dateTo}
    min={dateFrom}
    max={new Date().toISOString().split('T')[0]}
    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
  />
  {/* Clear button — date select hone par show karo */}
  {(dateFrom || dateTo) && (
    <button
      className="text-[10px] text-gray-400 hover:text-red-500 px-1"
      onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}>
      ✕ Clear
    </button>
  )}
</div>

  {/* ✅ Export button — right side */}
  <div className="ml-auto flex gap-2">
    <button
      className="btn btn-outline btn-sm text-xs"
      disabled={exporting}
      onClick={async () => {
        setExporting(true);
        try {
          const token    = localStorage.getItem('access_token');
          const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
          const params   = new URLSearchParams({ format: 'excel' });
          if (statusFilter)  params.set('status',         statusFilter);
          if (paymentFilter) params.set('payment_status', paymentFilter);
          if (dateFrom)      params.set('date_from',        dateFrom);  
          if (dateTo)        params.set('date_to',          dateTo); 
          const res  = await fetch(`${BASE_URL}/orders/export?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Export failed');
          const blob = await res.blob();
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = `orders-${Date.now()}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        } catch { toast.error('Export failed'); }
        finally { setExporting(false); }
      }}>
      {exporting ? '...' : '↓ Excel'}
    </button>
    <button
      className="btn btn-outline btn-sm text-xs"
      disabled={exporting}
      onClick={async () => {
        setExporting(true);
        try {
          const token    = localStorage.getItem('access_token');
          const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
          const params   = new URLSearchParams({ format: 'csv' });
          if (statusFilter)  params.set('status',         statusFilter);
          if (paymentFilter) params.set('payment_status', paymentFilter);
          if (dateFrom)      params.set('date_from',        dateFrom);  
          if (dateTo)        params.set('date_to',          dateTo); 
          const res  = await fetch(`${BASE_URL}/orders/export?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Export failed');
          const blob = await res.blob();
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = `orders-${Date.now()}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } catch { toast.error('Export failed'); }
        finally { setExporting(false); }
      }}>
      {exporting ? '...' : '↓ CSV'}
    </button>
  </div>
</div>

        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
          </div>
        ) : orders.length === 0 ? (
          <Empty icon="📦" title="No orders found"
            description={statusFilter ? `No ${statusFilter} order found` : 'Orders are automatically created when a lead is converted'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Order</th>
                  <th>Agent</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Tracking</th>
                  <th>Order Date</th>
                  <th>Delivery Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><Link
        href={`/customers/${o.customer_id}`}>
                      <div className="text-sm font-medium">{o.customer_name || o.lead_name || '—'}</div>
                      <div className="text-xs text-gray-500">{o.lead_phone}</div></Link>
                    </td>
                    <td>
                      <div className="text-sm font-semibold text-gray-900 max-w-[140px] truncate">
                        {o.product_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {o.source === 'shopify' ? '🛍 Shopify' : '🏢 CRM'}
                        {o.is_repeat ? ' · Repeat' : ''}
                      </div>
                    </td>
                    <td className="text-xs text-gray-600">{o.agent_name || '—'}</td>
                    <td className="text-sm font-bold text-forest-DEFAULT">{fmtINR(o.amount)}</td>
                    <td>
                      {o.payment_status ? (
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full uppercase
                          ${PAYMENT_COLORS[o.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                          {o.payment_status}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="text-xs text-gray-600 font-mono">
                      {o.tracking_id || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="text-xs text-gray-500">{fmtDate(o.order_date)}</td>
                    <td className="text-xs text-gray-500">
                      {o.delivery_date ? fmtDate(o.delivery_date) : '—'}
                    </td>
                    <td>
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
                        ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      {/* Update button — sirf pending aur dispatched par */}
                      {['pending', 'dispatched'].includes(o.status) && (
                        <button className="btn btn-outline btn-xs" onClick={() => openUpdate(o)}>
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

        {!loading && pages > 1 && (
          <Pagination page={page} pages={pages} total={total} limit={LIMIT} onChange={setPage} />
        )}
      </div>

      {/* Update order modal */}
      {updateModal && (
        <Modal open onClose={() => setUpdateModal(null)} title={`Update Order — ${updateModal.product_name}`}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setUpdateModal(null)} disabled={updateSaving}>
                Cancel
              </button>
              <button className="btn btn-amber" onClick={saveUpdate} disabled={updateSaving}>
                {updateSaving ? <Spinner size={14} /> : 'Save Update'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Status to change to */}
            <div>
              <label className="form-label">Update Status <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap mt-1">
                {/* pending → dispatched ya cancelled */}
                {updateModal.status === 'pending' && (
                  <>
                    <button type="button"
                      onClick={() => setUpdateForm(f => ({ ...f, new_status: 'dispatched' }))}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all
                        ${updateForm.new_status === 'dispatched'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-400'}`}>
                      🚚 Dispatched
                    </button>
                    <button type="button"
                      onClick={() => setUpdateForm(f => ({ ...f, new_status: 'cancelled' }))}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all
                        ${updateForm.new_status === 'cancelled'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-400'}`}>
                      ❌ Cancelled
                    </button>
                  </>
                )}
                {/* dispatched → delivered ya cancelled */}
                {updateModal.status === 'dispatched' && (
                  <>
                    <button type="button"
                      onClick={() => setUpdateForm(f => ({ ...f, new_status: 'delivered' }))}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all
                        ${updateForm.new_status === 'delivered'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-400'}`}>
                      ✅ Delivered
                    </button>
                    <button type="button"
                      onClick={() => setUpdateForm(f => ({ ...f, new_status: 'cancelled' }))}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all
                        ${updateForm.new_status === 'cancelled'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-400'}`}>
                      ❌ Cancelled
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Dispatched fields */}
            {updateForm.new_status === 'dispatched' && (
              <>
                <div>
                  <label className="form-label">Dispatch Date <span className="text-red-500">*</span></label>
                  <input type="date" className="form-input"
                    value={updateForm.dispatch_date}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setUpdateForm(f => ({ ...f, dispatch_date: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Tracking ID</label>
                  <input className="form-input" value={updateForm.tracking_id}
                    onChange={(e) => setUpdateForm(f => ({ ...f, tracking_id: e.target.value }))}
                    placeholder="e.g. DTDC1234567890" />
                </div>
                <div>
                  <label className="form-label">Courier</label>
                  <input className="form-input" value={updateForm.courier}
                    onChange={(e) => setUpdateForm(f => ({ ...f, courier: e.target.value }))}
                    placeholder="e.g. DTDC, BlueDart, Delhivery" />
                </div>
                <div>
                <label className="form-label">Remark</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={updateForm.remark}
                  onChange={(e) => setUpdateForm(f => ({ ...f, remark: e.target.value }))}
                  placeholder="e.g. Order dispatched via courier service..."
                />
              </div>
              </>
            )}

            {/* Delivered fields */}
            {updateForm.new_status === 'delivered' && (
              <>
                <div>
                  <label className="form-label">Delivery Date <span className="text-red-500">*</span></label>
                  <input type="date" className="form-input"
                    value={updateForm.delivery_date}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setUpdateForm(f => ({ ...f, delivery_date: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Tracking ID (if not already entered)</label>
                  <input className="form-input" value={updateForm.tracking_id}
                    onChange={(e) => setUpdateForm(f => ({ ...f, tracking_id: e.target.value }))}
                    placeholder="e.g. DTDC1234567890" />
                </div>
                <div>
                  <label className="form-label">Remark</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={updateForm.remark}
                    onChange={(e) => setUpdateForm(f => ({ ...f, remark: e.target.value }))}
                    placeholder="e.g. Order successfully received by the customer..."
                  />
                </div>
              </>
            )}

            {/* Cancelled fields */}
            {/* {updateForm.new_status === 'cancelled' && (
              <div>
                <label className="form-label">Cancellation Date <span className="text-red-500">*</span></label>
                <input type="date" className="form-input"
                  value={updateForm.cancelled_date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setUpdateForm(f => ({ ...f, cancelled_date: e.target.value }))} />
              </div>
            )} */}
            {updateForm.new_status === 'cancelled' && (
              <>
                <div>
                  <label className="form-label">
                    Cancellation Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={updateForm.cancelled_date}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) =>
                      setUpdateForm(f => ({
                        ...f,
                        cancelled_date: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="form-label">Remark</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={updateForm.remark}
                    onChange={(e) =>
                      setUpdateForm(f => ({
                        ...f,
                        remark: e.target.value,
                      }))
                    }
                    placeholder="e.g. Reason for order cancellation..."
                  />
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
