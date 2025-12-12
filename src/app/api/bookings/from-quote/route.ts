// src/app/api/bookings/from-quote/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type Body = {
  quote_id?: string;
  enquiry_id?: number; // optional (quote_requests.id)
};

/**
 * POST /api/bookings/from-quote
 * Body: { quote_id, enquiry_id? }
 *
 * This route is intentionally typed without Database types to avoid build failures
 * when `@/lib/database.types` is not present in the codebase.
 */
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const quoteId = (body.quote_id || "").trim();
    const enquiryId = body.enquiry_id;

    if (!quoteId) {
      return NextResponse.json({ error: "Missing quote_id" }, { status: 400 });
    }

    // Reuse your existing endpoint that creates a booking from a quote:
    // POST /api/quotes/[id]/accept-booking
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "http://localhost:3000";

    const resp = await fetch(
      `${baseUrl}/api/quotes/${encodeURIComponent(quoteId)}/accept-booking`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward cookies so requireUser(req) works server-side
          Cookie: cookieStore.toString(),
        },
        body: JSON.stringify(
          enquiryId != null ? { enquiry_id: enquiryId } : {}
        ),
      }
    );

    const payload = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return NextResponse.json(
        { error: payload?.error || "Failed to create booking" },
        { status: resp.status }
      );
    }

    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    console.error("bookings/from-quote error:", err);
    return NextResponse.json(
      { error: "Unexpected error while creating booking" },
      { status: 500 }
    );
  }
}
