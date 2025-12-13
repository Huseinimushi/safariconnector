// src/app/api/admin/bookings/verify-payment/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/admin/bookings/verify-payment
 * Auth: Bearer token required
 * Body: { booking_id: string, paid_status?: "paid_in_full" | "deposit_paid" }
 *
 * Updates:
 *  status -> payment_verified
 *  payment_status -> paid_in_full (default) OR deposit_paid
 *
 * IMPORTANT:
 *  You must enforce admin/finance authorization here.
 */

function jsonError(status: number, error: string, extra?: Record<string, any>) {
  return NextResponse.json({ ok: false, error, ...(extra || {}) }, { status });
}

function getBearerToken(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

function isUuid(v: any) {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

// TODO: Replace this with your real admin rule (role claim, profiles table, etc.)
async function requireAdmin(token: string) {
  const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userResp?.user) return { ok: false, status: 401, error: "Invalid/expired session." };

  const user = userResp.user;

  // Example approach:
  // 1) store role in user_metadata.role = "admin"
  // 2) or have profiles table with role column
  const role =
    (user.user_metadata?.role as string | undefined) ||
    (user.app_metadata?.role as string | undefined) ||
    null;

  if (role !== "admin" && role !== "finance") {
    return { ok: false, status: 403, error: "Access denied. Admin/Finance only." };
  }

  return { ok: true as const, user };
}

export async function POST(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) return jsonError(401, "Missing Authorization Bearer token.");

    const adminCheck = await requireAdmin(token);
    if (!adminCheck.ok) return jsonError(adminCheck.status, adminCheck.error);

    const body = await req.json().catch(() => null);
    const booking_id = body?.booking_id;
    const paid_status = body?.paid_status === "deposit_paid" ? "deposit_paid" : "paid_in_full";

    if (!isUuid(booking_id)) return jsonError(400, "Invalid booking_id (must be UUID).");

    // Load booking
    const { data: existing, error: findErr } = await supabaseAdmin
      .from("bookings")
      .select("id, status, payment_status")
      .eq("id", booking_id)
      .maybeSingle();

    if (findErr) return jsonError(500, "Failed to load booking.", { details: findErr });
    if (!existing) return jsonError(404, "Booking not found.");

    // Verify payment
    const { data: updated, error: upErr } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "payment_verified",
        payment_status: paid_status,
      })
      .eq("id", booking_id)
      .select(
        "id, trip_id, traveller_id, operator_id, quote_id, status, date_from, date_to, pax, total_amount, currency, payment_status, created_at"
      )
      .single();

    if (upErr) {
      return jsonError(400, upErr.message || "Failed to verify payment.", {
        code: (upErr as any)?.code || null,
        details: (upErr as any)?.details || null,
        hint: (upErr as any)?.hint || null,
      });
    }

    return NextResponse.json({ ok: true, booking: updated });
  } catch (err: any) {
    return jsonError(500, "Unexpected server error.", { message: err?.message || String(err) });
  }
}
