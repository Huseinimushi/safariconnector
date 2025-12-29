// src/app/api/operator/inbox/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/authServer";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
}

/**
 * OPTIONS (helps in some deployments / preflight)
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
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
      return NextResponse.json(
        { error: "Operator record not found" },
        { status: 404 }
      );
    }

    const operatorId = String((operatorRow as any).id);

    const { data, error } = await supabase
      .from("operator_inbox_view")
      .select("*")
      .eq("operator_id", operatorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("inbox load error:", error);
      return NextResponse.json(
        { error: "Failed to load inbox" },
        { status: 500 }
      );
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
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Inputs from AI Studio UI
    // We allow operator_id optional (fallback), because plan page doesn't choose operator yet.
    const operatorIdRaw = String(body.operator_id || "").trim();
    const operatorId = operatorIdRaw || "public"; // fallback to keep UX working
    const travellerName = String(body.traveller_name || "").trim();
    const prompt = String(body.prompt || "").trim();
    const itinerary = body.itinerary ?? null;

    if (travellerName.length < 2) {
      return NextResponse.json(
        { error: "traveller_name is required" },
        { status: 400 }
      );
    }

    const travellerEmail = String(body.traveller_email || "")
      .trim()
      .toLowerCase();

    if (travellerEmail && !isValidEmail(travellerEmail)) {
      return NextResponse.json(
        { error: "traveller_email is invalid" },
        { status: 400 }
      );
    }

    if (!prompt && !itinerary) {
      return NextResponse.json(
        { error: "Either prompt or itinerary is required" },
        { status: 400 }
      );
    }

    const url = process.env.SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !service) {
      return NextResponse.json(
        { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const admin = createClient(url, service, {
      auth: { persistSession: false },
    });

    const payload = {
      operator_id: operatorId,
      anon_id: body.anon_id ?? null,
      user_id: body.user_id ?? null,
      traveller_name: travellerName,
      traveller_email: travellerEmail || null,
      destination: body.destination ?? null,
      when: body.when ?? null,
      travellers: Number.isFinite(Number(body.travellers))
        ? Number(body.travellers)
        : null,
      budget: body.budget ?? null,
      trip_type: body.trip_type ?? null,
      prompt: prompt || null,
      itinerary: itinerary,
      status: "new",
      source: body.source ?? "ai_studio",
    };

    const { error } = await admin.from("operator_inbox").insert(payload);
    if (error) {
      console.error("operator_inbox insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("POST /operator/inbox unexpected:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
