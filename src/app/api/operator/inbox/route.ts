// src/app/api/operator/inbox/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/authServer";

/**
 * Resolve Supabase env vars safely across common naming conventions.
 * - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (required for public insert)
 */
function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY || // (some teams use this alias)
    "";

  return { url, service };
}

/**
 * GET /api/operator/inbox
 * Returns inbox items for the currently logged-in operator.
 */
export async function GET(_request: NextRequest) {
  try {
    const { user, supabase } = await requireUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: operatorRow, error: operatorError } = await supabase
      .from("operators_view")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (operatorError || !operatorRow) {
      console.error("operator lookup error:", operatorError);
      return NextResponse.json({ error: "Operator record not found" }, { status: 404 });
    }

    const operatorId = String((operatorRow as any).id);

    const { data, error } = await supabase
      .from("operator_inbox_view")
      .select("*")
      .eq("operator_id", operatorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("inbox load error:", error);
      return NextResponse.json({ error: "Failed to load inbox" }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("inbox unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

/**
 * POST /api/operator/inbox
 * Public endpoint used by AI Studio / lead forms to submit an enquiry to operator inbox.
 *
 * REQUIRED DB:
 * - table: operator_inbox (insert target)
 * - view: operator_inbox_view (used by GET)
 *
 * ENV (server only):
 * - SUPABASE_URL  (or NEXT_PUBLIC_SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE_KEY
 * - OPTIONAL: DEFAULT_OPERATOR_ID (if your Plan page does not yet choose an operator)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // operator id: accept body.operator_id OR fallback to env DEFAULT_OPERATOR_ID
    const operatorIdRaw = String(body.operator_id || "").trim();
    const operatorId = operatorIdRaw || String(process.env.DEFAULT_OPERATOR_ID || "").trim();

    const travellerName = String(body.traveller_name || "").trim();
    const prompt = String(body.prompt || "").trim();
    const itinerary = body.itinerary ?? null;

    if (!operatorId) {
      return NextResponse.json(
        { error: "operator_id is required (or set DEFAULT_OPERATOR_ID in server env)" },
        { status: 400 }
      );
    }
    if (travellerName.length < 2) {
      return NextResponse.json({ error: "traveller_name is required" }, { status: 400 });
    }
    if (!prompt && !itinerary) {
      return NextResponse.json({ error: "Either prompt or itinerary is required" }, { status: 400 });
    }

    const { url, service } = getSupabaseEnv();
    if (!url || !service) {
      return NextResponse.json(
        {
          error:
            "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) OR SUPABASE_SERVICE_ROLE_KEY on server env",
        },
        { status: 500 }
      );
    }

    const admin = createClient(url, service, { auth: { persistSession: false } });

    const travellerEmail = String(body.traveller_email || "").trim().toLowerCase() || null;

    const payload = {
      operator_id: operatorId,
      anon_id: body.anon_id ?? null,
      user_id: body.user_id ?? null,

      traveller_name: travellerName,
      traveller_email: travellerEmail,

      destination: body.destination ?? null,
      when: body.when ?? null,
      travellers: Number.isFinite(Number(body.travellers)) ? Number(body.travellers) : null,
      budget: body.budget ?? null,
      trip_type: body.trip_type ?? null,

      prompt: prompt || null,
      itinerary: itinerary,

      status: String(body.status || "new"),
      source: String(body.source || "ai_studio"),
    };

    const { error } = await admin.from("operator_inbox").insert(payload as any);
    if (error) {
      console.error("operator_inbox insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("POST /operator/inbox unexpected:", err);
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
