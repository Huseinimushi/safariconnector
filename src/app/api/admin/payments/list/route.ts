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

  // DEV convenience: allow any @safariconnector.com on localhost/dev
  if (process.env.NODE_ENV !== "production" && email.endsWith("@safariconnector.com")) return true;

  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return !!email && allow.includes(email);
}

export async function GET(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const anon = supabaseAnon();
    const userResp = await anon.auth.getUser(token);
    const user = userResp.data.user;

    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const view = (searchParams.get("view") || "needs").toLowerCase();

    const svc = supabaseService();

    let q = svc
      .from("bookings")
      .select("id, status, payment_status, created_at, total_amount, currency, traveller_id, operator_id, quote_id")
      .order("created_at", { ascending: false });

    if (view === "verified") {
      // verified
      q = q.or("status.eq.payment_verified,status.eq.confirmed,payment_status.eq.deposit_paid,payment_status.eq.paid_in_full");
    } else {
      // needs verification
      q = q.or("status.eq.payment_submitted,payment_status.eq.proof_submitted");
    }

    const { data, error } = await q;

    if (error) {
      console.error("admin payments list db error:", error);
      return NextResponse.json({ ok: false, error: "Failed to load payments" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, items: data || [] });
  } catch (e) {
    console.error("admin payments list exception:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
