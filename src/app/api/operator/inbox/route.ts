// src/app/api/operator/inbox/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ItineraryResult = {
  title: string;
  summary: string;
  destination: string;
  daysCount: number;
  travelDate: string | null;
  budgetRange: string;
  style: string;
  groupType: string;
  experiences: string[];
  days: string[];
  includes: string[];
  excludes: string[];
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function jsonError(message: string, status = 400, extra?: any) {
  return NextResponse.json({ error: message, ...(extra ? { extra } : {}) }, { status });
}

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL).");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * POST /api/operator/inbox
 * Inserts a quote request into `quote_requests`
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Invalid JSON payload.");

    const {
      operator_id,
      anon_id,
      user_id,
      traveller_name,
      traveller_email,
      phone,
      destination,
      when,
      travellers,
      prompt,
      itinerary,
      source_page,
    }: {
      operator_id?: string;
      anon_id?: string;
      user_id?: string | null;
      traveller_name?: string;
      traveller_email?: string | null;
      phone?: string | null;
      destination?: string | null;
      when?: string | null;
      travellers?: number | null;
      prompt?: string | null;
      itinerary?: ItineraryResult | null;
      source_page?: string | null;
    } = body;

    if (!operator_id) return jsonError("operator_id is required.");
    if (!traveller_name || String(traveller_name).trim().length < 2) {
      return jsonError("traveller_name is required.");
    }

    const email = traveller_email ? String(traveller_email).trim().toLowerCase() : null;
    if (email && !isValidEmail(email)) return jsonError("Invalid email.");

    if (!prompt || String(prompt).trim().length < 5) return jsonError("prompt is required.");
    if (!itinerary || !itinerary.title) return jsonError("itinerary is required.");

    const sb = getAdminSupabase();

    // Resolve traveller_id (travellers.id) from auth user_id if present
    let travellerRowId: string | null = null;
    if (user_id) {
      const { data: travellerRow, error: travellerErr } = await sb
        .from("travellers")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();
      if (!travellerErr && travellerRow?.id) {
        travellerRowId = travellerRow.id as string;
      }
    }

    // Align to your exact columns:
    // id, operator_id, full_name, email, country, phone, message, source_page,
    // created_at, date, trip_id, trip_title, pax, name, note, traveller_id, itinerary, anon_id, user_id
    const row = {
      operator_id,
      full_name: String(traveller_name).trim(),
      name: String(traveller_name).trim(), // legacy column; keep aligned
      email,
      phone: phone ? String(phone).trim() : null,

      country: destination ? String(destination).trim() : null, // you can change mapping later
      date: when ? String(when).trim() : null,
      pax: typeof travellers === "number" ? travellers : null,

      trip_title: String(itinerary.title || "").trim() || null,
      trip_id: null,

      message: String(prompt).trim(), // main message
      source_page: source_page || "/plan",

      note: JSON.stringify({
        summary: itinerary.summary || null,
        destination: itinerary.destination || destination || null,
        daysCount: itinerary.daysCount || null,
        travelDate: itinerary.travelDate || when || null,
        budgetRange: itinerary.budgetRange || null,
      }),

      traveller_id: travellerRowId,
      user_id: user_id || null,

      anon_id: anon_id || null,
      itinerary, // jsonb column exists
    };

    const { data, error } = await sb.from("quote_requests").insert(row).select("id").single();

    if (error) {
      // If you still see schema-cache errors after adding columns:
      // Run: notify pgrst, 'reload schema';
      return jsonError(error.message || "Insert failed.", 400, error);
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}
