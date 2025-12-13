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
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const anon = supabaseAnon();
    const { data: uResp, error: uErr } = await anon.auth.getUser(token);
    if (uErr || !uResp?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const booking_id = String(body?.booking_id || "").trim();
    const enquiry_id_raw = body?.enquiry_id;

    if (!booking_id) {
      return NextResponse.json({ ok: false, error: "Missing booking_id" }, { status: 400 });
    }

    // enquiry_id is optional but recommended (for auto message)
    const enquiry_id =
      typeof enquiry_id_raw === "number"
        ? enquiry_id_raw
        : typeof enquiry_id_raw === "string" && enquiry_id_raw.trim()
        ? Number(enquiry_id_raw)
        : null;

    const svc = supabaseService();

    // 1) Map auth user -> operator profile (operators.id)
    // First try operators_view, fallback operators.
    let operatorId: string | null = null;

    const { data: opv, error: opvErr } = await svc
      .from("operators_view")
      .select("id,user_id")
      .eq("user_id", uResp.user.id)
      .maybeSingle();

    if (opvErr) console.warn("confirm: operators_view lookup error:", opvErr);

    if (opv?.id) {
      operatorId = opv.id as string;
    } else {
      const { data: op, error: opErr } = await svc
        .from("operators")
        .select("id,user_id")
        .eq("user_id", uResp.user.id)
        .maybeSingle();

      if (opErr) console.warn("confirm: operators lookup error:", opErr);
      if (op?.id) operatorId = op.id as string;
    }

    if (!operatorId) {
      return NextResponse.json({ ok: false, error: "Operator profile not found" }, { status: 403 });
    }

    // 2) Load booking
    const { data: booking, error: bErr } = await svc
      .from("bookings")
      .select("id, operator_id, status, payment_status, currency, total_amount")
      .eq("id", booking_id)
      .single();

    if (bErr || !booking) {
      console.error("confirm: booking load error:", bErr);
      return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
    }

    // 3) Ownership check (booking.operator_id must match operators.id)
    if (booking.operator_id !== operatorId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // 4) Payment check: allow confirm only after verification
    const statusRaw = String(booking.status || "").toLowerCase();
    const payRaw = String(booking.payment_status || "").toLowerCase();

    const paymentOk =
      statusRaw === "payment_verified" || payRaw === "deposit_paid" || payRaw === "paid_in_full";

    if (!paymentOk) {
      return NextResponse.json(
        { ok: false, error: "Payment is not verified yet. Safari Connector must verify before confirming." },
        { status: 400 }
      );
    }

    // 5) Confirm booking
    const { data: updated, error: u2Err } = await svc
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", booking_id)
      .select(
        "id,trip_id,quote_id,operator_id,date_from,date_to,pax,total_amount,currency,status,payment_status,created_at"
      )
      .single();

    if (u2Err || !updated) {
      console.error("confirm: booking update error:", u2Err);
      return NextResponse.json({ ok: false, error: "Failed to confirm booking" }, { status: 500 });
    }

    // 6) Optional: drop a system message into the enquiry chat
    if (enquiry_id) {
      const ref = String(updated.id).slice(0, 8).toUpperCase();
      const amount = `${updated.currency || booking.currency || "USD"} ${updated.total_amount ?? booking.total_amount ?? ""}`;

      await svc.from("quote_request_messages").insert({
        quote_request_id: enquiry_id,
        sender_role: "operator",
        message: `Booking confirmed. Reference: ${ref}. Amount: ${amount}. We will share final travel details shortly.`,
      });
    }

    return NextResponse.json({ ok: true, booking: updated });
  } catch (e) {
    console.error("confirm: exception:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
