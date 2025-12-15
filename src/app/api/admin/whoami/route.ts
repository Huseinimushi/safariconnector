export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  try {
    const { email, userId } = await requireAdmin();
    return NextResponse.json({ ok: true, email, userId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Not admin" },
      { status: 403 }
    );
  }
}
