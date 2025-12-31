// src/app/api/itinerary/send-to-operator/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
}

function safeString(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function stringifyItinerarySafe(it: any) {
  try {
    return JSON.stringify(it, null, 2);
  } catch {
    return String(it ?? "");
  }
}

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE env vars." },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceKey);

    const body = await req.json().catch(() => ({}));

    const operator_id = String(body?.operator_id || "").trim();
    const full_name = String(body?.full_name || body?.traveller_name || "").trim();
    const email = String(body?.email || body?.traveller_email || "").trim().toLowerCase();

    if (!operator_id) return NextResponse.json({ error: "operator_id is required" }, { status: 400 });
    if (!full_name || full_name.length < 2)
      return NextResponse.json({ error: "full_name is required" }, { status: 400 });
    if (!isValidEmail(email))
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

    const itinerary = body?.itinerary ?? null;

    // ✅ ONLY SAFE COLUMNS (no anon_id, no user_id)
    // (These are the only fields we will attempt to insert.)
    const baseRow: Record<string, any> = {
      operator_id,
      full_name,
      email,
      destination: safeString(body?.destination),
      when: safeString(body?.when),
      travellers: Number.isFinite(Number(body?.travellers)) ? Number(body.travellers) : null,
      budget: safeString(body?.budget),
      trip_type: safeString(body?.trip_type),
      source: safeString(body?.source) || "ai_studio",
      status: safeString(body?.status) || "new",
      prompt: String(body?.prompt || "").trim() || null,
    };

    // --- Attempt 1: if DB has itinerary column, store JSON ---
    const rowWithItinerary = { ...baseRow, itinerary };

    const { data: created1, error: err1 } = await supabase
      .from("quote_requests")
      .insert(rowWithItinerary)
      .select("id")
      .single();

    if (!err1) return NextResponse.json({ ok: true, id: created1?.id });

    const msg1 = String((err1 as any)?.message || err1 || "");

    // If itinerary column missing, retry without it (store itinerary as text in prompt)
    const itineraryMissing =
      msg1.toLowerCase().includes("could not find") &&
      msg1.toLowerCase().includes("itinerary") &&
      msg1.toLowerCase().includes("quote_requests");

    if (!itineraryMissing) {
      // Any other schema mismatch will be shown clearly
      return NextResponse.json({ error: msg1 || "Failed to create quote request." }, { status: 500 });
    }

    const fallbackPrompt =
      (baseRow.prompt ? baseRow.prompt + "\n\n" : "") +
      "---- AI ITINERARY (stored as text because quote_requests.itinerary is missing) ----\n" +
      stringifyItinerarySafe(itinerary);

    const fallbackRow = { ...baseRow, prompt: fallbackPrompt };

    const { data: created2, error: err2 } = await supabase
      .from("quote_requests")
      .insert(fallbackRow)
      .select("id")
      .single();

    if (err2) {
      const msg2 = String((err2 as any)?.message || err2 || "");
      return NextResponse.json({ error: msg2 || "Failed to create quote request." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id: created2?.id,
      warning: "Itinerary saved inside prompt because itinerary column is missing.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected server error." }, { status: 500 });
  }
}
