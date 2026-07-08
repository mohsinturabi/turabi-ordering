import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Only an already-logged-in owner should be able to call this. We re-check
// their staff row server-side rather than trusting the client's claim.
export async function POST(req: Request) {
  try {
    const { requestingUserId, tenantId, name, email, password, role } = await req.json();

    if (!requestingUserId || !tenantId || !name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Confirm the requester is actually an owner of this tenant.
    const { data: requester } = await supabaseAdmin
      .from('staff')
      .select('role, tenant_id')
      .eq('auth_user_id', requestingUserId)
      .maybeSingle();

    if (!requester || requester.role !== 'owner' || requester.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Create the auth user.
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr || !newUser.user) {
      return NextResponse.json({ error: createErr?.message ?? 'Could not create user' }, { status: 400 });
    }

    // Create the staff row linked to that auth user.
    const { error: staffErr } = await supabaseAdmin.from('staff').insert({
      tenant_id: tenantId,
      name,
      role,
      auth_user_id: newUser.user.id,
    });

    if (staffErr) {
      return NextResponse.json({ error: staffErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('create-staff failed', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}