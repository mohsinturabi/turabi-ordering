import type { OrderStatus } from './types';

interface StatusRule {
  next?: { status: OrderStatus; label: string };
  canCancel: boolean;
  // For a stage this screen doesn't own (e.g. Counter while Kitchen is
  // preparing) — the button still SHOWS, just disabled/dimmed, instead of
  // disappearing, so staff can see the order is "stuck" somewhere on purpose.
  pendingLabel?: string;
}

// Default flow — used when the Kitchen Dashboard is OFF. Counter/staff do
// everything from Accept through Completed themselves.
export const STATUS_FLOW: Record<OrderStatus, StatusRule> = {
  Pending: { next: { status: 'Accepted', label: 'Accept' }, canCancel: true },
  Accepted: { next: { status: 'Preparing', label: 'Start preparing' }, canCancel: true },
  Preparing: { next: { status: 'Ready', label: 'Mark ready' }, canCancel: true },
  Ready: { next: { status: 'Completed', label: 'Mark completed' }, canCancel: true },
  Completed: { canCancel: false },
  Cancelled: { canCancel: false },
};

// Counter flow when Kitchen Dashboard is ON — the kitchen staff owns
// Preparing → Ready, so Counter only Accepts and, once Ready, Completes
// (hands the order over / takes payment). No "Start preparing" step here.
export const STATUS_FLOW_COUNTER_WITH_KITCHEN: Record<OrderStatus, StatusRule> = {
  Pending: { next: { status: 'Accepted', label: 'Accept' }, canCancel: true },
  Accepted: { canCancel: true, pendingLabel: 'Preparing in kitchen…' },
  Preparing: { canCancel: false, pendingLabel: 'Preparing in kitchen…' },
  Ready: { next: { status: 'Completed', label: 'Mark completed' }, canCancel: false },
  Completed: { canCancel: false },
  Cancelled: { canCancel: false },
};

// Kitchen's own flow — they only ever see Accepted/Preparing orders and can
// move them forward. No Accept, no Cancel, no payment — that's Counter's job.
export const STATUS_FLOW_KITCHEN: Record<OrderStatus, StatusRule> = {
  Pending: { canCancel: false },
  Accepted: { next: { status: 'Preparing', label: 'Start preparing' }, canCancel: false },
  Preparing: { next: { status: 'Ready', label: 'Mark ready' }, canCancel: false },
  Ready: { canCancel: false },
  Completed: { canCancel: false },
  Cancelled: { canCancel: false },
};

export const FILTERABLE_STATUSES: { value: 'all' | OrderStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Preparing', label: 'Preparing' },
  { value: 'Ready', label: 'Ready' },
];
