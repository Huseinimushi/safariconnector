// src/app/api/operators/quotes/from-enquiry/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

type Body = {
  enquiry_id: number | string;
  total_price: number | string;
  notes?: string | null;
};

export const POST = async (req: NextRequest) => {
  try {
    // -------- Parse body --------
    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch (err) {
      console.error("from-enquiry: invalid json body:", err);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    console.log("from-enquiry incoming body:", body);

    const { enquiry_id, total_price, notes } = body;

    const enquiryId = Number(enquiry_id);
    const totalPrice = Number(total_price);

    if (!enquiryId || Number.isNaN(enquiryId)) {
      return NextResponse.json(
        { error: "Invalid enquiry_id" },
        { status: 400 }
      );
    }

    if (!totalPrice || totalPrice <= 0 || Number.isNaN(totalPrice)) {
      return NextResponse.json(
        { error: "Total price must be greater than 0" },
        { status: 400 }
      );
    }

    // -------- Load enquiry (get trip_id) --------
    const { data: enquiry, error: enqErr } = await supabaseAdmin
      .from("quote_requests")
      .select("id, trip_id, email")
      .eq("id", enquiryId)
      .maybeSingle();

    if (enqErr) {
      console.error("from-enquiry: load enquiry error:", enqErr);
      return NextResponse.json(
        { error: enqErr.message || "Could not load enquiry" },
        { status: 500 }
      );
    }

    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    const tripId = enquiry.trip_id as string | null;
    if (!tripId) {
      return NextResponse.json(
        {
          error:
            "Enquiry is missing trip information. Please contact Safari Connector.",
        },
        { status: 400 }
      );
    }

    // -------- Load trip to get operator_id --------
    const { data: trip, error: tripErr } = await supabaseAdmin
      .from("trips")
      .select("operator_id")
      .eq("id", tripId)
      .maybeSingle();

    if (tripErr) {
      console.error("from-enquiry: load trip error:", tripErr);
      return NextResponse.json(
        { error: tripErr.message || "Could not load trip" },
        { status: 500 }
      );
    }

    if (!trip || !trip.operator_id) {
      return NextResponse.json(
        { error: "Trip has no operator assigned" },
        { status: 400 }
      );
    }

    const operatorId = trip.operator_id as string;

    // -------- Create quote (linked to this enquiry) --------
    const { data: quote, error: quoteErr } = await supabaseAdmin
      .from("quotes")
      .insert({
        operator_id: operatorId,
        trip_id: tripId,
        quote_request_id: enquiryId, // LINK ↔ quote_requests
        total_price: totalPrice,
        currency: "USD",
        notes: notes ?? null,
      })
      .select("*")
      .single();

    if (quoteErr) {
      console.error("from-enquiry: insert quote error:", quoteErr);
      return NextResponse.json(
        { error: quoteErr.message || "Could not create quote" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { quote, message: "Quote created from enquiry" },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("from-enquiry: unexpected error:", err);
    const msg =
      (err &&
        typeof err === "object" &&
        "message" in err &&
        (err as any).message) ||
      "Unexpected error creating quote";

    return NextResponse.json({ error: msg }, { status: 500 });
  }
};
