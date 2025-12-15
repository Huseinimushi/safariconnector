// src/app/api/trips/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // ✅ FIX: supabaseServer() returns Promise => must await
    const supabase = await supabaseServer();

    const { data: trip, error } = await supabase
      .from("trips")
      .select(
        "id,title,description,duration,parks,style,price_from,price_to,images,country,rating,reviews,best_months,overview,highlights,includes,excludes,status,operator_id"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("trip fetch error:", error);
      return NextResponse.json({ error: "Failed to load trip" }, { status: 500 });
    }

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(trip, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/trips/[id] unexpected:", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
