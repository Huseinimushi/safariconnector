// src/app/api/itinerary/ai/route.ts
import { NextResponse } from "next/server";
import { mistral } from "@/lib/mistral";

type Msg = { role: "system" | "user" | "assistant"; content: string };

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Health / guidance endpoint.
 * Browsers may call GET by default; returning 405 is fine, but this is cleaner.
 */
export function GET() {
  return NextResponse.json(
    { ok: true, message: "Use POST /api/itinerary/ai" },
    { status: 200 }
  );
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

    const system: Msg = {
      role: "system",
      content:
        `You are Safari Connector's itinerary assistant. ` +
        `Generate practical safari itineraries in Tanzania/Kenya/Rwanda/Uganda. ` +
        `Be structured, accurate, and avoid hallucinating park fees or exact pricing. ` +
        `If something is unknown, ask a clarifying question or provide ranges and assumptions. ` +
        `Always produce output in the requested schema when provided.` +
        `\n\nRules:\n- If schemaHint requests JSON, return valid JSON only.\n- Do not add markdown fences unless asked.\n`,
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
          `Task: Create / refine a safari itinerary based on the conversation.` +
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

    // Mistral SDK may return content as string (or sometimes array parts).
    const content = res?.choices?.[0]?.message?.content as unknown;
    const text =
      typeof content === "string"
        ? content
        : Array.isArray(content)
        ? content
            .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
            .join("")
        : "";

    return NextResponse.json({
      ok: true,
      provider: "mistral",
      model: chosenModel,
      text,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Mistral itinerary request failed." },
      { status: 500 }
    );
  }
}
