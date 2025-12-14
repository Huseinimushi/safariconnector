// src/app/api/operators/quotes/upsert/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/authServer";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Payload = {
  enquiry_id: string; // required
  quote_id?: string | null; // optional (if updating existing quote)
  operator_id?: string | null; // optional (we can infer)
  total_price?: number | string | null;
  currency?: string | null;
  notes?: string | null;
  inclusions?: string[] | string | null;
  exclusions?: string[] | string | null;
  status?: string | null; // pending/answered/archived etc. (optional)
};

const normaliseText = (v: any) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

const normaliseNumber = (v: any) => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const normaliseArrayOrText = (v: any): string[] | null => {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const arr = v.map((x) => String(x).trim()).filter(Boolean);
    return arr.length ? arr : null;
  }
  // allow comma-separated string
  const s = String(v).trim();
  if (!s) return null;
  const arr = s.split(",").map((x) => x.trim()).filter(Boolean);
  return arr.length ? arr : [s];
};

export async function POST(req: NextRequest) {
  try {
    // ✅ FIX: requireUser takes 0 args in your project
    const auth = await requireUser();

    // userId may exist as auth.user.id or auth.id depending on your helper
    const userId =
      (auth as any)?.user?.id ??
      (auth as any)?.id ??
      null;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as Payload | null;
    if (!body?.enquiry_id) {
      return NextResponse.json(
        { ok: false, error: "Missing enquiry_id" },
        { status: 400 }
      );
    }

    // 1) Find operator by auth user (to enforce ownership)
    const { data: op, error: opErr } = await admin
      .from("operators")
      .select("id, user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (opErr) {
      return NextResponse.json(
        { ok: false, error: opErr.message },
        { status: 500 }
      );
    }

    if (!op?.id) {
      return NextResponse.json(
        { ok: false, error: "Operator profile not found" },
        { status: 403 }
      );
    }

    const operatorId = op.id;

    // 2) Ensure enquiry belongs to this operator (safety)
    const { data: enquiry, error: enqErr } = await admin
      .from("quote_requests")
      .select("id, operator_id, trip_id, trip_title")
      .eq("id", body.enquiry_id)
      .maybeSingle();

    if (enqErr) {
      return NextResponse.json(
        { ok: false, error: enqErr.message },
        { status: 500 }
      );
    }

    if (!enquiry?.id) {
      return NextResponse.json(
        { ok: false, error: "Enquiry not found" },
        { status: 404 }
      );
    }

    if (enquiry.operator_id && enquiry.operator_id !== operatorId) {
      return NextResponse.json(
        { ok: false, error: "Not allowed" },
        { status: 403 }
      );
    }

    // 3) Build upsert payload (quotes table)
    const upsertPayload: any = {
      enquiry_id: body.enquiry_id,
      operator_id: operatorId,
      total_price: normaliseNumber(body.total_price),
      currency: normaliseText(body.currency) || "USD",
      notes: normaliseText(body.notes),
      inclusions: normaliseArrayOrText(body.inclusions),
      exclusions: normaliseArrayOrText(body.exclusions),
      status: normaliseText(body.status) || "answered",
      updated_at: new Date().toISOString(),
    };

    // If your quotes table uses id and you want update:
    if (body.quote_id) upsertPayload.id = body.quote_id;

    const { data: saved, error: saveErr } = await admin
      .from("quotes")
      .upsert(upsertPayload, { onConflict: "id" })
      .select("*")
      .maybeSingle();

    if (saveErr) {
      return NextResponse.json(
        { ok: false, error: saveErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, quote: saved },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
