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
 * Modes:
 * 1) PUBLIC (no auth required): "Request a quote" form from trip page
 *    Body: {
 *      trip_id,
 *      trip_title?,
 *      date,
 *      pax,
 *      name,
 *      email,
 *      phone?,
 *      note?,
 *      operator_id?,   // for routing to correct operator
 *      traveller_id?   // logged-in traveller id (optional)
 *    }
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
  operator_id?: string | null;
  traveller_id?: string | null;
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
    // 1) PUBLIC CLIENT FORM (no auth required)
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

      // Jaribu kwanza insert na operator_id / traveller_id kama zipo
      const baseInsert: any = {
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
      };

      if (payload.operator_id) {
        baseInsert.operator_id = payload.operator_id;
      }
      if (payload.traveller_id) {
        baseInsert.traveller_id = payload.traveller_id;
      }

      let { error: insertError } = await supabase
        .from("quote_requests")
        .insert(baseInsert);

      // Kama kuna error kwa sababu ya columns extra (operator_id / traveller_id),
      // jaribu tena bila hizo ili isivunje system ya zamani.
      if (
        insertError &&
        typeof insertError.message === "string" &&
        insertError.message.toLowerCase().includes("column") &&
        insertError.message.toLowerCase().includes("does not exist")
      ) {
        console.warn(
          "quote_requests insert failed with extra columns, retrying with minimal payload...",
          insertError.message
        );

        const minimalInsert = {
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
        };

        const retry = await supabase
          .from("quote_requests")
          .insert(minimalInsert);

        insertError = retry.error;
      }

      if (insertError) {
        console.error("Error inserting quote_requests:", insertError);
        return NextResponse.json(
          { error: insertError.message || "Failed to save your request." },
          { status: 500 }
        );
      }

      // ---------- (b) Send emails (if RESEND configured) ----------
      if (resend) {
        const tripLabel =
          payload.trip_title && payload.trip_title.trim().length > 0
            ? payload.trip_title
            : "Safari trip";

        try {
          // Email kwa admin / internal
          await resend.emails.send({
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
              ${
                payload.operator_id
                  ? `<p><b>Operator ID:</b> ${payload.operator_id}</p>`
                  : ""
              }
              <hr/>
              <p><b>IP:</b> ${ip}</p>
              <p><b>User-Agent:</b> ${userAgent}</p>
            `,
          });

          // Email kwa traveller – confirmation
          await resend.emails.send({
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
          });
        } catch (err) {
          console.error("Error sending emails for quote:", err);
        }
      } else {
        console.warn("RESEND_API_KEY not set – skipping emails for quote.");
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // =====================================================
    // 2) OPERATOR QUOTE (AUTH REQUIRED)
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
      console.error("Error inserting operator quote:", error);
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
