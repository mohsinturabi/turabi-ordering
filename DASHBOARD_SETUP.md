# Counter Dashboard — Setup (Phase 3)

The dashboard lives at `/dashboard` (login at `/dashboard/login`), separate from
the customer ordering flow at `/order/[tenant]`. It requires a real Supabase
Auth account linked to a row in `staff`.

## 1. Add RLS so staff can only see their own tenant's orders

Run this in Supabase → SQL Editor. It adds a helper function that looks up the
signed-in user's `tenant_id` via their `staff` row, then uses it in policies on
`orders`, `order_items`, and `tables` so a staff login from Restaurant A can
never see Restaurant B's orders — enforced at the database level, not just
hidden in the UI.

```sql
create or replace function current_staff_tenant_id()
returns uuid
language sql
security definer
stable
as $$
  select tenant_id from staff where auth_user_id = auth.uid()
$$;

alter table orders enable row level security;
alter table order_items enable row level security;
alter table staff enable row level security;

create policy "Staff can view own tenant orders" on orders
  for select using (tenant_id = current_staff_tenant_id());

create policy "Staff can update own tenant orders" on orders
  for update using (tenant_id = current_staff_tenant_id());

create policy "Staff can view own tenant order items" on order_items
  for select using (
    order_id in (select id from orders where tenant_id = current_staff_tenant_id())
  );

create policy "Staff can view their own staff row" on staff
  for select using (auth_user_id = auth.uid());
```

If `tables` doesn't already have a public-read policy from Phase 2, staff also
need to read it (to show table numbers) — the existing "Public can view
tables" policy from Phase 2 already covers this, since it allows anyone to
read table numbers.

## 2. Create a test staff login

1. Supabase Dashboard → **Authentication → Users → Add user**. Set an email
   and password (e.g. `staff@demo-restaurant.test`). Copy the generated user's
   **UID**.
2. In SQL Editor, link that user to your demo restaurant:

```sql
insert into staff (tenant_id, name, role, auth_user_id)
values (
  'PASTE_YOUR_RESTAURANT_ID',   -- same restaurants.id from Phase 2 setup
  'Demo Staff',
  'owner',
  'PASTE_THE_AUTH_USER_UID'
);
```

3. Go to `http://localhost:3000/dashboard/login` and sign in with that email
   and password.

## What you'll see

- Orders for your restaurant only, newest first, with table number, customer
  mobile, items, total, and payment info on each card.
- One button for the valid next status, plus Cancel where applicable (see
  `lib/order-status.ts` for the exact flow — note "Start preparing" was added
  as the bridge between Accepted and Ready, since the schema has a distinct
  Preparing status the brief's four named actions didn't otherwise reach).
- A "🔔 Enable sound" button — tap it once per session; browsers block audio
  until a user has interacted with the page, so this unlocks the chime that
  plays when a new order lands.
- Filter tabs: All / Pending / Accepted / Preparing / Ready. (Completed and
  Cancelled orders drop off the board entirely rather than cluttering it —
  add a "History" view later if staff need to look them up.)

## Where Phase 4 plugs in

`components/dashboard/DashboardView.tsx` currently polls every 4 seconds —
marked with a `TODO (Phase 4)` comment showing exactly where to swap in a
`supabase.channel(...).on('postgres_changes', ...)` subscription instead.
