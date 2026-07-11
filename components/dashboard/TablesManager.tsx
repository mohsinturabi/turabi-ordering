'use client';

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import type { RestaurantTable } from '@/lib/types';
import {
  getTablesForTenant,
  createTable,
  deleteTable,
} from '@/lib/dashboard-queries';

export default function TablesManager({
  tenantId,
  subdomain,
  logoUrl,
}: {
  tenantId: string;
  subdomain: string;
  logoUrl: string | null;
}) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function refresh() {
    const data = await getTablesForTenant(tenantId);
    setTables(data);
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  async function handleAddTable(e: React.FormEvent) {
    e.preventDefault();
    if (!newTableNumber.trim()) return;
    await createTable(tenantId, newTableNumber.trim());
    setNewTableNumber('');
    refresh();
  }

  async function handleDeleteTable(id: string) {
    if (!confirm('Delete this table? Its QR code will stop working.')) return;
    await deleteTable(id);
    refresh();
  }

  function linkFor(table: RestaurantTable) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/order/${subdomain}?t=${table.qr_token}`;
  }

  async function handleCopy(table: RestaurantTable) {
    await navigator.clipboard.writeText(linkFor(table));
    setCopiedId(table.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <form onSubmit={handleAddTable} className="flex flex-col sm:flex-row gap-3">
        <input
          value={newTableNumber}
          onChange={(e) => setNewTableNumber(e.target.value)}
          placeholder="Table number (e.g. 13)"
          className="flex-1 border-2 border-line rounded-chit px-4 py-2.5"
        />
        <button
          type="submit"
          className="whitespace-nowrap bg-ink text-paper rounded-chit px-5 py-2.5 font-semibold"
        >
          Add table
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {tables.map((table) => (
          <div
            key={table.id}
            className="border-2 border-line rounded-chit p-5 flex flex-col items-center gap-3"
          >
            <p className="font-display text-xl sm:text-2xl text-ink">Table {table.table_number}</p>

            {/* relative wrapper lets us float the logo exactly in the center */}
            <div className="relative bg-white p-3 rounded-chit border border-line">
              <QRCode value={linkFor(table)} size={160} level="H" />
              {logoUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white p-1 rounded-md">
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-9 h-9 object-cover rounded-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-muted break-all text-center">{linkFor(table)}</p>

            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => handleCopy(table)}
                className="flex-1 whitespace-nowrap border-2 border-line rounded-chit py-2 text-sm font-semibold text-ink"
              >
                {copiedId === table.id ? 'Copied!' : 'Copy link'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTable(table.id)}
                className="px-4 whitespace-nowrap border-2 border-accent text-accent rounded-chit py-2 text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
