export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(); // client must be logged in
    const { quote_id, decision, reason } = await req.json();

    if (!quote_id) return NextResponse.json({ error: "quote_id required" }, { status: 400 });
    if (!["accept", "decline"].includes(decision)) {
      return NextResponse.json({ error: "decision must be 'accept' or 'decline'" }, { status: 400 });
    }

    // fetch quote + lead with admin so RLS doesn't block
    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("id, lead_id, status")
      .eq("id", quote_id)
      .single();
    if (qErr || !quote) return NextResponse.json({ error: qErr?.message || "Quote not found" }, { status: 404 });

    const { data: lead, error: lErr } = await supabaseAdmin
      .from("leads")
      .select("id, user_id, status, notes")
      .eq("id", quote.lead_id)
      .single();
    if (lErr || !lead) return NextResponse.json({ error: lErr?.message || "Lead not found" }, { status: 404 });

    if (lead.user_id !== user.id) return NextResponse.json({ error: "Forbidden for this user" }, { status: 403 });

    const leadStatus = decision === "accept" ? "booked" : "cancelled";
    const thisQuoteStatus = decision === "accept" ? "accepted" : "declined";

    const uq = await supabaseAdmin.from("quotes").update({ status: thisQuoteStatus }).eq("id", quote_id);
    if (uq.error) return NextResponse.json({ error: uq.error.message }, { status: 500 });

    const ul = await supabaseAdmin.from("leads").update({ status: leadStatus }).eq("id", lead.id);
    if (ul.error) return NextResponse.json({ error: ul.error.message }, { status: 500 });

    if (decision === "accept") {
      await supabaseAdmin.from("quotes").update({ status: "declined" }).eq("lead_id", lead.id).neq("id", quote_id);
    }

    if (reason && typeof reason === "string" && reason.trim()) {
      const tag = decision === "accept" ? "ACCEPTED" : "DECLINED";
      await supabaseAdmin.from("leads").update({ notes: `[${tag}] ${reason.trim()}${lead.notes ? ` | ${lead.notes}` : ""}` }).eq("id", lead.id);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    if (e?.message === "unauthorized") return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
