// src/app/api/quotes/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const runtime = "nodejs";

/** POST /api/quotes/accept  body: { quote_id, user_id } */
export async function POST(req: NextRequest) {
  try {
    const { quote_id, user_id } = await req.json();
    if (!quote_id) return NextResponse.json({ error: "quote_id required" }, { status: 400 });
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    // fetch quote to get lead_id
    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("id, lead_id, status")
      .eq("id", quote_id)
      .single();
    if (qErr || !quote) return NextResponse.json({ error: qErr?.message || "Quote not found" }, { status: 404 });

    // verify the lead belongs to this user
    const { data: lead, error: lErr } = await supabaseAdmin
      .from("leads")
      .select("id, user_id, status")
      .eq("id", quote.lead_id)
      .single();
    if (lErr || !lead) return NextResponse.json({ error: lErr?.message || "Lead not found" }, { status: 404 });
    if (lead.user_id !== user_id) return NextResponse.json({ error: "Forbidden for this user" }, { status: 403 });

    // mark this quote accepted
    const { error: updQuoteErr } = await supabaseAdmin
      .from("quotes")
      .update({ status: "accepted" })
      .eq("id", quote_id);
    if (updQuoteErr) return NextResponse.json({ error: updQuoteErr.message }, { status: 500 });

    // mark lead accepted
    const { error: updLeadErr } = await supabaseAdmin
      .from("leads")
      .update({ status: "accepted" })
      .eq("id", lead.id);
    if (updLeadErr) return NextResponse.json({ error: updLeadErr.message }, { status: 500 });

    // (optional) decline other quotes on same lead:
    await supabaseAdmin
      .from("quotes")
      .update({ status: "declined" })
      .eq("lead_id", lead.id)
      .neq("id", quote_id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
