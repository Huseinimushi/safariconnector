// src/app/api/quote-requests/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "no-reply@safariconnector.com";
const ADMIN_EMAIL =
  process.env.ADMIN_NOTIF_EMAIL || "info@safariconnector.com";

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

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<PublicQuotePayload>;

    if (!body.trip_id || !body.date || !body.name || !body.email) {
      return NextResponse.json(
        { error: "Missing required fields (name, email, date, trip_id)." },
        { status: 400 }
      );
    }

    if (!isEmail(body.email!)) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const userAgent = req.headers.get("user-agent") ?? "unknown";

    // --------- Save to Supabase ----------
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { error: insertError } = await supabase
      .from("quote_requests")
      .insert({
        trip_id: body.trip_id,
        trip_title: body.trip_title ?? null,
        date: body.date,
        pax: body.pax ?? 1,
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        note: body.note ?? null,
        ip,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error("Error inserting quote_requests:", insertError);
      // bado tunamjibu user generic error
      return NextResponse.json(
        { error: "Insert failed" },
        { status: 500 }
      );
    }

    // --------- Optional emails via Resend ----------
    if (resend) {
      const tripLabel =
        body.trip_title && body.trip_title.trim().length > 0
          ? body.trip_title
          : "Safari trip";

      try {
        // Admin email
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `New quote request – ${tripLabel}`,
          html: `
            <p>New quote request received on <b>Safari Connector</b>.</p>
            <p><b>Trip:</b> ${tripLabel} (${body.trip_id})</p>
            <p><b>Date:</b> ${body.date}</p>
            <p><b>Pax:</b> ${body.pax ?? 1}</p>
            <p><b>Name:</b> ${body.name}</p>
            <p><b>Email:</b> ${body.email}</p>
            ${body.phone ? `<p><b>Phone:</b> ${body.phone}</p>` : ""}
            ${body.note ? `<p><b>Note:</b><br/>${body.note}</p>` : ""}
            <hr/>
            <p><b>IP:</b> ${ip}</p>
            <p><b>User-Agent:</b> ${userAgent}</p>
          `,
        });

        // Traveller confirmation
        await resend.emails.send({
          from: FROM_EMAIL,
          to: body.email!,
          subject: "We received your safari quote request",
          html: `
            <p>Hi ${body.name},</p>
            <p>Thanks for using <b>Safari Connector</b>.</p>
            <p>We have received your request for <b>${tripLabel}</b> on <b>${
              body.date
            }</b> for <b>${body.pax ?? 1}</b> traveller(s).</p>
            <p>Our team and/or local operators will review your request and get back to you with tailored offers.</p>
            <p>If you didn't make this request, you can ignore this email.</p>
          `,
        });
      } catch (err) {
        console.error("Error sending emails for quote:", err);
      }
    } else {
      console.warn("RESEND_API_KEY not set – skipping emails for quote.");
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("Unexpected error in /api/quote-requests:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
