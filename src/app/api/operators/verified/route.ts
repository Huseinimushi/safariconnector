// src/app/api/operators/verified/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AnyRow = Record<string, any>;

function pickCompanyName(r: AnyRow): string {
  const candidates = [
    r.company_name,
    r.company,
    r.business_name,
    r.operator_name,
    r.name,
    r.title,
    r.display_name,
    r.legal_name,
    r.brand_name,
  ];

  const v = candidates.find((x) => typeof x === "string" && x.trim().length > 0);
  return (v || "Operator").trim();
}

function pickLocation(r: AnyRow): string | null {
  const candidates = [r.location, r.city, r.town, r.base_location, r.region];
  const v = candidates.find((x) => typeof x === "string" && x.trim().length > 0);
  return v ? v.trim() : null;
}

function pickCountry(r: AnyRow): string | null {
  const candidates = [r.country, r.country_name];
  const v = candidates.find((x) => typeof x === "string" && x.trim().length > 0);
  return v ? v.trim() : null;
}

function isVerifiedRow(r: AnyRow): boolean {
  // Supports many schemas:
  // - status: "verified"
  // - verified: true
  // - is_verified: true
  // - is_active: true
  const status = typeof r.status === "string" ? r.status.toLowerCase().trim() : "";
  if (status === "verified" || status === "active" || status === "approved") return true;

  if (r.verified === true || r.is_verified === true) return true;
  if (r.is_active === true && status === "") return true;

  return false;
}

async function loadFrom(supabase: any, table: string) {
  // Always select * to avoid column mismatch errors.
  const { data, error } = await supabase.from(table).select("*");
  return { data: (data as AnyRow[]) || [], error };
}

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE env vars." },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceKey);

    // 1) Try operators_view first (common in your project)
    let rows: AnyRow[] = [];
    {
      const { data, error } = await loadFrom(supabase, "operators_view");
      if (!error) rows = data;
    }

    // 2) Fallback to operators table if view missing/blocked
    if (rows.length === 0) {
      const { data, error } = await loadFrom(supabase, "operators");
      if (!error) rows = data;
    }

    // Filter verified on server side (schema-agnostic)
    const verified = rows.filter(isVerifiedRow);

    const operators = verified
      .map((r) => ({
        id: String(r.id ?? r.operator_id ?? "").trim(),
        company_name: pickCompanyName(r),
        location: pickLocation(r),
        country: pickCountry(r),
      }))
      .filter((x) => x.id.length > 0)
      .sort((a, b) => a.company_name.localeCompare(b.company_name));

    return NextResponse.json({ operators });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load verified operators." },
      { status: 500 }
    );
  }
}
