// src/app/api/admin/bookings/pending-verification/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/authServer";

/**
 * Supabase service-role client
 * (used for admin-only DB access)
 */
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Comma-separated admin emails
 * e.g. SC_ADMIN_EMAILS=admin1@gmail.com,admin2@gmail.com
 */
const ADMIN_EMAILS = (process.env.SC_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * GET /api/admin/bookings/pending-verification
 *
 * Admin-only endpoint:
 * returns bookings with status = payment_submitted
 */
export async function GET(_req: NextRequest) {
  try {
    /**
     * requireUser() DOES NOT guarantee `.email` on the top level.
     * Depending on implementation it may return:
     *  - { user: { id, email, ... } }
     *  - { id, role, ... }
     *
     * So we safely extract email from possible shapes.
     */
    const auth = await requireUser();

    const email =
      (
        (auth as any)?.user?.email ??
        (auth as any)?.email ??
        ""
      )
        .toString()
        .toLowerCase();

    if (!email || !ADMIN_EMAILS.includes(email)) {
      return NextResponse.json(
        { ok: false, error: "Admin only" },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from("bookings")
      .select(
        [
          "id",
          "quote_id",
          "operator_id",
          "traveller_id",
          "status",
          "payment_status",
          "total_amount",
          "currency",
          "created_at",
        ].join(", ")
      )
      .eq("status", "payment_submitted")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, rows: data || [] },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
