export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/authServer";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);

    const booking_id = body?.booking_id as string | undefined;
    const enquiry_id = body?.enquiry_id as number | undefined;

    if (!booking_id || !enquiry_id) {
      return NextResponse.json({ ok: false, error: "Missing booking_id or enquiry_id" }, { status: 400 });
    }

    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("id, traveller_id, status, payment_status, currency, total_amount")
      .eq("id", booking_id)
      .maybeSingle();

    if (bErr || !booking) return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
    if (booking.traveller_id !== user.id) return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });

    const status = (booking.status || "").toLowerCase();
    if (status === "cancelled" || status === "confirmed") {
      return NextResponse.json({ ok: true, booking }, { status: 200 });
    }

    const { data: updated, error: uErr } = await admin
      .from("bookings")
      .update({ status: "payment_submitted", payment_status: "proof_submitted" })
      .eq("id", booking_id)
      .select("id, trip_id, traveller_id, operator_id, quote_id, status, total_amount, currency, payment_status, created_at")
      .single();

    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });

    const refShort = updated.id.slice(0, 8).toUpperCase();
    const amountText = `${updated.currency || "USD"} ${updated.total_amount ?? ""}`;
    const msg = `Payment proof submitted for booking ${refShort}. Amount: ${amountText}. Safari Connector will verify shortly.`;

    await admin.from("quote_request_messages").insert({
      quote_request_id: enquiry_id,
      sender_role: "traveller",
      message: msg,
    });

    return NextResponse.json({ ok: true, booking: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
