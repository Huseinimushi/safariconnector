export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/authServer";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAILS = (process.env.SC_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser();
    const email = (user.email || "").toLowerCase();

    if (!email || !ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("bookings")
      .select("id, quote_id, operator_id, traveller_id, status, payment_status, total_amount, currency, created_at")
      .eq("status", "payment_submitted")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rows: data || [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
