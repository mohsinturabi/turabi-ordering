import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Very small in-memory rate limiter. Fine for a single-instance deploy;
// swap for Upstash/Redis if you run multiple instances or serverless
// functions that don't share memory.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // no-op: we're only reading the session here
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Adjust this check to match how you actually mark admins.
  // Option A: role stored in app_metadata (set server-side, not user-editable)
  const isAdmin = user.app_metadata?.role === "admin";

  // Option B (alternative): look up an `admins` table instead —
  // const { data: adminRow } = await supabaseAdmin
  //   .from("admins")
  //   .select("id")
  //   .eq("user_id", user.id)
  //   .maybeSingle();
  // const isAdmin = !!adminRow;

  return isAdmin ? user : null;
}

export async function POST(req: Request) {
  // 1. Auth: only admins can trigger invites
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit per admin, not per IP (IP is spoofable/shared)
  if (isRateLimited(admin.id)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: restaurant, error: lookupError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, subscription_status")
      .eq("contact_email", normalizedEmail)
      .maybeSingle();

    if (lookupError) {
      console.error("Restaurant lookup failed:", lookupError);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }

    if (!restaurant) {
      return NextResponse.json(
        { error: "Is email se koi restaurant nahi mila." },
        { status: 404 }
      );
    }

    if (restaurant.subscription_status !== "active") {
      return NextResponse.json(
        { error: "Yeh restaurant abhi active subscription mein nahi hai." },
        { status: 403 }
      );
    }

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: { restaurant_id: restaurant.id, role: "owner" },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reset-password`,
      }
    );

    if (inviteError) {
      const alreadyRegistered = /already registered/i.test(inviteError.message);

      if (!alreadyRegistered) {
        console.error("Invite failed:", inviteError);
        return NextResponse.json(
          { error: "Invite bhejne mein masla hua. Dobara koshish karein." },
          { status: 500 }
        );
      }

      // User already exists —