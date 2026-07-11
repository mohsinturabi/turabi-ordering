'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboardAuth } from '@/lib/dashboard-auth';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/settings', label: 'Restaurant Settings' },
  { href: '/admin/menu', label: 'Menu' },
  { href: '/admin/tables', label: 'Tables' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/staff', label: 'Staff' },
  { href: '/admin/qr', label: 'QR & Link' },
  { href: '/admin/payments', label: 'Payments' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { staff, signOut } = useDashboardAuth();
  const [open, setOpen] = useState(false);

  const currentLabel = NAV_ITEMS.find((item) => item.href === pathname)?.label ?? 'Admin Panel';

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile / tablet top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 -ml-2 rounded-chit hover:bg-accent-soft"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <p className="font-display text-base text-ink truncate">{currentLabel}</p>
        <div className="w-8" />
      </header>

      {/* Overlay backdrop for mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar: drawer on mobile/tablet, static on desktop */}
      <aside
        className={[
          'fixed z-50 inset-y-0 left-0 w-64 bg-white border-r border-line flex flex-col transition-transform duration-200',
          'lg:static lg:z-auto lg:w-56 lg:shrink-0 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="p-5 border-b border-line flex items-center justify-between">
          <div>
            <p className="font-display text-lg text-ink">Admin Panel</p>
            <p className="text-sm text-muted mt-1">{staff?.name}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="lg:hidden p-2 -mr-2 rounded-chit hover:bg-accent-soft"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={[
                  'px-3 py-2 rounded-chit text-sm',
                  active ? 'bg-ink text-paper' : 'text-ink hover:bg-accent-soft',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-line">
          <button
            onClick={signOut}
            className="w-full text-left px-3 py-2 rounded-chit text-sm text-muted hover:bg-accent-soft"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
