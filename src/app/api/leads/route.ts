export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";

/** POST: create lead (client) */
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const body = await req.json();
    const { source_type, source_id, operator_id, start_date, end_date, pax, notes } = body;

    if (!source_type) return NextResponse.json({ error: "source_type required" }, { status: 400 });
    if (!pax || Number(pax) <= 0) return NextResponse.json({ error: "pax required" }, { status: 400 });

    const { data, error } = await supabase
      .from("leads")
      .insert([{
        source_type,
        source_id: source_id || null,
        user_id: user.id,
        operator_id: operator_id || null,
        start_date: start_date || null,
        end_date: end_date || null,
        pax: Number(pax),
        notes: notes || null,
        status: "open",
      }])
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lead_id: data?.id }, { status: 201 });
  } catch (e: any) {
    if (e?.message === "unauthorized") return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

/** GET: list leads for operator (default) or client (?scope=client) */
export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") || "operator";

    if (scope === "client") {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ leads: data ?? [] }, { status: 200 });
    }

    // operator scope
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("operator_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ leads: data ?? [] }, { status: 200 });
  } catch (e: any) {
    if (e?.message === "unauthorized") return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
