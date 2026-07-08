import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in dev rather than silently returning empty data everywhere.
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase env vars are missing. Copy .env.local.example to .env.local and fill them in.'
  );
}

// Single browser client reused across the customer ordering app.
// Customers never authenticate, so this always runs with the anon key —
// RLS policies (see Phase 1) are what keep tenants' data isolated.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
