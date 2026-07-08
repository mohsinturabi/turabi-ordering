'use client';

import { useEffect, useState } from 'react';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import {
  getCustomersForAdmin,
  getCustomerOrderHistory,
  type AdminCustomerRow,
  type CustomerOrderHistory,
} from '@/lib/admin-queries';
import { formatPrice } from '@/lib/format';

export default function AdminCustomersPage() {
  const { staff } = useDashboardAuth();
  const [customers, setCustomers] = useState<AdminCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminCustomerRow | null>(null);
  const [history, setHistory] = useState<CustomerOrderHistory[]>([]);

  useEffect(() => {
    if (!staff?.tenant_id) return;
    getCustomersForAdmin(staff.tenant_id).then((rows) => {
      setCustomers(rows);
      setLoading(false);
    });
  }, [staff?.tenant_id]);

  async function openCustomer(customer: AdminCustomerRow) {
    setSelected(customer);
    const rows = await getCustomerOrderHistory(customer.id);
    setHistory(rows);
  }

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink">Customers</h1>

      {!selected ? (
        customers.length === 0 ? (
          <p className="text-muted">No customers yet.</p>
        ) : (
          <div className="border border-line rounded-chit bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="p-3">Name</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Orders</th>
                  <th className="p-3">Total spent</th>
                  <th className="p-3">Last order</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openCustomer(c)}
                    className="border-b border-line last:border-0 cursor-pointer hover:bg-accent-soft"
                  >
                    <td className="p-3">{c.name}</td>
                    <td className="p-3 font-mono">{c.mobile_number}</td>
                    <td className="p-3">{c.order_count}</td>
                    <td className="p-3 font-mono">{formatPrice(c.total_spent)}</td>
                    <td className="p-3 text-xs text-muted">
                      {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-muted self-start"
          >
            ← Back to customers
          </button>
          <div>
            <p className="font-medium text-ink text-lg">{selected.name}</p>
            <p className="text-sm text-muted">{selected.mobile_number}</p>
          </div>
          <div className="border border-line rounded-chit bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="p-3">Order</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((o) => (
                  <tr key={o.order_code} className="border-b border-line last:border-0">
                    <td className="p-3 font-mono text-xs">{o.order_code}</td>
                    <td className="p-3">{o.status}</td>
                    <td className="p-3 font-mono">{formatPrice(o.total_amount)}</td>
                    <td className="p-3 text-xs text-muted">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}