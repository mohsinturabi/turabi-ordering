import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      restaurantId,
    } = await req.json();

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.PLATFORM_RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const { data: restaurant, error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update({ subscription_status: "active" })
      .eq("id", restaurantId)
      .select()
      .single();

    if (updateError || !restaurant) {
      return NextResponse.json(
        { error: "Could not activate restaurant" },
        { status: 500 }
      );
    }

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(restaurant.contact_email, {
        data: { restaurant_id: restaurant.id, role: "owner" },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reset-password`,
      });

    if (inviteError) {
      // eslint-disable-next-line no-console
      console.error("inviteUserByEmail failed:", inviteError.message);
      return NextResponse.json({
        success: true,
        warning: `Restaurant activated, but invite email failed: ${inviteError.message}`,
      });
    }

    if (inviteData?.user) {
      const { error: staffErr } = await supabaseAdmin.from("staff").insert({
        tenant_id: restaurant.id,
        auth_user_id: inviteData.user.id,
        name: restaurant.name,
        role: "owner",
        is_primary_owner: true,
      });
      if (staffErr) {
        // eslint-disable-next-line no-console
        console.error("staff row creation failed:", staffErr.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}