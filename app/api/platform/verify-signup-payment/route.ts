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

    const { data: restaurant, error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update({ subscription_status: "active" })
      .eq("id", restaurantId)
      .select()
      .single();

    if (updateError || !restaurant) {
      console.error("Failed to activate restaurant:", updateError);
      return NextResponse.json(
        { error: "Could not activate restaurant" },
        { status: 500 }
      );
    }

    // IMPORTANT: yeh await zaroor karo. Serverless function response bhejte hi
    // execution kill kar sakta hai, isliye background mein "chhod dena" (fire-and-forget)
    // se invite/staff-insert kabhi complete hi nahi hote.
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
