// src/app/api/payments/route.ts
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

type ManualPaymentPayload = {
  booking_id: string;
  method: "mpesa" | "card";
  amount: number;
  provider_reference?: string;
};

/**
 * POST /api/payments
 *
 * For now: manual recording of a payment (Mpesa or Card).
 * In future: this will be called by PSP / Mpesa webhooks.
 */
export const POST = async (req: NextRequest) => {
  try {
    // ✅ FIX: requireUser() takes NO args in your project
    const auth = await requireUser();
    const user: any = (auth as any)?.user ?? auth;

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ManualPaymentPayload;
    const { booking_id, method, amount, provider_reference } = body;

    if (!booking_id || !method || !amount) {
      return NextResponse.json(
        { error: "Missing required fields (booking_id, method, amount)" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
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
      console.error("payments POST: load booking error:", bookingError);
      return NextResponse.json(
        { error: "Could not load booking" },
        { status: 500 }
      );
    }

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only traveller who owns the booking OR admin can mark payment
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    if (!isAdmin && booking.traveller_id !== user.id) {
      return NextResponse.json(
        { error: "Not allowed to pay this booking" },
        { status: 403 }
      );
    }

    // Basic rule: treat as full payment if amount >= total_amount
    const isFullPayment = amount >= Number(booking.total_amount ?? 0);

    const newPaymentStatus = isFullPayment ? "paid" : "partially_paid";
    const newBookingStatus = isFullPayment ? "paid" : booking.status;

    // 2) Insert payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        booking_id,
        method,
        amount,
        status: "successful",
        provider_reference: provider_reference ?? null,
      })
      .select("*")
      .single();

    if (paymentError) {
      console.error("payments POST: create payment error:", paymentError);
      return NextResponse.json(
        { error: "Could not create payment" },
        { status: 500 }
      );
    }

    // 3) Update booking payment_status + status
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        payment_status: newPaymentStatus,
        status: newBookingStatus,
        payment_reference: provider_reference ?? (payment as any)?.id,
      })
      .eq("id", booking_id)
      .select("*")
      .single();

    if (updateError) {
      console.error(
        "payments POST: payment created but failed to update booking:",
        updateError
      );
      return NextResponse.json(
        { error: "Payment created but failed to update booking", payment },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        payment,
        booking: updatedBooking,
        message: "Payment recorded successfully",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("payments POST: unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error recording payment" },
      { status: 500 }
    );
  }
};
