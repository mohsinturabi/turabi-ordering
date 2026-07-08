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
      plan,
    } = await req.json();

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.PLATFORM_RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    const { data: restaurant, error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update({
        subscription_status: "active",
        plan_type: plan,
        subscription_expires_at: newExpiry.toISOString(),
      })
      .eq("id", restaurantId)
      .select()
      .single();

    if (updateError || !restaurant) {
      return NextResponse.json({ error: "Could not update subscription" }, { status: 500 });
    }

    return NextResponse.json({ success: true, restaurant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}