"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PLANS = {
  basic: { label: "Basic — ₹199/month", amount: 199 },
  assisted: { label: "Assisted — ₹299/month", amount: 299 },
};

type Restaurant = {
  id: string;
  name: string;
  contact_email: string;
  plan_type: keyof typeof PLANS;
  subscription_status: string;
  subscription_expires_at: string | null;
};

export default function BillingPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLANS>("basic");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadRestaurant() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setError("Login required");
        setLoading(false);
        return;
      }

      const { data: staffRow } = await supabase
        .from("staff")
        .select("tenant_id")
        .eq("auth_user_id", userData.user.id)
        .single();

      if (!staffRow) {
        setError("Restaurant not found for this account");
        setLoading(false);
        return;
      }

      const { data: rest } = await supabase
        .from("restaurants")
        .select(
          "id, name, contact_email, plan_type, subscription_status, subscription_expires_at"
        )
        .eq("id", staffRow.tenant_id)
        .single();

      if (rest) {
        setRestaurant(rest as Restaurant);
        setSelectedPlan(rest.plan_type as keyof typeof PLANS);
      }
      setLoading(false);
    }

    loadRestaurant();
  }, []);

  async function handlePayment(plan: keyof typeof PLANS) {
    if (!restaurant) return;
    setError("");
    setMessage("");
    setProcessing(true);

    try {
      const res = await fetch("/api/platform/create-renewal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id, plan }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Order creation failed");
        setProcessing(false);
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Turabi Labs",
        description: PLANS[plan].label,
        order_id: data.orderId,
        prefill: {
          email: data.email,
          contact: data.contact,
        },
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/platform/verify-renewal-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              restaurantId: restaurant.id,
              plan,
            }),
          });
          const verifyData = await verifyRes.json();

          if (verifyRes.ok) {
            setMessage("Payment successful! Subscription updated.");
            setRestaurant(verifyData.restaurant);
          } else {
            setError(verifyData.error || "Payment verification failed");
          }
          setProcessing(false);
        },
        modal: {
          ondismiss: () => setProcessing(false),
        },
        theme: { color: "#f97316" },
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setProcessing(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (error && !restaurant) return <div className="p-6 text-red-600">{error}</div>;
  if (!restaurant) return null;

  const expiry = restaurant.subscription_expires_at
    ? new Date(restaurant.subscription_expires_at)
    : null;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="max-w-xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Billing</h1>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>
        )}
        {message && (
          <p className="text-green-600 text-sm bg-green-50 p-2 rounded">{message}</p>
        )}

        <div className="border rounded-xl p-4 space-y-2">
          <p>
            <span className="font-medium">Current Plan:</span>{" "}
            {PLANS[restaurant.plan_type]?.label || restaurant.plan_type}
          </p>
          <p>
            <span className="font-medium">Status:</span> {restaurant.subscription_status}
          </p>
          <p>
            <span className="font-medium">Expires:</span>{" "}
            {expiry ? expiry.toLocaleDateString() : "N/A"}
          </p>
        </div>

        <div className="border rounded-xl p-4 space-y-4">
          <h2 className="font-semibold">Renew / Change Plan</h2>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value as keyof typeof PLANS)}
            className="w-full border rounded px-3 py-2"
          >
            {Object.entries(PLANS).map(([key, p]) => (
              <option key={key} value={key}>
                {p.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => handlePayment(selectedPlan)}
            disabled={processing}
            className="w-full bg-orange-500 text-white rounded py-2 font-medium disabled:opacity-50"
          >
            {processing ? "Processing..." : "Pay & Renew"}
          </button>
        </div>
      </div>
    </>
  );
}