import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Runs daily at 12:05 AM (see vercel.json).
//
// subscription_end passing today does NOT suspend immediately — it moves
// the restaurant into a 3-day grace period first (banner + renew prompt).
// Only after grace runs out does access actually get suspended.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const graceThreshold = new Date(now);
  graceThreshold.setDate(graceThreshold.getDate() - 3); // subscription_end older than this = grace period over

  // Step 1a: trial plans → suspended immediately, no grace period
  const { data: trialSuspended, error: trialErr } = await supabaseAdmin
    .from('restaurants')
    .update({ subscription_status: 'suspended' })
    .eq('subscription_status', 'active')
    .eq('plan_type', 'trial')
    .lt('subscription_end', now.toISOString())
    .select('id, name');

  if (trialErr) {
    // eslint-disable-next-line no-console
    console.error('check-subscriptions (trial suspend) failed', trialErr);
    return NextResponse.json({ error: trialErr.message }, { status: 500 });
  }

  // Step 1b: full-plan restaurants → grace (subscription_end passed, within last 3 days)
  const { data: movedToGrace, error: graceErr } = await supabaseAdmin
    .from('restaurants')
    .update({ subscription_status: 'grace' })
    .eq('subscription_status', 'active')
    .eq('plan_type', 'full')
    .lt('subscription_end', now.toISOString())
    .select('id, name');

  if (graceErr) {
    // eslint-disable-next-line no-console
    console.error('check-subscriptions (grace step) failed', graceErr);
    return NextResponse.json({ error: graceErr.message }, { status: 500 });
  }

  // Step 2: grace → suspended (subscription_end passed more than 3 days ago)
  const { data: suspended, error: suspendErr } = await supabaseAdmin
    .from('restaurants')
    .update({ subscription_status: 'suspended' })
    .eq('subscription_status', 'grace')
    .lt('subscription_end', graceThreshold.toISOString())
    .select('id, name');

  if (suspendErr) {
    // eslint-disable-next-line no-console
    console.error('check-subscriptions (suspend step) failed', suspendErr);
    return NextResponse.json({ error: suspendErr.message }, { status: 500 });
  }

  return NextResponse.json({
    trialSuspended: trialSuspended?.length ?? 0,
    movedToGrace: movedToGrace?.length ?? 0,
    suspended: suspended?.length ?? 0,
    restaurants: { trialSuspended: trialSuspended ?? [], grace: movedToGrace ?? [], suspended: suspended ?? [] },
  });
}
