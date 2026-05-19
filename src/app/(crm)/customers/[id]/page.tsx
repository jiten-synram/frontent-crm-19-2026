'use client';
// src/app/(crm)/customers/[id]/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { customersAPI } from '@/lib/api';
import { Avatar, Modal, Spinner, InfoRow, StatCard } from '@/components/ui';
import { fmtINR, fmtDate, fmtDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Customer } from '@/types';

export default function CustomerDetailPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const sp       = useSearchParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading]   = useState(true);
  const [reorderOpen, setReorderOpen] = useState(sp.get('action') === 'reorder');
  const [reorderForm, setReorderForm] = useState({ product_name:'', amount:'', tracking_id:'', order_date: new Date().toISOString().split('T')[0], delivery_date:'' });
  const [reorderSaving, setReorderSaving] = useState(false);
  const [reorderError,  setReorderError]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await customersAPI.get(Number(id));
      setCustomer(res?.customer);
    } catch { toast.error('Customer not found'); router.push('/customers'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const submitReorder = async () => {
    if (!reorderForm.product_name.trim()) { setReorderError('Product name is required.'); return; }
    if (!reorderForm.amount) { setReorderError('Amount is required.'); return; }
    setReorderSaving(true); setReorderError('');
    try {
      await customersAPI.reorder(Number(id), {
        product_name: reorderForm.product_name,
        amount:       Number(reorderForm.amount),
        tracking_id:  reorderForm.tracking_id || undefined,
        order_date:   reorderForm.order_date,
        delivery_date: reorderForm.delivery_date || undefined,
      });
      toast.success('Reorder created successfully');
      setReorderOpen(false);
      setReorderForm({ product_name:'', amount:'', tracking_id:'', order_date: new Date().toISOString().split('T')[0], delivery_date:'' });
      await load();
    } catch (e: any) { setReorderError(e?.message || 'Failed'); }
    finally { setReorderSaving(false); }
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="h-7 w-48 skeleton rounded mb-4" />
      <div className="grid grid-cols-4 gap-3 mb-4">{Array.from({length:4}).map((_,i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
      <div className="h-64 skeleton rounded-xl" />
    </div>
  );
  if (!customer) return null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <button className="btn btn-ghost btn-sm text-xs" onClick={() => router.push('/customers')}>← Customers</button>
        <span className="text-gray-400 text-sm">/</span>
        <span className="text-sm font-medium text-gray-700">{customer.name}</span>
        {customer.shopify_cust_id && <span className="badge bg-green-50 text-green-800 text-xs">Shopify</span>}
        <div className="ml-auto">
          <button className="btn btn-amber text-xs" onClick={() => setReorderOpen(true)}>+ Add Reorder</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Orders"    value={customer.total_orders}          icon="📦" color="green" />
        <StatCard label="Lifetime Value"  value={fmtINR(customer.lifetime_value)} icon="💰" color="amber" />
        <StatCard label="Avg. Order"      value={fmtINR(customer.avg_order_value)}icon="📊" color="blue" />
        <StatCard label="Last Purchase"   value={fmtDate(customer.last_purchase)} icon="🗓️" color="purple" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Customer info */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-forest-DEFAULT">Customer Info</span>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar name={customer.name} size={44} />
              <div>
                <div className="font-bold text-gray-900">{customer.name}</div>
                <div className="text-xs text-gray-500">{customer.phone}</div>
              </div>
            </div>
            <InfoRow label="Phone"       value={customer.phone} />
            <InfoRow label="Alt. Phone"  value={customer.alt_phone} />
            <InfoRow label="Email"       value={customer.email} />
            <InfoRow label="City"        value={[customer.city, customer.state].filter(Boolean).join(', ')} />
            <InfoRow label="Assigned To" value={customer.agent_name} />
            <InfoRow label="Shopify ID"  value={customer.shopify_cust_id || 'Not linked'} />
            <InfoRow label="First Purchase" value={fmtDate(customer.first_purchase)} />
            <InfoRow label="Customer Since" value={fmtDate(customer.created_at)} />
          </div>
        </div>

        {/* Purchase history */}
        <div className="card col-span-2">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-forest-DEFAULT">Purchase History ({customer.purchases?.length || 0})</span>
          </div>
          <div className="p-4">
            {(customer.purchases || []).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No purchases yet</p>
            ) : (
              <div className="space-y-3">
                {customer.purchases?.map((p, i) => (
                  <div key={p.id || i} className="flex items-center gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-base flex-shrink-0">📦</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{p.product_name}</div>
                      <div className="text-xs text-gray-500">
                        {fmtDate(p.order_date)}
                        {p.tracking_id && ` · ${p.tracking_id}`}
                        {p.source === 'shopify' && ' · Shopify'}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-forest-DEFAULT">{fmtINR(p.amount)}</div>
                      <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full ${p.status === 'delivered' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reorder modal */}
      <Modal open={reorderOpen} onClose={() => setReorderOpen(false)} title={`Add Reorder — ${customer.name}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setReorderOpen(false)} disabled={reorderSaving}>Cancel</button>
            <button className="btn btn-amber" onClick={submitReorder} disabled={reorderSaving}>
              {reorderSaving ? <Spinner size={14} /> : 'Add Reorder'}
            </button>
          </>
        }
      >
        {reorderError && <div className="alert alert-red text-xs mb-3">{reorderError}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="form-label">Product Name <span className="text-red-500">*</span></label>
            <input className="form-input" value={reorderForm.product_name}
              onChange={(e) => setReorderForm(f=>({...f, product_name: e.target.value}))}
              placeholder="e.g. Kidney Care 3-Month Package" />
          </div>
          <div>
            <label className="form-label">Amount (₹) <span className="text-red-500">*</span></label>
            <input type="number" className="form-input" value={reorderForm.amount}
              onChange={(e) => setReorderForm(f=>({...f, amount: e.target.value}))} placeholder="e.g. 3500" />
          </div>
          <div>
            <label className="form-label">Tracking ID</label>
            <input className="form-input" value={reorderForm.tracking_id}
              onChange={(e) => setReorderForm(f=>({...f, tracking_id: e.target.value}))} placeholder="e.g. DTDC123" />
          </div>
          <div>
            <label className="form-label">Order Date</label>
            <input type="date" className="form-input" value={reorderForm.order_date}
              onChange={(e) => setReorderForm(f=>({...f, order_date: e.target.value}))} />
          </div>
          <div>
            <label className="form-label">Delivery Date</label>
            <input type="date" className="form-input" value={reorderForm.delivery_date}
              onChange={(e) => setReorderForm(f=>({...f, delivery_date: e.target.value}))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
