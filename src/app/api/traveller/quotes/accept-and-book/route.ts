// src/app/api/traveller/quotes/accept-and-book/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const parseNote = (note: string | null | undefined) => {
  if (!note) return null as any;
  try {
    const parsed = JSON.parse(note);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null as any;
  }
};

function addDaysISO(dateISO: string, days: number) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  // keep it as ISO string
  return d.toISOString();
}

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function POST(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing Authorization token" }, { status: 401 });
    }

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userResp?.user) {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }

    const user = userResp.user;
    const email = user.email || (user.user_metadata?.email as string | undefined) || null;
    if (!email) {
      return NextResponse.json({ ok: false, error: "User email missing" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const quote_id = body?.quote_id as string | undefined;
    const enquiry_id = body?.enquiry_id as number | undefined;

    if (!quote_id || !enquiry_id) {
      return NextResponse.json({ ok: false, error: "Missing quote_id or enquiry_id" }, { status: 400 });
    }

    // 1) Load enquiry & confirm it belongs to this traveller
    const { data: enquiry, error: enqErr } = await supabaseAdmin
      .from("quote_requests")
      .select("id, trip_id, operator_id, trip_title, note, date, pax, email")
      .eq("id", enquiry_id)
      .maybeSingle();

    if (enqErr || !enquiry) {
      return NextResponse.json({ ok: false, error: "Enquiry not found" }, { status: 404 });
    }

    if ((enquiry.email || "").toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // If AI enquiry was missing trip_id, auto-create a minimal trip so bookings work
    if (!enquiry.trip_id) {
      if (!enquiry.operator_id) {
        return NextResponse.json({ ok: false, error: "Enquiry missing operator_id" }, { status: 400 });
      }

      const parsed = parseNote(enquiry.note);
      const derivedTitle = (enquiry.trip_title || parsed?.summary || "Custom AI itinerary").toString().slice(0, 140);
      const derivedDuration =
        parsed?.daysCount && Number(parsed.daysCount) > 0 ? Number(parsed.daysCount) : 7;
      const derivedStyle = parsed?.travelStyle || parsed?.style || null;

      const { data: tripRow, error: tripErr } = await supabaseAdmin
        .from("trips")
        .insert([
          {
            operator_id: enquiry.operator_id,
            title: derivedTitle,
            duration: derivedDuration,
            style: derivedStyle,
            overview: parsed?.summary || null,
          },
        ])
        .select("id")
        .single();

      if (tripErr || !tripRow) {
        return NextResponse.json(
          { ok: false, error: tripErr?.message || "Failed to prepare a trip for this enquiry" },
          { status: 500 }
        );
      }

      enquiry.trip_id = (tripRow as any).id as string;

      await supabaseAdmin
        .from("quote_requests")
        .update({ trip_id: enquiry.trip_id, trip_title: derivedTitle })
        .eq("id", enquiry_id);
    }

    // 2) Load quote and confirm it matches enquiry
    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("id, quote_request_id, total_price, currency")
      .eq("id", quote_id)
      .maybeSingle();

    if (qErr || !quote) {
      return NextResponse.json({ ok: false, error: "Quote not found" }, { status: 404 });
    }

    if (Number(quote.quote_request_id) !== Number(enquiry_id)) {
      return NextResponse.json({ ok: false, error: "Quote does not belong to this enquiry" }, { status: 400 });
    }

    // 3) Load trip to get operator_id and duration (to compute date_to)
    const { data: trip, error: tErr } = await supabaseAdmin
      .from("trips")
      .select("id, operator_id, duration")
      .eq("id", enquiry.trip_id)
      .maybeSingle();

    if (tErr || !trip) {
      return NextResponse.json({ ok: false, error: "Trip not found" }, { status: 404 });
    }

    // 4) Compute dates (IMPORTANT: date_to must NOT be null)
    const dateFromISO =
      enquiry.date
        ? new Date(enquiry.date).toISOString()
        : new Date().toISOString();

    const durationDays = Number(trip.duration || 1);
    const safeDuration = Number.isFinite(durationDays) && durationDays > 0 ? durationDays : 1;

    // If trip duration is 5 days, date_to = date_from + 5 days (you can change to + (duration-1) if you prefer)
    const dateToISO = addDaysISO(dateFromISO, safeDuration);

    const pax = enquiry.pax ?? 1;
    const total = quote.total_price ?? 0;
    const currency = quote.currency ?? "USD";

    // 5) Upsert booking by quote_id (prevents duplicates)
    const payload = {
      trip_id: enquiry.trip_id,
      traveller_id: user.id,
      operator_id: trip.operator_id,
      quote_id: quote.id,
      status: "pending_payment",
      date_from: dateFromISO,
      date_to: dateToISO,
      pax,
      total_amount: total,
      currency,
      payment_status: "unpaid",
    };

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .upsert(payload, { onConflict: "quote_id" })
      .select(
        "id, trip_id, traveller_id, operator_id, quote_id, status, date_from, date_to, pax, total_amount, currency, payment_status, created_at"
      )
      .single();

    if (bErr || !booking) {
      return NextResponse.json(
        { ok: false, error: bErr?.message || "Failed to create booking" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, booking });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
