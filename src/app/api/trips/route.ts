// src/app/api/trips/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(_req: NextRequest) {
  try {
    // ✅ FIX: must await
    const supabase = await supabaseServer();

    const { data, error } = await supabase
      .from("trips")
      .select(
        "id,title,description,duration,parks,style,price_from,price_to,images,country,rating,reviews,best_months,overview,highlights,includes,excludes,status,operator_id"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("trips fetch error:", error);
      return NextResponse.json({ error: "Failed to load trips" }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (e: any) {
    console.error("GET /api/trips unexpected:", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
