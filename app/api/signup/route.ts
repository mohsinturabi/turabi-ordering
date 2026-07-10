لبimport { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const razorpay = new Razorpay({
  key_id: process.env.PLATFORM_RAZORPAY_KEY_ID!,
  key_secret: process.env.PLATFORM_RAZORPAY_KEY_SECRET!,
});

const PLAN_AMOUNTS: Record<string, number> = {
  basic: 199,
  assisted: 299,
};

const STALE_GRACE_MINUTES = 30;

export async function POST(req: Request) {
  try {
    const { restaurantName, subdomain, email, mobile, plan, couponCode } =
      await req.json();

    if (!restaurantName || !subdomain || !email || !mobile || !plan) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const amount = PLAN_AMOUNTS[plan];
    if (!amount) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // ---- Subdomain check ----
    const { data: existing } = await supabaseAdmin
      .from("restaurants")
      .select("id, subscription_status, created_at")
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (existing) {
      if (existing.subscription_status === "active") {
        return NextResponse.json({ error: "Subdomain already taken" }, { status: 409 });
      }

      const createdAt = existing.created_at ? new Date(existing.created_at) : null;
      const ageMinutes = createdAt ? (Date.now() - createdAt.getTime()) / 60000 : Infinity;

      if (ageMinutes < STALE_GRACE_MINUTES) {
        return NextResponse.json(
          { error: "Ye subdomain ke liye payment already process ho raha hai. Thodi der baad try karo ya naya subdomain use karo." },
          { status: 409 }
        );
      }

      await supabaseAdmin.from("restaurants").delete().eq("id", existing.id);
    }

    // ---- Ek email sirf ek hi active restaurant ka owner ban sakta hai ----
    const { data: emailConflict } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("contact_email", email)
      .eq("subscription_status", "active")
      .maybeSingle();

    if (emailConflict) {
      return NextResponse.json(
        { error: "Ye email pehle se kisi restaurant ke owner ke roop mein registered hai. Ek email se sirf ek hi restaurant register ho sakta hai." },
        { status: 409 }
      );
    }

    // ---- Coupon check (sirf Basic plan pe apply hota hai) ----

    let couponApplied = false;
    let couponId: string | null = null;

    if (couponCode && couponCode.trim()) {
      if (plan !== "basic") {
        return NextResponse.json(
          { error: "Coupon sirf Basic plan pe valid hai" },
          { status: 400 }
        );
      }

      const normalizedCode = couponCode.trim().toUpperCase();

      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("id, is_active")
        .eq("code", normalizedCode)
        .eq("is_active", true)
        .maybeSingle();

      if (!coupon) {
        return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
      }

      const { data: alreadyUsed } = await supabaseAdmin
        .from("coupon_redemptions")
        .select("id")
        .eq("coupon_id", coupon.id)
        .eq("email", email)
        .maybeSingle();

      if (alreadyUsed) {
        return NextResponse.json(
          { error: "Ye coupon aap pehle hi use kar chuke hain" },
          { status: 400 }
        );
      }

      couponApplied = true;
      couponId = coupon.id;
    }

    // ---- Create restaurant row ----
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const { data: restaurant, error: insertError } = await supabaseAdmin
      .from("restaurants")
      .insert({
        name: restaurantName,
        subdomain,
        contact_email: email,
        contact_phone: mobile,
        plan_type: plan,
        subscription_status: couponApplied ? "active" : "grace",
        trial_ends_at: trialEndsAt.toISOString(),
        counter_qr_token: randomUUID(),
      })
      .select()
      .single();

    if (insertError || !restaurant) {
      return NextResponse.json(
        { error: insertError?.message || "Could not create restaurant" },
        { status: 500 }
      );
    }

    // ---- Coupon path: skip payment ----
    if (couponApplied && couponId) {
      await supabaseAdmin.from("coupon_redemptions").insert({ coupon_id: couponId, email });

      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { restaurant_id: restaurant.id, role: "owner" },
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reset-password`,
        });

      if (inviteError) {
        console.error('inviteUserByEmail failed:', {
          message: inviteError.message,
          status: inviteError.status,
          name: inviteError.name,
        });
      }

      // Owner ko turant staff table mein link karo, taaki sign-in hote hi
      // dashboard access mil jaye. Sirf tab karo jab invite se user mil gaya ho —
      // warna inviteData null hoga aur yahan crash ho jayega.
      if (inviteData?.user?.id) {
        const { error: staffErr } = await supabaseAdmin.from("staff").insert({
          tenant_id: restaurant.id,
          auth_user_id: inviteData.user.id,
          name: restaurantName,
          role: "owner",
          is_primary_owner: true,
        });

        if (staffErr) {
          console.error("staff row creation failed:", staffErr.message);
        }
      } else {
        console.error("Skipping staff row creation: invite did not return a user.");
      }

      return NextResponse.json({
        couponApplied: true,
        restaurantId: restaurant.id,
        ...(inviteError && { warning: "Restaurant created, but invite email failed. Use resend invite." }),
      });
    }

    // ---- Payment path: create Razorpay order ----
    let order;
    try {
      order = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: `sgn_${Date.now()}`,
        notes: { restaurantId: restaurant.id, plan },
      });
    } catch (rzpErr: any) {
      await supabaseAdmin.from("restaurants").delete().eq("id", restaurant.id);
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
      restaurantId: restaurant.id,
    });
  } catch (err: any) {
    console.error("Unexpected error in /api/signup:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
