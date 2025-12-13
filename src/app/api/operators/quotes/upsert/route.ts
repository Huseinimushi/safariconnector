// src/app/api/operators/quotes/upsert/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authServer";

type Payload = {
  enquiry_id: number;
  total_price: number | null;
  currency?: string | null;
  notes?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req); // MUST return the authed user (your existing helper)
    const body = (await req.json().catch(() => null)) as Payload | null;

    if (!body?.enquiry_id) {
      return NextResponse.json({ ok: false, error: "Missing enquiry_id" }, { status: 400 });
    }

    // 1) Find operator profile by user.id
    let operatorId: string | null = null;

    const opView = await supabaseAdmin
      .from("operators_view")
      .select("id,user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (opView.data?.id) operatorId = opView.data.id;

    if (!operatorId) {
      const op = await supabaseAdmin
        .from("operators")
        .select("id,user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (op.data?.id) operatorId = op.data.id;
    }

    if (!operatorId) {
      return NextResponse.json({ ok: false, error: "Operator profile not found for this account." }, { status: 403 });
    }

    // 2) Validate enquiry belongs to this operator
    const enquiryResp = await supabaseAdmin
      .from("quote_requests")
      .select("id,operator_id,trip_id,trip_title,pax,date")
      .eq("id", body.enquiry_id)
      .maybeSingle();

    if (enquiryResp.error) {
      return NextResponse.json(
        { ok: false, error: enquiryResp.error.message || "Failed to load enquiry." },
        { status: 500 }
      );
    }

    const enquiry = enquiryResp.data;
    if (!enquiry) {
      return NextResponse.json({ ok: false, error: "Enquiry not found." }, { status: 404 });
    }

    if (enquiry.operator_id !== operatorId) {
      return NextResponse.json({ ok: false, error: "You are not allowed to quote on this enquiry." }, { status: 403 });
    }

    // 3) Upsert quote (prefer update if exists)
    const existing = await supabaseAdmin
      .from("quotes")
      .select("id,quote_request_id,operator_id,total_price,currency,notes,created_at")
      .eq("quote_request_id", body.enquiry_id)
      .eq("operator_id", operatorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const total = typeof body.total_price === "number" ? body.total_price : null;
    const currency = (body.currency || "USD").toUpperCase();
    const notes = body.notes?.trim() ? body.notes.trim() : null;

    if (existing.data?.id) {
      const upd = await supabaseAdmin
        .from("quotes")
        .update({
          total_price: total,
          currency,
          notes,
        })
        .eq("id", existing.data.id)
        .select("id,quote_request_id,operator_id,total_price,currency,notes,created_at")
        .single();

      if (upd.error) {
        return NextResponse.json({ ok: false, error: upd.error.message || "Failed to update quote." }, { status: 500 });
      }

      return NextResponse.json({ ok: true, quote: upd.data });
    }

    const ins = await supabaseAdmin
      .from("quotes")
      .insert({
        quote_request_id: body.enquiry_id,
        operator_id: operatorId,
        total_price: total,
        currency,
        notes,
      })
      .select("id,quote_request_id,operator_id,total_price,currency,notes,created_at")
      .single();

    if (ins.error) {
      return NextResponse.json({ ok: false, error: ins.error.message || "Failed to create quote." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, quote: ins.data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected server error." },
      { status: e?.status || 500 }
    );
  }
}
