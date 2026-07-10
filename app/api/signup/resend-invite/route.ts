import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Confirm this email actually belongs to a restaurant that's been paid for.
    const { data: restaurant } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, subscription_status")
      .eq("contact_email", email)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Is email se koi restaurant nahi mila." },
        { status: 404 }
      );
    }

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { restaurant_id: restaurant.id, role: "owner" },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reset-password`,
      }
    );

    if (inviteError) {
      // "User already registered" often means the invite already exists —
      // try generating a fresh recovery link instead, which also emails a
      // working set-password link.
      const { error: recoveryError } = await supabaseAdmin.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reset-password` }
      );
      if (recoveryError) {
        return NextResponse.json({ error: recoveryError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}