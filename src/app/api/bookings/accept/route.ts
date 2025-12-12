// src/app/api/bookings/accept/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type QuoteRow = {
  id: string;
  quote_request_id: number | null;
  total_price: number | null;
  currency: string | null;
  notes: string | null;
};

type EnquiryRow = {
  id: number;
  email: string;
  trip_id: string | null;
  trip_title: string | null;
  date: string | null;
  pax: number | null;
};

type TripRow = {
  id: string;
  operator_id: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const quote_id: string | undefined = body.quote_id;
    const enquiry_id: number | undefined = body.enquiry_id;

    if (!quote_id || !enquiry_id) {
      return NextResponse.json(
        { error: "Missing quote_id or enquiry_id" },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Auth: lazima uwe logged-in traveller
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Not authenticated as traveller" },
        { status: 401 }
      );
    }

    const emailFromUser =
      (user.email as string | null) ||
      ((user.user_metadata?.email as string | undefined) ?? null);

    if (!emailFromUser) {
      return NextResponse.json(
        { error: "Your account does not have an email address" },
        { status: 400 }
      );
    }

    // Load quote
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select(
        "id, quote_request_id, total_price, currency, notes"
      )
      .eq("id", quote_id)
      .maybeSingle();

    if (quoteErr) {
      console.error("bookings/accept load quote error:", quoteErr);
      return NextResponse.json(
        { error: "Could not load quote" },
        { status: 500 }
      );
    }
    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    // Ensure quote is for this enquiry
    if (quote.quote_request_id !== enquiry_id) {
      return NextResponse.json(
        { error: "Quote does not belong to this enquiry" },
        { status: 400 }
      );
    }

    // Load enquiry
    const { data: enquiry, error: enqErr } = await supabase
      .from("quote_requests")
      .select("id, email, trip_id, trip_title, date, pax")
      .eq("id", enquiry_id)
      .maybeSingle();

    if (enqErr) {
      console.error("bookings/accept load enquiry error:", enqErr);
      return NextResponse.json(
        { error: "Could not load enquiry" },
        { status: 500 }
      );
    }
    if (!enquiry) {
      return NextResponse.json(
        { error: "Enquiry not found" },
        { status: 404 }
      );
    }

    // Verify that logged-in user is the same as enquiry email
    if (
      enquiry.email &&
      enquiry.email.toLowerCase() !== emailFromUser.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "You are not allowed to accept this quote" },
        { status: 403 }
      );
    }

    // Find operator from trip (if available)
    let operator_id: string | null = null;
    if (enquiry.trip_id) {
      const { data: trip, error: tripErr } = await supabase
        .from("trips")
        .select("id, operator_id")
        .eq("id", enquiry.trip_id)
        .maybeSingle();

      if (tripErr) {
        console.error("bookings/accept load trip error:", tripErr);
      } else if (trip) {
        operator_id = (trip as TripRow).operator_id;
      }
    }

    // Upsert booking record (one booking per quote)
    const { data: existingBooking, error: existingErr } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("quote_id", quote.id)
      .maybeSingle();

    if (existingErr) {
      console.error("bookings/accept load existing booking error:", existingErr);
      return NextResponse.json(
        { error: "Could not check existing booking" },
        { status: 500 }
      );
    }

    let booking;
    if (existingBooking) {
      booking = existingBooking;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("bookings")
        .insert({
          quote_id: quote.id,
          quote_request_id: enquiry.id,
          operator_id,
          traveller_email: emailFromUser,
          status: "pending",
          total_price: quote.total_price,
          currency: quote.currency,
          notes: quote.notes,
        })
        .select("*")
        .single();

      if (insertErr) {
        console.error("bookings/accept insert booking error:", insertErr);
        return NextResponse.json(
          { error: "Could not create booking" },
          { status: 500 }
        );
      }

      booking = inserted;
    }

    // Insert a system message into the chat
    const messageText = `I’m happy with this quote (${quote.currency || "USD"} ${
      quote.total_price ?? ""
    }). Please proceed to confirm my booking and share the next steps.`;

    const { data: msg, error: msgErr } = await supabase
      .from("quote_request_messages")
      .insert({
        quote_request_id: enquiry.id,
        sender_role: "traveller",
        message: messageText,
      })
      .select("id, quote_request_id, sender_role, message, created_at")
      .single();

    if (msgErr) {
      console.error("bookings/accept insert message error:", msgErr);
      // Booking already created, so we don't fail booking entirely
      return NextResponse.json(
        {
          booking,
          message: null,
          warning: "Booking created but chat message failed.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        booking,
        message: msg,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("bookings/accept unknown error:", err);
    return NextResponse.json(
      { error: "Unexpected error while accepting booking" },
      { status: 500 }
    );
  }
}
