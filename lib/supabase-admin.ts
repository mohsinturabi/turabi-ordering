import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    'Supabase admin env vars are missing. Add SUPABASE_SERVICE_ROLE_KEY to .env.local ' +
      '(Dashboard -> Project Settings -> API -> service_role key). NEVER expose this key ' +
      'to the browser or prefix it with NEXT_PUBLIC_.'
  );
}

// ⚠️ SERVER-ONLY CLIENT. Only import this file from Route Handlers
// (app/api/**/route.ts) or other server-side code — never from a
// 'use client' component. The service role key bypasses Row Level
// Security entirely, which is exactly why it must stay on the server.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});