export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getBearerToken(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, { auth: { persistSession: false } });
}

function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, service, { auth: { persistSession: false } });
}

function isAdminUser(user: any) {
  const role = user?.app_metadata?.role || user?.user_metadata?.role;
  if (role === "admin") return true;

  const email = (user?.email || user?.user_metadata?.email || "").toLowerCase();

  if (process.env.NODE_ENV !== "production" && email.endsWith("@safariconnector.com")) return true;

  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return !!email && allow.includes(email);
}

export async function POST(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const anon = supabaseAnon();
    const userResp = await anon.auth.getUser(token);
    const user = userResp.data.user;

    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const booking_id = String(body?.booking_id || "").trim();

    if (!booking_id) {
      return NextResponse.json({ ok: false, error: "Missing booking_id" }, { status: 400 });
    }

    const svc = supabaseService();

    // Update booking to verified
    const { data, error } = await svc
      .from("bookings")
      .update({
        status: "payment_verified",
        payment_status: "deposit_paid", // adjust if you want paid_in_full
      })
      .eq("id", booking_id)
      .select("id, status, payment_status, created_at, total_amount, currency, traveller_id, operator_id, quote_id")
      .single();

    if (error) {
      console.error("admin verify db error:", error);
      return NextResponse.json({ ok: false, error: "Failed to verify payment" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, booking: data });
  } catch (e) {
    console.error("admin verify exception:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
