// src/app/api/messages/[threadId]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/authServer";

/**
 * This route treats `threadId` as the quote/enquiry thread id.
 * It reads/writes messages in `operator_quote_replies`.
 *
 * Make sure you have env:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (server only)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

type RouteCtx = {
  params: Promise<{ threadId: string }>;
};

export async function GET(request: NextRequest, context: RouteCtx) {
  try {
    // ✅ FIX: requireUser() takes NO args
    await requireUser();

    const { threadId } = await context.params;
    if (!threadId) {
      return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data, error } = await admin
      .from("operator_quote_replies")
      .select("id, quote_id, sender_role, message, created_at")
      .eq("quote_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("GET /api/messages/[threadId] error:", error);
      return NextResponse.json(
        { error: "Failed to load messages" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (e: any) {
    console.error("GET /api/messages/[threadId] exception:", e);
    return NextResponse.json(
      { error: e?.message || "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteCtx) {
  try {
    // ✅ FIX: requireUser() takes NO args
    await requireUser();

    const { threadId } = await context.params;
    if (!threadId) {
      return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const message = (body?.message as string) || "";
    const sender_role_raw = (body?.sender_role as string) || "";
    const sender_role =
      sender_role_raw.toLowerCase() === "traveller" ? "traveller" : "operator";

    if (!message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const { data, error } = await admin
      .from("operator_quote_replies")
      .insert([
        {
          quote_id: threadId,
          sender_role,
          message: message.trim(),
        },
      ])
      .select("id, quote_id, sender_role, message, created_at")
      .single();

    if (error) {
      console.error("POST /api/messages/[threadId] error:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (e: any) {
    console.error("POST /api/messages/[threadId] exception:", e);
    return NextResponse.json(
      { error: e?.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
