// src/app/api/bookings/route.ts
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

/* ───────────────── Types ───────────────── */

type CreateBookingPayload = {
  trip_id: string;
  date_from: string; // "2025-12-20"
  date_to?: string; // optional, default = date_from
  pax: number;
  total_amount: number;
  currency?: string; // default "USD"
  quote_id?: string | null;
};

/* ───────────────── Helpers ───────────────── */

/**
 * Your requireUser() returns RequireUserResult (not the raw user).
 * This helper extracts userId safely without changing your auth implementation.
 */
const getUserIdFromRequireUser = (res: any): string | null => {
  // common shapes:
  // - { user: { id } }
  // - { data: { user: { id } } }
  // - { id } (rare)
  const id =
    res?.user?.id ||
    res?.data?.user?.id ||
    res?.id ||
    null;

  return typeof id === "string" && id.length > 0 ? id : null;
};

/* ───────────────── POST /api/bookings ───────────────── */
/**
 * Create a booking record.
 * - Can be called after direct "Book Now" or after quote acceptance.
 * - Status starts as: awaiting_payment
 */
export const POST = async (req: NextRequest) => {
  try {
    const requireRes = await requireUser();
    const userId = getUserIdFromRequireUser(requireRes);

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as CreateBookingPayload;

    const {
      trip_id,
      date_from,
      date_to,
      pax,
      total_amount,
      currency,
      quote_id,
    } = body;

    if (!trip_id || !date_from || !pax || !total_amount) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (trip_id, date_from, pax, total_amount)",
        },
        { status: 400 }
      );
    }

    if (pax <= 0 || total_amount < 0) {
      return NextResponse.json(
        { error: "Invalid pax or total_amount" },
        { status: 400 }
      );
    }

    // 1) Fetch trip to get operator_id
    const { data: trip, error: tripError } = await supabaseAdmin
      .from("trips")
      .select("id, operator_id")
      .eq("id", trip_id)
      .maybeSingle();

    if (tripError) {
      console.error("bookings POST: fetch trip error:", tripError);
      return NextResponse.json(
        { error: "Could not load trip" },
        { status: 500 }
      );
    }

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const df = date_from;
    const dt = date_to ?? date_from;

    // 2) Insert booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        trip_id,
        traveller_id: userId,
        operator_id: (trip as any).operator_id,
        quote_id: quote_id ?? null,
        status: "awaiting_payment",
        date_from: df,
        date_to: dt,
        pax,
        total_amount,
        currency: currency ?? "USD",
        commission_percentage: 15.0,
        payment_status: "unpaid",
        disbursement_status: "pending",
      })
      .select("*")
      .single();

    if (bookingError) {
      console.error("bookings POST: create booking error:", bookingError);
      return NextResponse.json(
        { error: "Could not create booking" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { booking, message: "Booking created, awaiting payment" },
      { status: 201 }
    );
  } catch (err) {
    console.error("bookings POST: unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error creating booking" },
      { status: 500 }
    );
  }
};

/* ───────────────── GET /api/bookings ───────────────── */
/**
 * GET /api/bookings?role=traveller|operator
 *
 * Traveller  → bookings where traveller_id = user.id
 * Operator   → bookings where operator_id in operator(s) of this user
 */
export const GET = async (req: NextRequest) => {
  try {
    const requireRes = await requireUser();
    const userId = getUserIdFromRequireUser(requireRes);

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") ?? "traveller";

    let query = supabaseAdmin.from("bookings").select("*");

    if (role === "operator") {
      // Find operator ids for this user
      const { data: operators, error: opError } = await supabaseAdmin
        .from("operators")
        .select("id")
        .eq("user_id", userId);

      if (opError) {
        console.error("bookings GET: load operators error:", opError);
        return NextResponse.json(
          { error: "Could not load operator profile" },
          { status: 500 }
        );
      }

      if (!operators || operators.length === 0) {
        return NextResponse.json({ bookings: [] }, { status: 200 });
      }

      const operatorIds = operators.map((o: any) => o.id);
      query = query.in("operator_id", operatorIds);
    } else {
      // Traveller side
      query = query.eq("traveller_id", userId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("bookings GET: list bookings error:", error);
      return NextResponse.json(
        { error: "Could not load bookings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings: data }, { status: 200 });
  } catch (err) {
    console.error("bookings GET: unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error loading bookings" },
      { status: 500 }
    );
  }
};
