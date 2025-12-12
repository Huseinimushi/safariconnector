// src/app/api/quotes/[id]/accept-booking/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/authServer";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type AcceptBookingBody = {
  enquiry_id?: number; // quote_requests.id
};

// ✅ Next.js 16 fix: params is a Promise
type RouteCtx = {
  params: Promise<{ id: string }>;
};

export const POST = async (req: NextRequest, context: RouteCtx) => {
  try {
    // ✅ FIX: requireUser() takes NO args in your project
    const auth = await requireUser();
    const user: any = (auth as any)?.user ?? auth;

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Next.js 16 fix: await params
    const { id } = await context.params;
    const quoteId = id;

    if (!quoteId) {
      return NextResponse.json({ error: "Missing quote id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as AcceptBookingBody;
    const enquiryId = body.enquiry_id;

    // 1) Load quote from quotes table
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("quotes")
      .select(
        "id, trip_id, operator_id, total_price, currency, traveller_id, notes, validity_date, payment_terms"
      )
      .eq("id", quoteId)
      .maybeSingle();

    if (quoteError) {
      console.error("accept-booking: load quote error:", quoteError);
      return NextResponse.json({ error: "Could not load quote" }, { status: 500 });
    }

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // 2) Optionally load enquiry for dates/pax
    let enquiry: {
      id: number;
      trip_id: string | null;
      date: string | null;
      pax: number | null;
      email: string | null;
    } | null = null;

    if (enquiryId != null) {
      const { data: enquiryRow, error: enquiryError } = await supabaseAdmin
        .from("quote_requests")
        .select("id, trip_id, date, pax, email")
        .eq("id", enquiryId)
        .maybeSingle();

      if (enquiryError) {
        console.error("accept-booking: load enquiry error:", enquiryError);
        return NextResponse.json(
          { error: "Could not load enquiry" },
          { status: 500 }
        );
      }

      if (!enquiryRow) {
        return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
      }

      enquiry = enquiryRow as any;
    }

    // 3) Security checks
    const travellerIdFromQuote = (quote as any).traveller_id as string | null;
    const userId = user.id as string;

    const userEmail =
      (user.email as string) ||
      ((user.user_metadata?.email as string) ?? null);

    // Check ownership:
    // - If quote.traveller_id set → must match user
    // - Else if enquiry loaded → enquiry.email must match user email
    if (travellerIdFromQuote && travellerIdFromQuote !== userId) {
      return NextResponse.json(
        { error: "You are not allowed to book this quote." },
        { status: 403 }
      );
    }

    if (!travellerIdFromQuote && enquiry && enquiry.email && userEmail) {
      if (enquiry.email.toLowerCase() !== userEmail.toLowerCase()) {
        return NextResponse.json(
          { error: "You are not allowed to book this enquiry." },
          { status: 403 }
        );
      }
    }

    // 4) Resolve trip/operator/amount/date/pax
    const tripIdFromQuote = (quote as any).trip_id as string | null;
    const operatorIdFromQuote = (quote as any).operator_id as string | null;

    const tripId =
      tripIdFromQuote ?? (enquiry ? (enquiry.trip_id as string | null) : null);

    if (!tripId) {
      return NextResponse.json(
        {
          error:
            "Quote is missing trip information. Please contact Safari Connector support.",
        },
        { status: 400 }
      );
    }

    const operatorId = operatorIdFromQuote;
    if (!operatorId) {
      return NextResponse.json(
        {
          error:
            "Quote is missing operator information. Please contact Safari Connector support.",
        },
        { status: 400 }
      );
    }

    const totalAmount = Number((quote as any).total_price ?? 0);
    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        {
          error:
            "Quote does not have a valid total price. Please contact Safari Connector support.",
        },
        { status: 400 }
      );
    }

    const currency = ((quote as any).currency as string) ?? "USD";

    const dateFrom =
      (enquiry?.date as string | null)?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10);

    const pax = enquiry?.pax != null && enquiry.pax > 0 ? enquiry.pax : 1;

    // 5) Create booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        trip_id: tripId,
        traveller_id: userId,
        operator_id: operatorId,
        quote_id: quoteId,
        status: "awaiting_payment",
        date_from: dateFrom,
        date_to: dateFrom,
        pax,
        total_amount: totalAmount,
        currency,
        commission_percentage: 15.0,
        payment_status: "unpaid",
        disbursement_status: "pending",
        meta: {
          from_quote: true,
          original_quote_id: quoteId,
          original_enquiry_id: enquiry?.id ?? null,
          quote_notes: (quote as any).notes ?? null,
          validity_date: (quote as any).validity_date ?? null,
          payment_terms: (quote as any).payment_terms ?? null,
        },
      })
      .select("*")
      .single();

    if (bookingError) {
      console.error("accept-booking: create booking error:", bookingError);
      return NextResponse.json(
        { error: "Could not create booking" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { booking, message: "Booking created from quote, awaiting payment" },
      { status: 201 }
    );
  } catch (err) {
    console.error("accept-booking: unexpected error:", err);
    return NextResponse.json(
      {
        error:
          "Unexpected error accepting quote and creating booking. Please try again.",
      },
      { status: 500 }
    );
  }
};
