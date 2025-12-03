// src/app/api/quotes/by-operator/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/** GET /api/quotes/by-operator?operator_id=... */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const operatorId = searchParams.get("operator_id");

  if (!operatorId) {
    return NextResponse.json({ error: "operator_id required" }, { status: 400 });
  }

  // Minimal safe column set (extend if your schema has more)
  const { data, error } = await supabaseAdmin
    .from("quotes")
    .select(
      "id, lead_id, operator_id, total_price, currency, status, created_at, inclusions, exclusions"
    )
    .eq("operator_id", operatorId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data || [] }, { status: 200 });
}
