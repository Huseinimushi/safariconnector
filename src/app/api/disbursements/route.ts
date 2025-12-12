// src/app/api/disbursements/route.ts
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

type CreateDisbursementPayload = {
  booking_id: string;
  method: "mpesa" | "bank";
  notes?: string;
};

/** Extract user id safely from your RequireUserResult */
const getUserIdFromRequireUser = (res: any): string | null => {
  const id = res?.user?.id || res?.data?.user?.id || res?.id || null;
  return typeof id === "string" && id.length > 0 ? id : null;
};

/**
 * POST /api/disbursements
 *
 * Admin creates a disbursement for a PAID booking.
 * Real Mpesa/bank transfer is handled outside system;
 * here we just track it and mark booking as processing.
 */
export const POST = async (req: NextRequest) => {
  try {
    // ✅ FIX 1: requireUser() takes NO args
    const requireRes = await requireUser();
    // ✅ FIX 2: pull userId safely (not user.id directly)
    const userId = getUserIdFromRequireUser(requireRes);

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("disbursements POST: load profile error:", profileError);
      return NextResponse.json(
        { error: "Could not verify user role" },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can create disbursements" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as CreateDisbursementPayload;
    const { booking_id, method, notes } = body;

    if (!booking_id || !method) {
      return NextResponse.json(
        { error: "Missing required fields (booking_id, method)" },
        { status: 400 }
      );
    }

    // 1) Load booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .maybeSingle();

    if (bookingError) {
      console.error("disbursements POST: load booking error:", bookingError);
      return NextResponse.json(
        { error: "Could not load booking" },
        { status: 500 }
      );
    }

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Cannot disburse a booking that is not fully paid" },
        { status: 400 }
      );
    }

    // 2) Create disbursement record
    const { data: disbursement, error: disbError } = await supabaseAdmin
      .from("disbursements")
      .insert({
        operator_id: booking.operator_id,
        booking_id: booking.id,
        amount: booking.operator_receivable,
        method,
        status: "pending",
        notes: notes ?? null,
      })
      .select("*")
      .single();

    if (disbError) {
      console.error("disbursements POST: create disbursement error:", disbError);
      return NextResponse.json(
        { error: "Could not create disbursement" },
        { status: 500 }
      );
    }

    // 3) Update booking.disbursement_status
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({ disbursement_status: "processing" })
      .eq("id", booking.id)
      .select("*")
      .single();

    if (updateError) {
      console.error(
        "disbursements POST: disbursement created but failed to update booking:",
        updateError
      );
      return NextResponse.json(
        {
          error: "Disbursement created but failed to update booking",
          disbursement,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        disbursement,
        booking: updatedBooking,
        message:
          "Disbursement created. After real Mpesa/bank transfer, mark it as sent (future PATCH).",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("disbursements POST: unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error creating disbursement" },
      { status: 500 }
    );
  }
};
