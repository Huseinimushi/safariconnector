// src/app/api/trips/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getAnonSupabase();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const minDays = Number(searchParams.get("minDays"));
    const maxDays = Number(searchParams.get("maxDays"));
    const style = (searchParams.get("style") || "").trim();

    let query = supabase
      .from("trips")
      .select(
        `
        id,
        title,
        duration,
        parks,
        style,
        price_from,
        price_to,
        images,
        status,
        operator_id
        `
      )
      .eq("status", "published"); // ✅ public only

    // 🔎 Safe search (only existing columns)
    if (q) {
      const escaped = q.replace(/,/g, "");
      query = query.or(`title.ilike.%${escaped}%`);
    }

    if (!Number.isNaN(minDays)) query = query.gte("duration", minDays);
    if (!Number.isNaN(maxDays)) query = query.lte("duration", maxDays);
    if (style) query = query.eq("style", style);

    const { data, error } = await query;

    if (error) {
      console.error("TRIPS API ERROR:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ trips: data ?? [] }, { status: 200 });
  } catch (e: any) {
    console.error("TRIPS API FATAL:", e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
