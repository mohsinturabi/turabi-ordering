import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SETUP_FEE = 399;
const SUBSCRIPTION_FEE = 599;
const PLAN_AMOUNTS: Record<string, number> = {
  full: SETUP_FEE + SUBSCRIPTION_FEE,
  trial: SETUP_FEE,
};

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      restaurantId,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !restaurantId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.PLATFORM_RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(razorpay_signature);

    const isValidSignature =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isValidSignature) {
      console.error("Signature mismatch for order:", razorpay_order_id);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const { data: restaurant, error: fetchErr } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, contact_email, contact_phone, plan_type, subscription_end")
      .eq("id", restaurantId)
      .single();

    if (fetchErr || !restaurant) {
      console.error("Restaurant not found for verify-signup-payment:", fetchErr);
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update({
        subscription_status: "active",
        setup_fee_paid: true,
        last_payment_date: new Date().toISOString(),
      })
      .eq("id", restaurantId);

    if (updateError) {
      console.error("Failed to activate restaurant:", updateError);
      return NextResponse.json(
        { error: "Could not activate restaurant" },
        { status: 500 }
      );
    }

    // Record the payment for the owner's payment history
    await supabaseAdmin.from("payment_history").insert({
      restaurant_id: restaurant.id,
      payment_type: restaurant.plan_type === "trial" ? "trial" : "signup",
      amount: PLAN_AMOUNTS[restaurant.plan_type] ?? PLAN_AMOUNTS.full,
      razorpay_payment_id,
      razorpay_order_id,
      status: "paid",
    });

    // Trial can only ever be used once — lock it in now that it's paid
    if (restaurant.plan_type === "trial") {
      await supabaseAdmin.from("trial_usage").insert({
        email: restaurant.contact_email,
        mobile: restaurant.contact_phone,
        restaurant_id: restaurant.id,
      });
    }

    const inviteWarning = await sendInvite(restaurant);

    return NextResponse.json({
      success: true,
      ...(inviteWarning && { warning: inviteWarning }),
    });
  } catch (err) {
    console.error("Unexpected error in verify-signup-payment:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

async function sendInvite(restaurant: any): Promise<string | null> {
  try {
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(restaurant.contact_email, {
        data: { restaurant_id: restaurant.id, role: "owner" },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reset-password`,
      });

    if (inviteError) {
      console.error("inviteUserByEmail failed:", inviteError.message);
      return "Restaurant activated, but invite email failed. Please use resend invite.";
    }

    if (inviteData?.user?.id) {
      const { error: staffErr } = await supabaseAdmin.from("staff").insert({
        tenant_id: restaurant.id,
        auth_user_id: inviteData.user.id,
        name: restaurant.name,
        role: "owner",
        is_primary_owner: true,
      });

      if (staffErr) {
        console.error("staff row creation failed:", staffErr.message);
        return "Invite sent, but staff record could not be created. Contact support.";
      }
    } else {
      console.error("Skipping staff row creation: invite did not return a user.");
      return "Invite sent, but staff record could not be created. Contact support.";
    }

    return null;
  } catch (err) {
    console.error("sendInvite failed:", err);
    return "Restaurant activated, but invite email failed. Please use resend invite.";
  }
}
