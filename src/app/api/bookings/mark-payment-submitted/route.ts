// src/app/api/bookings/mark-payment-submitted/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function POST(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 401 });

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userResp?.user) {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }
    const user = userResp.user;

    const body = await req.json().catch(() => null);
    const booking_id = body?.booking_id as string | undefined;

    if (!booking_id) {
      return NextResponse.json({ ok: false, error: "Missing booking_id" }, { status: 400 });
    }

    // Ensure traveller owns booking
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("bookings")
      .select("id, traveller_id")
      .eq("id", booking_id)
      .maybeSingle();

    if (exErr || !existing) {
      return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
    }
    if (existing.traveller_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { data: booking, error: updErr } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "payment_submitted",
        payment_status: "proof_submitted",
      })
      .eq("id", booking_id)
      .select(
        "id, trip_id, traveller_id, operator_id, quote_id, status, date_from, date_to, pax, total_amount, currency, payment_status, created_at"
      )
      .single();

    if (updErr || !booking) {
      return NextResponse.json({ ok: false, error: updErr?.message || "Failed to update booking" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, booking });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
