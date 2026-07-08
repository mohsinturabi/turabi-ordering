'use client';

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

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-line bg-white flex flex-col">
        <div className="p-5 border-b border-line">
          <p className="font-display text-lg text-ink">Admin Panel</p>
          <p className="text-sm text-muted mt-1">{staff?.name}</p>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}