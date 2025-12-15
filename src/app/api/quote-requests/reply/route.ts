// src/app/api/quote-requests/reply/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "no-reply@safariconnector.com";

type ReplyPayload = {
  quote_request_id: string;
  message: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<ReplyPayload>;
    const quoteRequestId = body.quote_request_id;
    const msg = (body.message || "").trim();

    if (!quoteRequestId || !msg) {
      return NextResponse.json(
        { error: "quote_request_id and message are required." },
        { status: 400 }
      );
    }

    // 1) Hakikisha user yupo na ni operator
    const { supabase, user } = await requireUser();

    // ✅ FIX: user can be null (TypeScript + security)
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: opRow, error: opError } = await supabase
      .from("operators")
      .select("id, name, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (opError) {
      console.error("reply operator load error:", opError);
      return NextResponse.json(
        { error: "Failed to load operator profile." },
        { status: 500 }
      );
    }

    if (!opRow) {
      return NextResponse.json(
        { error: "Operator profile not found." },
        { status: 403 }
      );
    }

    // 2) Soma enquiry kutoka quote_requests (admin client ili kuepuka RLS issues)
    const { data: qr, error: qrError } = await supabaseAdmin
      .from("quote_requests")
      .select("id, operator_id, name, email, trip_title, date, pax, note")
      .eq("id", quoteRequestId)
      .maybeSingle();

    if (qrError) {
      console.error("reply load quote_request error:", qrError);
      return NextResponse.json(
        { error: "Failed to load enquiry." },
        { status: 500 }
      );
    }

    if (!qr) {
      return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
    }

    if (qr.operator_id && qr.operator_id !== opRow.id) {
      return NextResponse.json(
        { error: "You do not have access to this enquiry." },
        { status: 403 }
      );
    }

    // 3) ✅ Save message in DB (admin client to avoid RLS issues)
    // NOTE: rename table/columns if your schema differs
    const { error: msgErr } = await supabaseAdmin
      .from("quote_request_messages")
      .insert([
        {
          quote_request_id: quoteRequestId,
          sender_role: "operator",
          sender_id: opRow.id,
          message: msg,
        },
      ]);

    if (msgErr) {
      console.error("reply insert message error:", msgErr);
      return NextResponse.json(
        { error: "Failed to save message." },
        { status: 500 }
      );
    }

    // 4) Kama hakuna Resend tuna-skip email (but DB already saved)
    if (!resend) {
      console.warn(
        "RESEND_API_KEY not set – skipping traveller email notification."
      );
      return NextResponse.json({ ok: true, emailSent: false }, { status: 200 });
    }

    const travellerName = qr.name || "traveller";
    const tripLabel =
      (qr.trip_title && qr.trip_title.trim().length > 0
        ? qr.trip_title
        : "your safari enquiry") ?? "your safari enquiry";

    const travelDates = qr.date
      ? new Date(qr.date).toLocaleDateString()
      : "Flexible / not specified";

    const paxLabel =
      qr.pax != null ? `${qr.pax} traveller(s)` : "Group size not specified";

    await resend.emails.send({
      from: FROM_EMAIL,
      to: qr.email,
      subject: `New message about ${tripLabel}`,
      html: `
        <p>Hi ${travellerName},</p>
        <p>You have a new message from <b>${opRow.name || "your safari operator"}</b> regarding <b>${tripLabel}</b> on Safari Connector.</p>
        <p><b>Operator message:</b></p>
        <blockquote style="border-left: 3px solid #d1d5db; margin: 8px 0; padding: 4px 8px; white-space: pre-line;">
          ${msg.replace(/\n/g, "<br/>")}
        </blockquote>
        <p><b>Enquiry details:</b></p>
        <ul>
          <li>Preferred date(s): ${travelDates}</li>
          <li>Group: ${paxLabel}</li>
        </ul>
        <p>You can reply directly to this email and your operator will receive your response.</p>
        <p>Warm regards,<br/>Safari Connector</p>
      `,
    });

    return NextResponse.json({ ok: true, emailSent: true }, { status: 200 });
  } catch (e: any) {
    console.error("Unexpected error in /api/quote-requests/reply:", e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
