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

    // ✅ Match homepage: trips_view columns
    let query = supabase
      .from("trips_view")
      .select("id,title,duration,parks,price_from,price_to,hero_url,created_at")
      .order("created_at", { ascending: false });

    // Search
    if (q) {
      const escaped = q.replace(/,/g, "");
      query = query.ilike("title", `%${escaped}%`);
    }

    if (minDays !== null && Number.isFinite(minDays)) query = query.gte("duration", minDays);
    if (maxDays !== null && Number.isFinite(maxDays)) query = query.lte("duration", maxDays);

    // NOTE: trips_view probably doesn't have "style"; apply only if column exists in view.
    // If your view has style, keep this. If not, comment it out.
    if (style) {
      query = query.eq("style", style as any);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET /api/trips error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalize to UI Trip type
    const trips = (data ?? []).map((t: any) => ({
      id: t.id,
      title: t.title,
      duration: t.duration ?? 0,
      parks: t.parks ?? [],
      style: t.style ?? "value", // fallback
      price_from: t.price_from ?? null,
      price_to: t.price_to ?? null,
      images: t.hero_url ? [t.hero_url] : [],
      status: "published",
      operator_id: t.operator_id ?? null,
    }));

    return NextResponse.json({ trips }, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/trips fatal:", e);
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
