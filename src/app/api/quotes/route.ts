// src/app/api/quotes/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "no-reply@safariconnector.com";
const ADMIN_EMAIL =
  process.env.ADMIN_NOTIF_EMAIL || "info@safariconnector.com";

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

      const userAgent = req.headers.get("user-agent") ?? "unknown";

      console.log("PUBLIC QUOTE REQUEST", {
        ...payload,
        ip,
        ua: userAgent,
        receivedAt: new Date().toISOString(),
      });

      // ---------- (a) Save to Supabase ----------
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { error: insertError } = await supabase.from("quote_requests").insert({
        trip_id: payload.trip_id,
        trip_title: payload.trip_title ?? null,
        date: payload.date,
        pax: payload.pax ?? 1,
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? null,
        note: payload.note ?? null,
        ip,
        user_agent: userAgent,
      });

      if (insertError) {
        console.error("Error inserting quote_requests:", insertError);
        // bado tunamjibu user OK ili asione error ya system
      }

      // ---------- (b) Send emails (if RESEND configured) ----------
      if (resend) {
        const tripLabel =
          payload.trip_title && payload.trip_title.trim().length > 0
            ? payload.trip_title
            : "Safari trip";

        // Email kwa admin / internal
        resend.emails
          .send({
            from: FROM_EMAIL,
            to: ADMIN_EMAIL,
            subject: `New quote request – ${tripLabel}`,
            html: `
              <p>New quote request received on <b>Safari Connector</b>.</p>
              <p><b>Trip:</b> ${tripLabel} (${payload.trip_id})</p>
              <p><b>Date:</b> ${payload.date}</p>
              <p><b>Pax:</b> ${payload.pax ?? 1}</p>
              <p><b>Name:</b> ${payload.name}</p>
              <p><b>Email:</b> ${payload.email}</p>
              ${
                payload.phone
                  ? `<p><b>Phone:</b> ${payload.phone}</p>`
                  : ""
              }
              ${
                payload.note
                  ? `<p><b>Note:</b><br/>${payload.note}</p>`
                  : ""
              }
              <hr/>
              <p><b>IP:</b> ${ip}</p>
              <p><b>User-Agent:</b> ${userAgent}</p>
            `,
          })
          .catch((err) =>
            console.error("Error sending admin quote email:", err)
          );

        // Email kwa traveller – confirmation
        resend.emails
          .send({
            from: FROM_EMAIL,
            to: payload.email!,
            subject: "We received your safari quote request",
            html: `
              <p>Hi ${payload.name},</p>
              <p>Thanks for using <b>Safari Connector</b>.</p>
              <p>We have received your request for <b>${tripLabel}</b> on <b>${
              payload.date
            }</b> for <b>${payload.pax ?? 1}</b> traveller(s).</p>
              <p>Our team and/or local operators will review your request and get back to you with tailored offers.</p>
              <p>If you didn't make this request, you can ignore this email.</p>
            `,
          })
          .catch((err) =>
            console.error("Error sending traveller confirmation email:", err)
          );
      } else {
        console.warn("RESEND_API_KEY not set – skipping emails for quote.");
      }

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
    console.error("Unexpected error in /api/quotes:", e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
