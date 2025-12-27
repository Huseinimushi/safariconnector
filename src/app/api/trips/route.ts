// src/app/api/trips/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getAnonSupabase();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const minDaysRaw = (searchParams.get("minDays") || "").trim();
    const maxDaysRaw = (searchParams.get("maxDays") || "").trim();
    const style = (searchParams.get("style") || "").trim();

    const minDays = minDaysRaw ? Number(minDaysRaw) : null;
    const maxDays = maxDaysRaw ? Number(maxDaysRaw) : null;

    let query = supabase
      .from("trips")
      .select(
        "id,title,description,duration,parks,style,price_from,price_to,images,rating,reviews,best_months,overview,highlights,includes,excludes,status,operator_id,created_at"
      )
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (q) {
      const escaped = q.replace(/,/g, "");
      // ✅ removed country search since column doesn't exist
      query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }

    if (minDays !== null && Number.isFinite(minDays)) query = query.gte("duration", minDays);
    if (maxDays !== null && Number.isFinite(maxDays)) query = query.lte("duration", maxDays);
    if (style) query = query.eq("style", style);

    const { data, error } = await query;

    if (error) {
      console.error("GET /api/trips error:", error);
      return NextResponse.json({ error: "Failed to load trips" }, { status: 500 });
    }

    return NextResponse.json({ trips: data ?? [] }, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/trips unexpected:", e);
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
