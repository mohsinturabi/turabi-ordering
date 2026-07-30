import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const razorpay = new Razorpay({
  key_id: process.env.PLATFORM_RAZORPAY_KEY_ID!,
  key_secret: process.env.PLATFORM_RAZORPAY_KEY_SECRET!,
});

const RENEWAL_FEE = 599; // no setup fee on renewal, always 28 days

export async function POST(req: Request) {
  try {
    const { restaurantId } = await req.json();
    if (!restaurantId) {
      return NextResponse.json({ error: "Missing restaurantId" }, { status: 400 });
    }

    const { data: restaurant, error: fetchErr } = await supabaseAdmin
      .from("restaurants")
      .select("id, contact_email, contact_phone")
      .eq("id", restaurantId)
      .single();

    if (fetchErr || !restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    let order;
    try {
      order = await razorpay.orders.create({
        amount: RENEWAL_FEE * 100,
        currency: "INR",
        receipt: `renew_${Date.now()}`,
        notes: { restaurantId: restaurant.id, type: "renewal" },
      });
    } catch (rzpErr: any) {
      return NextResponse.json(
        { error: rzpErr?.error?.description || rzpErr?.message || "Razorpay order creation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.PLATFORM_RAZORPAY_KEY_ID,
      email: restaurant.contact_email,
      contact: restaurant.contact_phone,
    });
  } catch (err: any) {
    console.error("create-renewal-order failed:", err);
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}
