"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

const PLANS = {
  basic: { label: "Basic — ₹199/month", amount: 199 },
  assisted: { label: "Assisted — ₹299/month", amount: 299 },
};

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
  restaurantName: "",
  subdomain: "",
  email: "",
  mobile: "",
  plan: "basic" as keyof typeof PLANS,
  couponCode: "",
});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      if (data.couponApplied) {
        router.push("/signup/success");
        return;
      }

      const { orderId, amount, currency, keyId, restaurantId } = data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: "Restaurant SaaS",
        description: PLANS[form.plan].label,
        order_id: orderId,
        prefill: { email: form.email, contact: form.mobile },
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/platform/verify-signup-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              restaurantId,
            }),
          });
          const verifyData = await verifyRes.json();

          if (verifyRes.ok) {
            router.push("/signup/success");
          } else {
            setError(verifyData.error || "Payment verification failed");
          }
          setLoading(false);
        },
        modal: {
          ondismiss: async () => {
            setLoading(false);
            await fetch("/api/signup/cancel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ restaurantId }),
            });
          },
        },
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <form
          onSubmit={handlePay}
          className="w-full max-w-md bg-white rounded-xl shadow p-6 space-y-4"
        >
          <h1 className="text-2xl font-bold text-center">
            Restaurant Signup
          </h1>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </p>
          )}

          <div>
            <label className="text-sm font-medium">Restaurant Name</label>
            <input
              name="restaurantName"
              value={form.restaurantName}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="e.g. Spice Garden"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Subdomain</label>
            <input
              name="subdomain"
              value={form.subdomain}
              onChange={handleChange}
              required
              pattern="[a-z0-9-]+"
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="spicegarden"
            />
            <p className="text-xs text-gray-500 mt-1">
              {form.subdomain || "yourname"}.yourapp.com
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2 mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Mobile</label>
            <input
              type="tel"
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2 mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Plan</label>
            <select
              name="plan"
              value={form.plan}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 mt-1"
            >
              {Object.entries(PLANS).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

<div>
  <label className="text-sm font-medium">Coupon Code (optional)</label>
  <input
    name="couponCode"
    value={form.couponCode}
    onChange={handleChange}
    className="w-full border rounded px-3 py-2 mt-1"
    placeholder="e.g. TURABINEW101"
  />
</div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white rounded py-2 font-medium disabled:opacity-50"
          >
            {loading ? "Processing..." : "Pay & Continue"}
          </button>
        </form>
      </div>
    </>
  );
}