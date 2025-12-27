// src/app/api/itinerary/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripDayPrefix } from "@/lib/itinerary";

// Ensure Node runtime so env + OpenAI work reliably
export const runtime = "nodejs";
console.log(
  "[AI Debug] OPENAI_API_KEY length =",
  process.env.OPENAI_API_KEY?.length ?? 0
);

const Input = z.object({
  days: z.number().min(3).max(21),
  pax: z.number().min(1).max(10),
  budgetLevel: z.enum(["value", "balanced", "premium"]),
  month: z.number().min(1).max(12),
  interests: z.array(z.string()).default([]),
});

type DayItem = {
  day_index: number;
  park_name?: string | null;
  lodge_name?: string | null;
  activities?: { name: string }[] | null;
};

type Itinerary = {
  title?: string;
  summary?: string;
  days: DayItem[];
  priceBand?: { currency: string; min: number; likely: number; max: number };
  notes?: string;
};

function normalizeItineraries(input: any): Itinerary[] {
  const itineraries: any[] = Array.isArray(input)
    ? input
    : Array.isArray(input?.itineraries)
    ? input.itineraries
    : [];

  return itineraries.map((it) => {
    const daysRaw: any[] = Array.isArray(it?.days) ? it.days : [];

    const days: DayItem[] = daysRaw.map((d, idx) => {
      const di = Number(d?.day_index ?? idx + 1);

      return {
        day_index: Number.isFinite(di) ? di : idx + 1,
        park_name: d?.park_name ? stripDayPrefix(String(d.park_name)) : d?.park_name ?? null,
        lodge_name: d?.lodge_name ? stripDayPrefix(String(d.lodge_name)) : d?.lodge_name ?? null,
        activities: Array.isArray(d?.activities)
          ? d.activities
              .filter((a: any) => a && typeof a.name === "string")
              .map((a: any) => ({ name: stripDayPrefix(a.name) }))
          : [],
      };
    });

    // Also normalize itinerary title just in case AI includes "Day X" in title (rare but happens)
    const title = it?.title ? stripDayPrefix(String(it.title)) : it?.title;

    return {
      ...it,
      title,
      days,
    } as Itinerary;
  });
}

function ruleBased(
  days: number,
  pax: number,
  budget: "value" | "balanced" | "premium",
  month: number,
  interests: string[]
) {
  const basePerPerson = budget === "value" ? 250 : budget === "balanced" ? 350 : 550;
  const likely = basePerPerson * days * pax;

  return ["Value", "Balanced", "Premium"].map((tier, i) => ({
    title: `${tier} Safari — ${days}D Tanzania`,
    summary:
      month >= 6 && month <= 10
        ? "Peak wildlife season; expect excellent sightings."
        : "Shoulder season; fewer crowds, good value.",
    days: Array.from({ length: days }).map((_, idx) => ({
      day_index: idx + 1,
      park_name:
        idx < Math.floor(days / 3)
          ? "Tarangire National Park"
          : idx < Math.floor((2 * days) / 3)
          ? "Serengeti National Park"
          : "Ngorongoro Crater",
      lodge_name:
        idx < Math.floor(days / 3)
          ? "Maramboi Tented Lodge"
          : idx < Math.floor((2 * days) / 3)
          ? "Embalakai Authentic Camps"
          : "Rhino Lodge",
      activities: idx === Math.floor(days / 2) ? [{ name: "Hot Air Balloon Safari" }] : [],
    })),
    priceBand: {
      currency: "USD",
      min: Math.round(likely * (0.85 + i * 0.05)),
      likely: Math.round(likely * (1 + i * 0.1)),
      max: Math.round(likely * (1.2 + i * 0.15)),
    },
    notes: interests.length ? `Tailored for: ${interests.join(", ")}` : undefined,
  }));
}

function extractJSON(text: string): any | null {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {}
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { days, pax, budgetLevel, month, interests } = parsed.data;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

  console.log(
    "[itinerary/generate] AI key present?",
    !!OPENAI_API_KEY,
    "len:",
    OPENAI_API_KEY?.length ?? 0,
    "| model:",
    MODEL
  );

  if (!OPENAI_API_KEY) {
    const itineraries = normalizeItineraries(ruleBased(days, pax, budgetLevel, month, interests));
    return NextResponse.json({ itineraries, ai: "disabled" }, { status: 200 });
  }

  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const system = [
      "You are an expert African safari planner focused on Tanzania.",
      "Return valid JSON ONLY with shape:",
      "{ itineraries: [ { title, summary, days:[{day_index,park_name,lodge_name,activities:[{name}]}], priceBand:{min,likely,max,currency}, notes? } ] }",
      "Respect trip length. Minimize long transfers. Consider seasonality: Jun–Oct peak; Jan–Mar calving.",
      "Tone: concise, specific, helpful. Avoid marketing fluff.",
      // ✅ extra guard to reduce duplication at source
      "IMPORTANT: Do NOT prefix park_name or lodge_name with 'Day X'. day_index already indicates the day."
    ].join(" ");

    const user = JSON.stringify({ days, pax, budgetLevel, month, interests });

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    let parsedJson = extractJSON(text);

    if (!parsedJson) {
      console.warn("[itinerary/generate] OpenAI returned non-JSON; using fallback");
      parsedJson = { itineraries: ruleBased(days, pax, budgetLevel, month, interests) };
    }

    const rawItineraries = Array.isArray(parsedJson)
      ? parsedJson
      : parsedJson.itineraries ?? parsedJson;

    if (!Array.isArray(rawItineraries) || rawItineraries.length === 0) {
      console.warn("[itinerary/generate] Invalid AI payload; using fallback");
      const itineraries = normalizeItineraries(
        ruleBased(days, pax, budgetLevel, month, interests)
      );
      return NextResponse.json({ itineraries, ai: "fallback" }, { status: 200 });
    }

    const itineraries = normalizeItineraries(rawItineraries);
    return NextResponse.json({ itineraries, ai: "openai" }, { status: 200 });
  } catch (e: any) {
    console.error(
      "[itinerary/generate] AI error → fallback:",
      e?.response?.data || e?.message || e
    );
    const itineraries = normalizeItineraries(ruleBased(days, pax, budgetLevel, month, interests));
    return NextResponse.json(
      { itineraries, ai: "fallback", ai_error: String(e?.message || e) },
      { status: 200 }
    );
  }
}
