// src/app/api/itinerary/ai/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

type Msg = { role: "system" | "user" | "assistant"; content: string };

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function badRequest(message: string) {
  return json(400, { ok: false, error: message });
}

/**
 * Health endpoint
 */
export function GET() {
  return json(200, { ok: true, message: "Use POST /api/itinerary/ai" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON body.");

    const {
      messages,
      context,
      schemaHint,
      model,
      temperature,
    }: {
      messages: Msg[];
      context?: Record<string, any>;
      schemaHint?: string;
      model?: string;
      temperature?: number;
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return badRequest("`messages` is required and must be a non-empty array.");
    }

    // Lazy import to avoid module-eval crashes that cause browser "fetch failed"
    let mistral: any;
    try {
      const mod = await import("@/lib/mistral");
      mistral = (mod as any).mistral;
      if (!mistral) throw new Error("mistral client not exported from @/lib/mistral");
    } catch (e: any) {
      return json(500, {
        ok: false,
        error:
          "Failed to initialize AI provider (mistral). Check server env + lib/mistral.",
        detail: e?.message || String(e),
      });
    }

    const system: Msg = {
      role: "system",
      content:
        `You are Safari Connector AI Studio itinerary assistant. ` +
        `Generate practical itineraries in Tanzania/Kenya/Rwanda/Uganda. ` +
        `Be structured, accurate, and avoid hallucinating park fees or exact pricing. ` +
        `If something is unknown, ask a clarifying question or provide ranges and assumptions. ` +
        `If schemaHint requests JSON, return valid JSON ONLY (no markdown fences, no commentary).`,
    };

    const ctxBlock =
      context && Object.keys(context).length
        ? `\n\nCONTEXT (JSON):\n${JSON.stringify(context, null, 2)}`
        : "";

    const schemaBlock = schemaHint
      ? `\n\nOUTPUT SCHEMA REQUIREMENT:\n${schemaHint}\n\nReturn ONLY the final output (no commentary).`
      : "";

    const enrichedMessages: Msg[] = [
      system,
      {
        role: "user",
        content:
          `Task: Create / refine an itinerary based on the conversation.` +
          ctxBlock +
          schemaBlock,
      },
      ...messages,
    ];

    const chosenModel = model || "mistral-large-latest";
    const chosenTemp = typeof temperature === "number" ? temperature : 0.3;

    const res = await mistral.chat.complete({
      model: chosenModel,
      messages: enrichedMessages,
      temperature: chosenTemp,
    });

    const content = res?.choices?.[0]?.message?.content as unknown;
    const text =
      typeof content === "string"
        ? content
        : Array.isArray(content)
        ? content.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join("")
        : "";

    if (!text || !text.trim()) {
      return json(502, { ok: false, error: "Empty model response." });
    }

    return json(200, { ok: true, provider: "mistral", model: chosenModel, text });
  } catch (e: any) {
    // Always return JSON so the browser never shows "fetch failed"
    return json(500, {
      ok: false,
      error: e?.message ?? "Mistral itinerary request failed.",
    });
  }
}
