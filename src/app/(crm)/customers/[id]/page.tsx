'use client';
// src/app/(crm)/customers/[id]/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { customersAPI } from '@/lib/api';
import { Avatar, Modal, Spinner, InfoRow, StatCard } from '@/components/ui';
import { fmtINR, fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Customer, Purchase } from '@/types';

// ── Edit form type ────────────────────────────────────────────────
interface EditForm {
  name:             string;
  phone:            string;
  alt_phone:        string;
  email:            string;
  city:             string;
  state:            string;
  shipping_address: string;
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const sp     = useSearchParams();

  const [customer,      setCustomer]      = useState<Customer | null>(null);
  const [loading,       setLoading]       = useState(true);

  // ── Reorder modal state ──────────────────────────────────────
  const [reorderOpen,   setReorderOpen]   = useState(sp.get('action') === 'reorder');
  const [reorderSaving, setReorderSaving] = useState(false);
  const [reorderError,  setReorderError]  = useState('');
  const [reorderForm,   setReorderForm]   = useState({
    product_name:     '',
    amount:           '',
    tracking_id:      '',
    payment_status:   '' as 'cod' | 'prepaid' | '',
    shipping_address: '',
    remark:           '',
    order_date:       new Date().toISOString().split('T')[0],
    dispatched_date:  '',
  });

  // ── Cancel order modal state ─────────────────────────────────
  const [cancelOrder,  setCancelOrder]  = useState<Purchase | null>(null);
  const [cancelDate,   setCancelDate]   = useState(new Date().toISOString().split('T')[0]);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelRemark, setCancelRemark] = useState('');

  // ── Edit customer modal state ────────────────────────────────
  const [editOpen,   setEditOpen]   = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editForm,   setEditForm]   = useState<EditForm>({
    name:             '',
    phone:            '',
    alt_phone:        '',
    email:            '',
    city:             '',
    state:            '',
    shipping_address: '',
  });

  // ── Load customer ────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await customersAPI.get(Number(id));
      setCustomer(res?.customer);
    } catch {
      toast.error('Customer not found');
      router.push('/customers');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Open edit modal — pre-fill with current values ───────────
  const openEdit = () => {
    if (!customer) return;
    setEditForm({
      name:             customer.name             || '',
      phone:            customer.phone            || '',
      alt_phone:        customer.alt_phone        || '',
      email:            customer.email            || '',
      city:             customer.city             || '',
      state:            customer.state            || '',
      shipping_address: (customer as any).shipping_address || '',
    });
    setEditErrors({});
    setEditOpen(true);
  };

  // ── Edit form field setter ───────────────────────────────────
  const setEF = (k: keyof EditForm, v: string) => {
    setEditForm(f => ({ ...f, [k]: v }));
    if (editErrors[k]) setEditErrors(e => ({ ...e, [k]: '' }));
  };

  // ── Validate edit form ───────────────────────────────────────
  const validateEdit = (): boolean => {
    const e: Record<string, string> = {};
    if (!editForm.name.trim())  e.name  = 'Name is required.';
    if (!editForm.phone.trim()) e.phone = 'Phone is required.';
    else if (editForm.phone.replace(/\D/g, '').length < 10)
      e.phone = 'Enter a valid 10-digit phone number.';
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save customer edit ───────────────────────────────────────
  const saveEdit = async () => {
    if (!validateEdit()) return;
    setEditSaving(true);
    try {
      await customersAPI.update(Number(id), {
        name:             editForm.name.trim(),
        phone:            editForm.phone.trim(),
        alt_phone:        editForm.alt_phone.trim()        || null,
        email:            editForm.email.trim().toLowerCase() || null,
        city:             editForm.city.trim()             || null,
        state:            editForm.state.trim()            || null,
        shipping_address: editForm.shipping_address.trim() || null,
      });
      toast.success('Customer details updated');
      setEditOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update customer');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Open reorder modal — auto-fill from last purchase ────────
  const openReorder = () => {
    const purchases = ((customer as any)?.purchases || []) as any[];
    const lastOrder = purchases.find((p: any) => p.status === 'delivered') || purchases[0];
    setReorderForm({
      product_name:     lastOrder?.product_name  || '',
      amount:           lastOrder?.amount ? String(lastOrder.amount) : '',
      tracking_id:      '',
      payment_status:   lastOrder?.payment_status || '',
      shipping_address: (customer as any)?.shipping_address || '',
      remark:           '',
      order_date:       new Date().toISOString().split('T')[0],
      dispatched_date:  '',
    });
    setReorderError('');
    setReorderOpen(true);
  };

  // ── Submit reorder ───────────────────────────────────────────
  const submitReorder = async () => {
    if (!reorderForm.product_name.trim()) { setReorderError('Product name required.'); return; }
    if (!reorderForm.amount)              { setReorderError('Amount required.'); return; }
    if (!reorderForm.payment_status)      { setReorderError('Payment status (COD/Prepaid) required.'); return; }
    setReorderSaving(true); setReorderError('');
    try {
      await customersAPI.reorder(Number(id), {
        product_name:     reorderForm.product_name,
        amount:           Number(reorderForm.amount),
        tracking_id:      reorderForm.tracking_id      || undefined,
        payment_status:   reorderForm.payment_status,
        shipping_address: reorderForm.shipping_address || undefined,
        remark:           reorderForm.remark           || undefined,
        order_date:       reorderForm.order_date,
        dispatched_date:  reorderForm.dispatched_date  || undefined,
      });
      toast.success('Reorder created!');
      setReorderOpen(false);
      await load();
    } catch (e: any) {
      setReorderError(e?.message || 'Failed');
    } finally {
      setReorderSaving(false);
    }
  };

  // ── Submit cancel order ──────────────────────────────────────
  const submitCancel = async () => {
    if (!cancelOrder?.order_id) { toast.error('Order ID missing'); return; }
    if (!cancelDate)             { toast.error('Cancellation date required'); return; }
    setCancelSaving(true);
    try {
      await customersAPI.cancelOrder(Number(id), (cancelOrder as any).order_id, {
        cancelled_date: cancelDate,
        remark: cancelRemark || null,
      } as any);
      toast.success('Order cancelled!');
      setCancelOrder(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setCancelSaving(false);
    }
  };

  // ── Loading skeleton ─────────────────────────────────────────
  if (loading) return (
    <div className="space-y-4">
      <div className="h-7 w-48 skeleton rounded mb-4" />
      <div className="grid grid-cols-4 gap-3 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 skeleton rounded-xl" />
        ))}
      </div>
      <div className="h-64 skeleton rounded-xl" />
    </div>
  );
  if (!customer) return null;

  const purchases = ((customer as any).purchases || []) as any[];

  return (
    <div>
      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5">
        <button className="btn btn-ghost btn-sm text-xs" onClick={() => router.push('/customers')}>
          ← Customers
        </button>
        <span className="text-gray-400 text-sm">/</span>
        <span className="text-sm font-medium text-gray-700">{customer.name}</span>
        {(customer as any).shopify_cust_id && (
          <span className="badge bg-green-50 text-green-800 text-xs">Shopify</span>
        )}
        <div className="ml-auto flex gap-2">
          <button className="btn btn-outline text-xs" onClick={openEdit}>
            ✏️ Edit Details
          </button>
          <button className="btn btn-amber text-xs" onClick={openReorder}>
            + Add Reorder
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Orders"   value={customer.total_orders}            icon="📦" color="green"  />
        <StatCard label="Lifetime Value" value={fmtINR(customer.lifetime_value)}  icon="💰" color="amber"  />
        <StatCard label="Avg. Order"     value={fmtINR(customer.avg_order_value)} icon="📊" color="blue"   />
        <StatCard label="Last Purchase"  value={fmtDate(customer.last_purchase)}  icon="🗓️" color="purple" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* ── Customer Info card ────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-forest-DEFAULT">Customer Info</span>
            <button
              className="btn btn-ghost btn-xs text-xs text-green-800 hover:bg-green-50"
              onClick={openEdit}
            >
              ✏️ Edit
            </button>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar name={customer.name} size={44} />
              <div>
                <div className="font-bold text-gray-900">{customer.name}</div>
                <div className="text-xs text-gray-500">{customer.phone}</div>
              </div>
            </div>
            <InfoRow label="Phone"            value={customer.phone} />
            <InfoRow label="Alt. Phone"       value={customer.alt_phone} />
            <InfoRow label="Email"            value={customer.email} />
            <InfoRow label="City"             value={[customer.city, customer.state].filter(Boolean).join(', ')} />
            <InfoRow label="Shipping Address" value={(customer as any).shipping_address} />
            <InfoRow label="Assigned To"      value={(customer as any).agent_name} />
            <InfoRow label="First Purchase"   value={fmtDate(customer.first_purchase)} />
            <InfoRow label="Customer Since"   value={fmtDate(customer.created_at)} />
          </div>
        </div>

        {/* ── Purchase History ─────────────────────────────── */}
        <div className="card col-span-2">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-forest-DEFAULT">
              Purchase History ({purchases.length})
            </span>
          </div>
          <div className="p-4">
            {purchases.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No purchases yet</p>
            ) : (
              <div className="space-y-3">
                {purchases.map((p: any, i: number) => (
                  <div key={p.id || i}
                    className={`rounded-xl border p-3 transition-all
                      ${p.status === 'cancelled'  ? 'border-red-100   bg-red-50/30   opacity-75'
                      : p.status === 'delivered'  ? 'border-green-100 bg-green-50/20'
                      : p.status === 'dispatched' ? 'border-blue-100  bg-blue-50/20'
                      :                             'border-amber-100 bg-amber-50/20'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left */}
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-white border border-gray-100">
                          {p.status === 'cancelled'  ? '❌'
                          : p.status === 'delivered'  ? '✅'
                          : p.status === 'dispatched' ? '🚚'
                          :                             '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {p.product_name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-500">
                              Order: {fmtDate(p.order_date)}
                            </span>
                            {p.payment_status && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase
                                ${p.payment_status === 'cod'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                {p.payment_status === 'cod' ? '💵 COD' : '💳 Prepaid'}
                              </span>
                            )}
                            {p.source === 'shopify' && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full border border-indigo-100">
                                Shopify
                              </span>
                            )}
                          </div>
                          {p.tracking_id && (
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                              🔖 {p.tracking_id}
                            </div>
                          )}
                          {p.shipping_address && (
                            <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-xs">
                              📍 {p.shipping_address}
                            </div>
                          )}
                          {p.delivery_date && p.status === 'delivered' && (
                            <div className="text-[10px] text-emerald-600 font-medium mt-1">
                              ✅ Delivered: {fmtDate(p.delivery_date)}
                            </div>
                          )}
                          {p.cancelled_date && p.status === 'cancelled' && (
                            <div className="text-[10px] text-red-500 font-medium mt-1">
                              ❌ Cancelled: {fmtDate(p.cancelled_date)}
                            </div>
                          )}
                          {p.remark && (
                            <div className="text-[10px] text-gray-500 mt-1">
                              💬 {p.remark}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <div className="text-sm font-bold text-forest-DEFAULT">
                          {fmtINR(p.amount)}
                        </div>
                        <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full capitalize
                          ${p.status === 'delivered'  ? 'bg-green-100  text-green-700'
                          : p.status === 'cancelled'  ? 'bg-red-100    text-red-600'
                          : p.status === 'dispatched' ? 'bg-blue-100   text-blue-700'
                          :                             'bg-amber-100  text-amber-700'}`}>
                          {p.status}
                        </span>
                         
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          EDIT CUSTOMER MODAL
      ══════════════════════════════════════════════════════ */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit Customer — ${customer.name}`}
        size="lg"
        footer={
          <>
            <button
              className="btn btn-outline"
              onClick={() => setEditOpen(false)}
              disabled={editSaving}
            >
              Cancel
            </button>
            <button
              className="btn btn-amber"
              onClick={saveEdit}
              disabled={editSaving}
            >
              {editSaving
                ? <><Spinner size={14} /> Saving…</>
                : '💾 Save Changes'
              }
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="form-label">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              className={`form-input ${editErrors.name ? 'error' : ''}`}
              value={editForm.name}
              onChange={(e) => setEF('name', e.target.value)}
              placeholder="Patient full name" readOnly
            />
            {editErrors.name && <p className="form-error">{editErrors.name}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="form-label">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              className={`form-input ${editErrors.phone ? 'error' : ''}`}
              value={editForm.phone}
              onChange={(e) => setEF('phone', e.target.value)}
              placeholder="10-digit mobile"
              type="tel"
            />
            {editErrors.phone && <p className="form-error">{editErrors.phone}</p>}
          </div>

          {/* Alt Phone */}
          <div>
            <label className="form-label">Alternate Phone</label>
            <input
              className="form-input"
              value={editForm.alt_phone}
              onChange={(e) => setEF('alt_phone', e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* Email */}
          <div>
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={editForm.email}
              onChange={(e) => setEF('email', e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* City */}
          <div>
            <label className="form-label">City</label>
            <input
              className="form-input"
              value={editForm.city}
              onChange={(e) => setEF('city', e.target.value)}
              placeholder="e.g. Bhopal"
            />
          </div>

          {/* State */}
          <div>
            <label className="form-label">State</label>
            <input
              className="form-input"
              value={editForm.state}
              onChange={(e) => setEF('state', e.target.value)}
              placeholder="e.g. Madhya Pradesh"
            />
          </div>

          {/* Shipping Address */}
          <div className="col-span-2">
            <label className="form-label">Shipping Address</label>
            <textarea
              className="form-textarea"
              value={editForm.shipping_address}
              onChange={(e) => setEF('shipping_address', e.target.value)}
              placeholder="Full delivery address for orders…"
              rows={2}
            />
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          REORDER MODAL
      ══════════════════════════════════════════════════════ */}
      <Modal
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        title={`Add Reorder — ${customer.name}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setReorderOpen(false)} disabled={reorderSaving}>
              Cancel
            </button>
            <button className="btn btn-amber" onClick={submitReorder} disabled={reorderSaving}>
              {reorderSaving ? <Spinner size={14} /> : 'Add Reorder'}
            </button>
          </>
        }
      >
        {reorderError && (
          <div className="alert alert-red text-xs mb-3">{reorderError}</div>
        )}
        {reorderForm.product_name && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 mb-3">
            ✨ Auto-filled from previous order — update if needed.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="form-label">Product Name <span className="text-red-500">*</span></label>
            <input
              className="form-input"
              value={reorderForm.product_name}
              onChange={(e) => setReorderForm(f => ({ ...f, product_name: e.target.value }))}
              placeholder="e.g. Kidney Care 3-Month Package"
            />
          </div>
          <div>
            <label className="form-label">Amount (₹) <span className="text-red-500">*</span></label>
            <input
              type="number"
              className="form-input"
              value={reorderForm.amount}
              onChange={(e) => setReorderForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 3500"
            />
          </div>
          <div>
            <label className="form-label">Payment Status <span className="text-red-500">*</span></label>
            <div className="flex gap-2 mt-1">
              {(['cod', 'prepaid'] as const).map((pm) => (
                <button
                  key={pm} type="button"
                  onClick={() => setReorderForm(f => ({ ...f, payment_status: pm }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all uppercase
                    ${reorderForm.payment_status === pm
                      ? pm === 'cod'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                >
                  {pm === 'cod' ? '💵 COD' : '💳 Prepaid'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Tracking ID</label>
            <input
              className="form-input"
              value={reorderForm.tracking_id}
              onChange={(e) => setReorderForm(f => ({ ...f, tracking_id: e.target.value }))}
              placeholder="e.g. DTDC123"
            />
          </div>
          <div>
            <label className="form-label">Order Date</label>
            <input
              type="date"
              className="form-input"
              value={reorderForm.order_date}
              onChange={(e) => setReorderForm(f => ({ ...f, order_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label">
              Dispatched Date
              <span className="text-xs text-gray-400 ml-1">(Optional)</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={reorderForm.dispatched_date}
              onChange={(e) => setReorderForm(f => ({ ...f, dispatched_date: e.target.value }))}
            />
          </div>
          <div className="col-span-2">
            <label className="form-label">Remark</label>
            <textarea
              className="form-textarea"
              value={reorderForm.remark}
              onChange={(e) => setReorderForm(f => ({ ...f, remark: e.target.value }))}
              placeholder="Dispatch details / special note…"
              rows={2}
            />
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          CANCEL ORDER MODAL
      ══════════════════════════════════════════════════════ */}
      {cancelOrder && (
        <Modal
          open
          onClose={() => setCancelOrder(null)}
          title="Cancel Order"
          footer={
            <>
              <button
                className="btn btn-outline"
                onClick={() => setCancelOrder(null)}
                disabled={cancelSaving}
              >
                Back
              </button>
              <button
                className="btn btn-danger"
                onClick={submitCancel}
                disabled={cancelSaving}
              >
                {cancelSaving ? <Spinner size={14} /> : 'Confirm Cancel'}
              </button>
            </>
          }
        >
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 mb-4">
            <div className="text-sm font-semibold text-gray-900">
              {cancelOrder.product_name}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-bold text-forest-DEFAULT">
                {fmtINR(cancelOrder.amount)}
              </span>
              {(cancelOrder as any).payment_status && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase
                  ${(cancelOrder as any).payment_status === 'cod'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-green-50 text-green-700'}`}>
                  {(cancelOrder as any).payment_status}
                </span>
              )}
              <span className="text-xs text-gray-500">
                · {fmtDate(cancelOrder.order_date)}
              </span>
            </div>
            {cancelOrder.status === 'delivered' && (
              <div className="mt-2 text-xs text-orange-600 font-medium bg-orange-50 rounded-lg px-2 py-1.5">
                ⚠️ This order has already been delivered — customer revenue will be adjusted.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="form-label">
                Cancellation Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={cancelDate}
                onChange={(e) => setCancelDate(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Remark</label>
              <textarea
                className="form-textarea"
                value={cancelRemark}
                onChange={(e) => setCancelRemark(e.target.value)}
                placeholder="Cancellation reason…"
                rows={2}
              />
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            ⚡ Only this order will be cancelled — all other orders remain unchanged.
          </p>
        </Modal>
      )}
    </div>
  );
}
