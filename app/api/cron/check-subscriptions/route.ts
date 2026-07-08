import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Runs on a schedule (see vercel.json). Suspends any restaurant whose
// 14-day trial has ended and hasn't been suspended yet. No grace period —
// trial ends, access stops immediately.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: expired, error } = await supabaseAdmin
    .from('restaurants')
    .update({ subscription_status: 'suspended' })
    .eq('subscription_status', 'active')
    .lt('trial_ends_at', new Date().toISOString())
    .select('id, name');

  if (error) {
    // eslint-disable-next-line no-console
    console.error('check-subscriptions failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ suspended: expired?.length ?? 0, restaurants: expired ?? [] });
}