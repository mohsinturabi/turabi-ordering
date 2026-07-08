import type { OrderStatus } from './types';

// The brief calls out four actions — Accept, Mark Ready, Mark Completed,
// Cancel — but the schema has a distinct "Preparing" status between
// Accepted and Ready. Without a way to *enter* Preparing there'd be no
// path from Accepted to Ready, so "Start Preparing" is added here as the
// bridge. Everything else matches the brief exactly.
interface StatusRule {
  next?: { status: OrderStatus; label: string };
  canCancel: boolean;
}

export const STATUS_FLOW: Record<OrderStatus, StatusRule> = {
  Pending: { next: { status: 'Accepted', label: 'Accept' }, canCancel: true },
  Accepted: { next: { status: 'Preparing', label: 'Start preparing' }, canCancel: true },
  Preparing: { next: { status: 'Ready', label: 'Mark ready' }, canCancel: true },
  Ready: { next: { status: 'Completed', label: 'Mark completed' }, canCancel: true },
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
