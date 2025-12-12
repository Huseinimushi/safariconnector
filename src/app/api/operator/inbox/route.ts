// src/app/api/operator/inbox/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";

/**
 * GET /api/operator/inbox
 * Zinarudi enquiries zote za operator (manual + AI)
 */

export async function GET(_request: NextRequest) {
  try {
    // ✅ FIX: requireUser() takes NO args
    const { user, supabase } = await requireUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pata operator_id kutoka operators_view (unaweza kubadili kuwa "operators" kama ndo unatumia)
    const { data: operatorRow, error: operatorError } = await supabase
      .from("operators_view")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (operatorError || !operatorRow) {
      console.error("operator lookup error:", operatorError);
      return NextResponse.json(
        { error: "Operator record not found" },
        { status: 404 }
      );
    }

    const operatorId = String((operatorRow as any).id);

    // Soma data kutoka operator_inbox_view (tuliyoitengeneza supabase)
    const { data, error } = await supabase
      .from("operator_inbox_view")
      .select("*")
      .eq("operator_id", operatorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("inbox load error:", error);
      return NextResponse.json(
        { error: "Failed to load inbox" },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("inbox unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
