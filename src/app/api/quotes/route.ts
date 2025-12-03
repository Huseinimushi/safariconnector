// src/app/api/quotes/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";

/**
 * POST /api/quotes
 *
 * Two modes in one endpoint:
 * 1) PUBLIC (no auth): client-side “Request a Quote” form
 *    Body: { trip_id, trip_title?, date, pax, name, email, phone?, note? }
 *
 * 2) OPERATOR (auth required): create/send a formal quote for an existing lead
 *    Body: { lead_id, total_price, currency?, inclusions?, exclusions?, status? }
 */

type PublicQuotePayload = {
  trip_id: string;
  trip_title?: string;
  date: string;
  pax: number;
  name: string;
  email: string;
  phone?: string;
  note?: string;
};

type OperatorQuotePayload = {
  lead_id: string;
  total_price: number;
  currency?: string;
  inclusions?: string[];
  exclusions?: string[];
  status?: string;
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // =====================================================
    //  1) PUBLIC CLIENT FORM (no auth required)
    // =====================================================
    if (body?.trip_id) {
      const payload = body as Partial<PublicQuotePayload>;

      if (!payload.trip_id || !payload.date || !payload.name || !payload.email) {
        return NextResponse.json(
          { error: "Missing required fields (name, email, date, trip_id)." },
          { status: 400 }
        );
      }
      if (!isEmail(payload.email!)) {
        return NextResponse.json(
          { error: "Invalid email." },
          { status: 400 }
        );
      }

      // Extract caller IP safely
      const forwardedFor = req.headers.get("x-forwarded-for");
      const ip =
        forwardedFor?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown";

      console.log("PUBLIC QUOTE REQUEST", {
        ...payload,
        ip,
        ua: req.headers.get("user-agent"),
        receivedAt: new Date().toISOString(),
      });

      // TODO:
      // - Insert into `quote_requests`
      // - Notify operator
      // - Rate-limit by IP

      return NextResponse.json({ ok: true });
    }

    // =====================================================
    //  2) OPERATOR QUOTE (AUTH REQUIRED)
    // =====================================================
    const { supabase, user } = await requireUser();

    const {
      lead_id,
      total_price,
      currency,
      inclusions,
      exclusions,
      status,
    } = body as OperatorQuotePayload;

    if (!lead_id) {
      return NextResponse.json({ error: "lead_id required" }, { status: 400 });
    }
    if (!total_price || Number(total_price) <= 0) {
      return NextResponse.json(
        { error: "total_price required" },
        { status: 400 }
      );
    }

    // Validate the lead exists
    const { data: lead, error: lErr } = await supabase
      .from("leads")
      .select("id, operator_id, status")
      .eq("id", lead_id)
      .single();

    if (lErr || !lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    // Insert a quote
    const { data, error } = await supabase
      .from("quotes")
      .insert([
        {
          lead_id,
          operator_id: user.id,
          total_price: Number(total_price),
          currency: currency || "USD",
          inclusions: Array.isArray(inclusions) ? inclusions : [],
          exclusions: Array.isArray(exclusions) ? exclusions : [],
          status: status || "sent",
        },
      ])
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quote_id: data?.id }, { status: 201 });

  } catch (e: any) {
    if (e?.message === "Not authenticated") {
      return NextResponse.json(
        { error: "Not signed in" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
