// Client-side persistence for the ordering flow.
//
// Nothing here is sensitive — no login exists, so there's nothing to protect
// beyond "don't make the customer retype things after a refresh." Everything
// is scoped per-tenant so a customer visiting two different restaurants on
// the same device doesn't get their carts mixed up.
//
// Requirements this satisfies (Phase 2, steps 9-12):
//   - table_number survives refresh via the URL, not storage (see page.tsx)
//   - mobile_number persisted here
//   - cart persisted here, cleared only after a successful order
//   - the *placed order* is never read from here — /order/track/[orderCode]
//     always re-fetches from Supabase, so tracking survives a closed tab or
//     a different device entirely.
//
// Cart is additionally scoped by QR token (table or counter) — this
// prevents two different tables (or a table and the counter) sharing a
// cart when opened on the same device/browser.

import type { CartLine } from './types';

const keyFor = (tenantSlug: string, name: string) => `turabi:${tenantSlug}:${name}`;
const cartKeyFor = (tenantSlug: string, token: string, name: string) =>
  `turabi:${tenantSlug}:${token || 'none'}:${name}`;

export function getMobileNumber(tenantSlug: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(keyFor(tenantSlug, 'mobile'));
}

export function setMobileNumber(tenantSlug: string, mobile: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(keyFor(tenantSlug, 'mobile'), mobile);
}
export function getCustomerName(tenantSlug: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(keyFor(tenantSlug, 'name'));
}

export function setCustomerName(tenantSlug: string, name: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(keyFor(tenantSlug, 'name'), name);
}

export function getCart(tenantSlug: string, token: string): CartLine[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(cartKeyFor(tenantSlug, token, 'cart'));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCart(tenantSlug: string, token: string, cart: CartLine[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(cartKeyFor(tenantSlug, token, 'cart'), JSON.stringify(cart));
}

export function clearCart(tenantSlug: string, token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(cartKeyFor(tenantSlug, token, 'cart'));
}