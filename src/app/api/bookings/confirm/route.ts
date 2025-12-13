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

export async function POST(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    // 1) Identify user (operator) from token
    const anon = supabaseAnon();
    const userResp = await anon.auth.getUser(token);
    const user = userResp.data.user;

    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const booking_id = String(body?.booking_id || "").trim();

    if (!booking_id) {
      return NextResponse.json({ ok: false, error: "Missing booking_id" }, { status: 400 });
    }

    // 2) Load booking with service key (bypass RLS) then enforce ownership in code
    const svc = supabaseService();

    const { data: booking, error: bErr } = await svc
      .from("bookings")
      .select("id, operator_id, status, payment_status")
      .eq("id", booking_id)
      .single();

    if (bErr || !booking) {
      console.error("confirm booking load error:", bErr);
      return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
    }

    // IMPORTANT:
    // operator_id in bookings must match the operator profile id you store.
    // If your bookings.operator_id stores operators.id (NOT auth user id), then you must map auth user -> operator id.
    // Below we assume bookings.operator_id == auth user id OR you store operator_id in user_metadata/operator_id.
    const authUserId = user.id;
    const operatorIdFromMeta =
      (user.user_metadata?.operator_id as string | undefined) ||
      (user.app_metadata?.operator_id as string | undefined) ||
      null;

    const allowed = booking.operator_id === authUserId || (operatorIdFromMeta && booking.operator_id === operatorIdFromMeta);

    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // 3) Enforce payment verified before confirm
    const statusRaw = (booking.status || "").toLowerCase();
    const payRaw = (booking.payment_status || "").toLowerCase();

    const paymentOk =
      statusRaw === "payment_verified" ||
      payRaw === "deposit_paid" ||
      payRaw === "paid_in_full";

    if (!paymentOk) {
      return NextResponse.json(
        { ok: false, error: "Payment is not verified yet. Admin must verify before confirming." },
        { status: 400 }
      );
    }

    // 4) Confirm booking
    const { data: updated, error: uErr } = await svc
      .from("bookings")
      .update({
        status: "confirmed",
        // optionally: payment_status keep as deposit_paid/paid_in_full
      })
      .eq("id", booking_id)
      .select("id, status, payment_status, created_at, total_amount, currency, traveller_id, operator_id, quote_id, date_from, date_to, pax")
      .single();

    if (uErr) {
      console.error("confirm booking update error:", uErr);
      return NextResponse.json({ ok: false, error: "Failed to confirm booking" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, booking: updated });
  } catch (e) {
    console.error("confirm booking exception:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
