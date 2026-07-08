'use client';

import { useEffect, useState } from 'react';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import { getOrdersForAdmin, type AdminOrderRow } from '@/lib/admin-queries';
import { formatPrice } from '@/lib/format';

const STATUS_OPTIONS = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled'];

export default function AdminOrdersPage() {
  const { staff } = useDashboardAuth();
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  async function loadOrders() {
    if (!staff?.tenant_id) return;
    setLoading(true);
    const rows = await getOrdersForAdmin(staff.tenant_id, {
      search: search || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
    });
    setOrders(rows);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.tenant_id]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink">Orders</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Search (Order ID or mobile)</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ORD-... or 98765..."
            className="border border-line rounded-chit px-3 py-2 bg-white text-sm w-56"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-line rounded-chit px-3 py-2 bg-white text-sm"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">From date</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-line rounded-chit px-3 py-2 bg-white text-sm"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">To date</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-line rounded-chit px-3 py-2 bg-white text-sm"
          />
        </label>

        <button
          onClick={loadOrders}
          className="bg-ink text-paper rounded-chit px-4 py-2 text-sm font-medium"
        >
          Apply
        </button>
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-muted">No orders found.</p>
      ) : (
        <div className="border border-line rounded-chit bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="p-3">Order</th>
                <th className="p-3">Table</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Status</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="p-3 font-mono text-xs">{o.order_code}</td>
                  <td className="p-3">{o.table_number ?? '—'}</td>
                  <td className="p-3">
                    {o.customer_name ?? '—'}
                    <br />
                    <span className="text-xs text-muted">{o.customer_mobile ?? ''}</span>
                  </td>
                  <td className="p-3">{o.status}</td>
                  <td className="p-3">
                    {o.payment_method} · {o.payment_status}
                  </td>
                  <td className="p-3 font-mono">{formatPrice(o.total_amount)}</td>
                  <td className="p-3 text-xs text-muted">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}