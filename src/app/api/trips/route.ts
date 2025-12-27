// src/app/api/trips/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TripRow = {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  parks: string[] | null;
  style: string | null;
  price_from: number | null;
  price_to: number | null;
  images: string[] | null;
  country: string | null;
  rating: number | null;
  reviews: number | null;
  best_months: string[] | null;
  overview: string | null;
  highlights: string[] | null;
  includes: string[] | null;
  excludes: string[] | null;
  status: string | null;
  operator_id: string | null;
};

function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // Fail fast with clear message (helps on Vercel env misconfig)
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: {
        // optional: helps Supabase logs identify your API
        "X-Client-Info": "safariconnector-public-trips",
      },
    },
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

    // Defensive numeric parsing
    const minDaysOk = typeof minDays === "number" && Number.isFinite(minDays) ? minDays : null;
    const maxDaysOk = typeof maxDays === "number" && Number.isFinite(maxDays) ? maxDays : null;

    let query = supabase
      .from("trips")
      .select(
        "id,title,description,duration,parks,style,price_from,price_to,images,country,rating,reviews,best_months,overview,highlights,includes,excludes,status,operator_id"
      )
      .eq("status", "published")
      .order("created_at", { ascending: false });

    // Server-side filters (optional but matches your UI params)
    if (q) {
      // NOTE: Supabase `.or()` uses PostgREST syntax; keep it simple & indexed fields
      // If you later add full-text search, we can replace this.
      const escaped = q.replace(/,/g, ""); // avoid breaking `or` syntax
      query = query.or(
        `title.ilike.%${escaped}%,description.ilike.%${escaped}%,country.ilike.%${escaped}%`
      );
    }

    if (minDaysOk !== null) query = query.gte("duration", minDaysOk);
    if (maxDaysOk !== null) query = query.lte("duration", maxDaysOk);

    if (style) query = query.eq("style", style);

    const { data, error } = await query.returns<TripRow[]>();

    if (error) {
      console.error("GET /api/trips error:", error);
      return NextResponse.json({ error: "Failed to load trips" }, { status: 500 });
    }

    // Return stable shape your client can depend on
    return NextResponse.json(
      { trips: data ?? [] },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    console.error("GET /api/trips unexpected:", e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
