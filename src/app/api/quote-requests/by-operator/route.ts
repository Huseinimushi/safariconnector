// src/app/api/quote-requests/by-operator/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * GET /api/quote-requests/by-operator?operator_id=...
 *
 * Inarudisha all traveller enquiries (quote_requests)
 * kwa trips za operator husika.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const operatorId = searchParams.get("operator_id");

    if (!operatorId) {
      return NextResponse.json(
        { error: "operator_id required" },
        { status: 400 }
      );
    }

    // 1) Pata trips za huyu operator
    const { data: trips, error: tripsError } = await supabaseAdmin
      .from("trips")
      .select("id, title, operator_id")
      .eq("operator_id", operatorId);

    if (tripsError) {
      console.error("by-operator trips error:", tripsError);
      return NextResponse.json(
        { error: tripsError.message },
        { status: 500 }
      );
    }

    if (!trips || trips.length === 0) {
      // hana trips => hana enquiries
      return NextResponse.json({ requests: [] }, { status: 200 });
    }

    const tripIds = trips.map((t) => t.id);

    // 2) Chukua quote_requests zote za trips hizo
    const { data: requests, error: reqError } = await supabaseAdmin
      .from("quote_requests")
      .select(
        "id, trip_id, trip_title, date, pax, name, email, phone, note, created_at"
      )
      .in("trip_id", tripIds)
      .order("created_at", { ascending: false });

    if (reqError) {
      console.error("by-operator quote_requests error:", reqError);
      return NextResponse.json(
        { error: reqError.message },
        { status: 500 }
      );
    }

    // 3) Enrich na info ya trip (title n.k.)
    const tripById = new Map(
      (trips || []).map((t) => [t.id, t] as const)
    );

    const enriched = (requests || []).map((r) => {
      const t = tripById.get(r.trip_id as string);
      return {
        ...r,
        operator_id: operatorId,
        trip_title: r.trip_title ?? t?.title ?? null,
      };
    });

    return NextResponse.json({ requests: enriched }, { status: 200 });
  } catch (e: any) {
    console.error("Unexpected error in /api/quote-requests/by-operator:", e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
