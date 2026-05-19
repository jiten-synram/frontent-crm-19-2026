'use client';
// src/app/(crm)/customers/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { customersAPI } from '@/lib/api';
import { Avatar, Pagination, Empty, Skeleton, SearchInput, Modal, Spinner } from '@/components/ui';
import { fmtINR, fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Customer } from '@/types';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await customersAPI.list({ page, limit: LIMIT, search: search || undefined });
      setCustomers(res?.customers || []);
      setTotal(res?.total || 0);
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const pages = Math.ceil(total / LIMIT);
  const totalLTV = customers.reduce((s, c) => s + Number(c.lifetime_value), 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Customers</h1>
          <p className="text-xs text-gray-500 mt-0.5">{total} delivered customers · {fmtINR(totalLTV)} lifetime value</p>
        </div>
      </div>

      <div className="card">
        <div className="p-3 border-b border-gray-100">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, phone…" className="max-w-xs text-xs" />
        </div>

        {loading ? (
          <div className="p-4 space-y-3">{Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-14 rounded" />)}</div>
        ) : customers.length === 0 ? (
          <Empty icon="🤝" title="No customers yet" description="Customers are created automatically when leads are marked as Delivered" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Customer</th><th>Orders</th><th>Lifetime Value</th><th>Avg. Order</th><th>Last Purchase</th><th>Assigned</th><th></th></tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size={32} />
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">{c.total_orders}</span>
                    </td>
                    <td className="text-sm font-bold text-forest-DEFAULT">{fmtINR(c.lifetime_value)}</td>
                    <td className="text-sm text-gray-700">{fmtINR(c.avg_order_value)}</td>
                    <td className="text-xs text-gray-500">{fmtDate(c.last_purchase)}</td>
                    <td className="text-xs text-gray-600">{c.agent_name || '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-outline btn-xs" onClick={(e) => { e.stopPropagation(); router.push(`/customers/${c.id}?action=reorder`); }}>
                        + Reorder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pages > 1 && <Pagination page={page} pages={pages} total={total} limit={LIMIT} onChange={setPage} />}
      </div>
    </div>
  );
}
