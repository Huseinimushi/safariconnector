// src/app/api/traveller/bookings/submit-payment-proof/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/authServer";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Payload = {
  booking_id: string;
  payment_reference?: string | null;
  proof_url?: string | null; // if you store file url
  note?: string | null;
};

const asText = (v: any) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
};

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();

    // ✅ Safe userId extraction (matches how we fixed other routes)
    const userId =
      (auth as any)?.user?.id ??
      (auth as any)?.id ??
      null;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as Payload | null;
    const bookingId = asText(body?.booking_id);

    if (!bookingId) {
      return NextResponse.json(
        { ok: false, error: "Missing booking_id" },
        { status: 400 }
      );
    }

    // 1) Load booking
    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("id, traveller_id, status, meta, payment_reference, payment_status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bErr || !booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // 2) Ownership check (your bookings use traveller_id)
    if (booking.traveller_id !== userId) {
      return NextResponse.json(
        { ok: false, error: "Not allowed" },
        { status: 403 }
      );
    }

    const status = (booking.status || "").toLowerCase();
    if (status === "cancelled" || status === "confirmed") {
      return NextResponse.json(
        { ok: false, error: "Cannot submit payment for this booking" },
        { status: 400 }
      );
    }

    // 3) Update booking -> payment_submitted (Finance will later set payment_verified)
    const payment_reference = asText(body?.payment_reference);
    const proof_url = asText(body?.proof_url);
    const note = asText(body?.note);

    const prevMeta = (booking.meta && typeof booking.meta === "object") ? booking.meta : {};
    const nextMeta = {
      ...prevMeta,
      payment_proof: {
        ...(prevMeta?.payment_proof || {}),
        proof_url: proof_url ?? prevMeta?.payment_proof?.proof_url ?? null,
        note: note ?? prevMeta?.payment_proof?.note ?? null,
        submitted_at: new Date().toISOString(),
      },
    };

    const { data: updated, error: uErr } = await admin
      .from("bookings")
      .update({
        status: "payment_submitted",
        payment_status: "submitted",
        payment_reference: payment_reference ?? booking.payment_reference ?? null,
        meta: nextMeta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select("id, status, payment_status, payment_reference, updated_at")
      .maybeSingle();

    if (uErr) {
      return NextResponse.json(
        { ok: false, error: uErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, booking: updated },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
