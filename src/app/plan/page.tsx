// src/app/plan/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";

type ItineraryResult = {
  title: string;
  summary: string;
  destination: string;
  daysCount: number;
  travelDate: string | null;
  budgetRange: string;
  style: string;
  groupType: string;
  experiences: string[];
  days: DayPlan[];
  includes: string[];
  excludes: string[];
  details: string;
  activitiesParagraph: string;
  mealsAndAccommodation: string[];
};

type DayPlan = {
  title: string;
  activities: string;
  meals?: string | null;
  accommodation?: string | null;
};
type Msg = { role: "user" | "assistant"; content: string };

type VerifiedOperator = {
  id: string;
  company_name: string | null;
  location: string | null;
  country: string | null;
};

const BRAND = {
  green: "#0B6B3A",
  green2: "#064A28",
  gold: "#D4A017",
  ink: "#0B1220",
  muted: "#55677C",
  line: "#E6EDF5",
  soft: "#F6FAF8",
  soft2: "#F3F7FB",
  bg: "#FFFFFF",
  warn: "#F59E0B",
};

const TRAVEL_STYLES = [
  "Safari",
  "Kilimanjaro Trek",
  "Zanzibar Beach",
  "Culture & Local",
  "Luxury",
  "Budget",
  "Family",
  "Honeymoon",
  "Adventure",
] as const;

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function safeJsonParse<T = any>(txt: string): T | null {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function extractJsonObject<T = any>(txt: string): T | null {
  const s = txt || "";
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) return safeJsonParse<T>(s.slice(start, end + 1));
  return null;
}

function schemaHint() {
  return `Return ONLY valid JSON with this exact shape:
{
  "title": string,
  "summary": string,
  "destination": string,
  "daysCount": number,
  "travelDate": string|null,
  "budgetRange": string,
  "style": string,
  "groupType": string,
  "experiences": string[],
  "days": [{
    "title": string,
    "activities": string,
    "meals": string|null,
    "accommodation": string|null
  }],
  "includes": string[],
  "excludes": string[],
  "details": string,
  "activitiesParagraph": string,
  "mealsAndAccommodation": string[]
}

RULES:
- If user request is a DAY TRIP / same-day / no overnight, then daysCount MUST be 1 and days MUST have exactly 1 item.
- Do not invent multi-day safari if the user asked day trip.
- Day trip output should include timings (morning pickup, activities, lunch, return time).`;
}

function currencyRangeFromBudget(budget: number | null) {
  if (!budget || !Number.isFinite(budget)) return "Not specified";
  const min = Math.max(200, budget - 400);
  const max = budget + 900;
  return `$${Math.round(min)} - $${Math.round(max)} per person`;
}

function safeFullName(name: string) {
  const n = (name || "").trim();
  return n.length >= 2 ? n : "Traveller";
}

function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function uuidLike() {
  return (
    Date.now().toString(16) +
    "-" +
    Math.random().toString(16).slice(2) +
    "-" +
    Math.random().toString(16).slice(2)
  );
}

const LS_ANON_KEY = "sc_anon_lead_id";

/**
 * Detect whether prompt is day-trip vs multi-day.
 */
function detectTripIntent(text: string) {
  const t = (text || "").toLowerCase();

  const dayTripSignals = [
    "day trip",
    "one day",
    "1 day",
    "same-day",
    "same day",
    "no overnight",
    "return same day",
    "back same day",
    "morning pickup",
    "evening return",
  ];
  const multiSignals = [
    "overnight",
    "nights",
    "multi-day",
    "stay overnight",
    "2 days",
    "3 days",
    "4 days",
    "5 days",
    "6 days",
    "7 days",
    "8 days",
    "9 days",
    "10 days",
    "11 days",
    "12 days",
    "13 days",
    "14 days",
    "15 days",
  ];

  const wantsMulti = multiSignals.some((k) => t.includes(k));
  const wantsDayTrip = dayTripSignals.some((k) => t.includes(k));

  const tripType = !wantsMulti && wantsDayTrip ? "day_trip" : "multi_day";
  const forcedDays = tripType === "day_trip" ? 1 : null;

  return { tripType, forcedDays } as const;
}

/**
 * Normalize: Day trip NEVER becomes multi-day.
 */
function normalizeResult(
  parsed: ItineraryResult,
  intentTripType: "day_trip" | "multi_day",
  fallbackDestination: string,
  selectedStyle: string,
  requestedDays: number
) {
  const safe: ItineraryResult = {
    title: String(parsed?.title || "").trim(),
    summary: String(parsed?.summary || "").trim(),
    destination: String(parsed?.destination || "").trim() || fallbackDestination,
    daysCount: Number(parsed?.daysCount || 0),
    travelDate: (parsed?.travelDate as any) ?? null,
    budgetRange: String(parsed?.budgetRange || "").trim(),
    style: String(parsed?.style || "").trim(),
    groupType: String(parsed?.groupType || "").trim(),
    experiences: Array.isArray(parsed?.experiences) ? parsed.experiences : [],
    days: Array.isArray(parsed?.days) ? parsed.days : [],
    includes: Array.isArray(parsed?.includes) ? parsed.includes : [],
    excludes: Array.isArray(parsed?.excludes) ? parsed.excludes : [],
    details: String((parsed as any)?.details || "").trim(),
    activitiesParagraph: String((parsed as any)?.activitiesParagraph || "").trim(),
    mealsAndAccommodation: Array.isArray((parsed as any)?.mealsAndAccommodation)
      ? (parsed as any).mealsAndAccommodation
      : [],
  };

  const mappedDays: DayPlan[] = Array.isArray(safe.days)
    ? safe.days
        .map((d, idx) => {
          let baseTitle = String((d as any)?.title || "").trim();
          const title = baseTitle
            ? baseTitle.match(/^day\s+\d+/i)
              ? baseTitle
              : `Day ${idx + 1}: ${baseTitle}`
            : `Day ${idx + 1}`;
          const activities = String((d as any)?.activities || d || "").trim();
          const meals = (d as any)?.meals ?? null;
          const accommodation = (d as any)?.accommodation ?? null;
          if (!activities) return { title, activities: "", meals, accommodation };
          return { title, activities, meals, accommodation };
        })
        .filter(Boolean) as DayPlan[]
    : [];
  safe.days = mappedDays;

  if (!safe.style && selectedStyle) safe.style = selectedStyle;

  if (intentTripType === "day_trip") {
    const first =
      safe.days[0] ||
      { title: "Day 1", activities: "Morning pickup • activities • lunch • return by evening (same-day)." };
    safe.days = [first];
    safe.daysCount = 1;
  } else {
    const requested = clampInt(Number(requestedDays || 0), 1, 30);
    const aiDays = clampInt(Number(parsed?.daysCount || 0), 0, 30);
    const target = Math.max(requested, aiDays, safe.days.length || 0);
    if (safe.days.length < target) {
      const fillerActivity = safe.activitiesParagraph || safe.summary || "To be planned for this day.";
      for (let i = safe.days.length; i < target; i++) {
        safe.days.push({
          title: `Day ${i + 1}`,
          activities: fillerActivity,
          meals: null,
          accommodation: null,
        });
      }
    }
    safe.daysCount = target;
  }

  if (safe.days.length > 30) safe.days = safe.days.slice(0, 30);
  safe.experiences = safe.experiences.slice(0, 12);
  safe.includes = safe.includes.slice(0, 30);
  safe.excludes = safe.excludes.slice(0, 30);
  safe.mealsAndAccommodation = safe.mealsAndAccommodation
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 20);

  if (!safe.title) safe.title = intentTripType === "day_trip" ? `Day trip: ${safe.destination}` : `Itinerary: ${safe.destination}`;
  if (!safe.summary) safe.summary = "Draft itinerary generated by Safari Connector AI Studio.";
  if (!safe.style) safe.style = selectedStyle || "Auto";
  if (!safe.details) safe.details = safe.summary;
  if (!safe.activitiesParagraph) safe.activitiesParagraph = safe.summary;
  if (!safe.mealsAndAccommodation.length && safe.experiences.length) {
    safe.mealsAndAccommodation = safe.experiences.slice(0, 6);
  }

  // Ensure daysCount aligns with mapped days
  if (safe.days.length > 0) safe.daysCount = safe.days.length;
  if (!safe.daysCount || safe.daysCount < 1) safe.daysCount = Math.max(1, safe.days.length || 1);

  return safe;
}

export default function PlanPage() {
  const { user } = useAuth();

  // lead capture (send)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // optional details
  const [destination, setDestination] = useState("Tanzania");
  const [days, setDays] = useState<number>(7);
  const [travellers, setTravellers] = useState<number>(2);
  const [budget, setBudget] = useState<number | null>(1500);
  const [when, setWhen] = useState<string>("");

  // Travel style (RESTORED)
  const [travelStyle, setTravelStyle] = useState<string>("Culture & Local");

  // prompt
const [prompt, setPrompt] = useState("");

  // state
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ItineraryResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // UI
  const [showContext, setShowContext] = useState(false);

  // logs
  const [log, setLog] = useState<Msg[]>([]);

  // operators
  const [operators, setOperators] = useState<VerifiedOperator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [operatorsError, setOperatorsError] = useState<string | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");

  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  const anonId = useMemo(() => {
    if (typeof window === "undefined") return "server";
    const existing = window.localStorage.getItem(LS_ANON_KEY);
    if (existing) return existing;
    const created = uuidLike();
    window.localStorage.setItem(LS_ANON_KEY, created);
    return created;
  }, []);

  useEffect(() => {
    if (!user) return;
    const meta: any = (user as any).user_metadata || {};
    setFullName((p) => p || meta.full_name || meta.name || "");
    setEmail((p) => p || (user as any).email || meta.email || "");
  }, [user]);

  // Poll auth while login modal open to close it when user signs in
  useEffect(() => {
    if (!showLoginModal) return;
    let cancelled = false;
    const poll = setInterval(async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!cancelled && data?.user) {
          setShowLoginModal(false);
          setToast("Logged in. You can now send to an operator.");
        }
      } catch {
        // ignore
      }
    }, 1200);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [showLoginModal]);

  // Load verified operators
  useEffect(() => {
    let alive = true;

    async function loadOps() {
      setOperatorsLoading(true);
      setOperatorsError(null);
      try {
        const res = await fetch("/api/operators/verified", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Failed to load verified operators");

        const list: VerifiedOperator[] = Array.isArray(j?.operators) ? j.operators : [];
        if (!alive) return;

        setOperators(list);
        setSelectedOperatorId((prev) => (prev && list.some((x) => x.id === prev) ? prev : ""));
      } catch (e: any) {
        if (!alive) return;
        setOperators([]);
        setSelectedOperatorId("");
        setOperatorsError(e?.message || "Failed to load verified operators.");
      } finally {
        if (!alive) return;
        setOperatorsLoading(false);
      }
    }

    loadOps();
    return () => {
      alive = false;
    };
  }, []);

  const intentLive = useMemo(() => detectTripIntent(prompt), [prompt]);
  const isDayTrip = intentLive.tripType === "day_trip";

  async function saveLeadNonBlocking(status: string, promptText: string, extra?: Record<string, any>) {
    try {
      await supabase.from("ai_leads").insert({
        anon_id: anonId,
        user_id: user?.id ?? null,
        full_name: fullName.trim() || null,
        email: email.trim().toLowerCase() || null,
        prompt: promptText,
        where: destination || null,
        when: when || null,
        travellers: travellers ?? null,
        budget: budget ?? null,
        travel_style: travelStyle || null,
        source: "plan_form_first_v5",
        status,
        ...extra,
      });
    } catch {
      // silent
    }
  }

  function buildContext(intent: { tripType: "day_trip" | "multi_day"; forcedDays: number | null }) {
    const enforcedDays = intent.tripType === "day_trip" ? 1 : days;

    return {
      traveller: {
        full_name: safeFullName(fullName),
        email: email.trim().toLowerCase() || null,
      },
      trip: {
        where: destination,
        when: when || null,
        travellers,
        days: enforcedDays,
        budget_range: currencyRangeFromBudget(budget),
        trip_type: intent.tripType,
        forced_days: intent.forcedDays,
        travel_style: travelStyle,
      },
      instruction:
        intent.tripType === "day_trip"
          ? "User requested a DAY TRIP (same-day, no overnight). Output MUST be 1 day only with timings (pickup, activities, lunch, return). Do not add multi-day safari content."
          : "Generate an operator-friendly itinerary. Use realistic pacing. Avoid exact fees/prices unless user provided; use ranges/assumptions.",
    };
  }

  async function generate() {
    setToast(null);

    const promptText = prompt.trim();
    if (promptText.length < 6) {
      setToast("Andika request fupi yenye maelezo (angalau maneno machache).");
      promptRef.current?.focus();
      return;
    }

    const intent = detectTripIntent(promptText);
    if (intent.tripType === "day_trip") setDays(1);

    const ctx = buildContext(intent);

    setGenerating(true);
    setResult(null);

    setLog((p) => [...p, { role: "user", content: promptText }]);
    void saveLeadNonBlocking(intent.tripType === "day_trip" ? "generated_day_trip" : "generated", promptText, {
      trip_type: intent.tripType,
    });

    try {
      const res = await fetch("/api/itinerary/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: promptText }],
          context: ctx,
          schemaHint: schemaHint(),
          model: "mistral-large-latest",
          temperature: 0.25,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "AI request failed.");

      const text: string = data?.text || "";
      const parsed = safeJsonParse<ItineraryResult>(text) || extractJsonObject<ItineraryResult>(text);
      if (!parsed?.title || !Array.isArray(parsed?.days) || parsed.days.length === 0) {
        throw new Error("AI output format invalid. Please try again.");
      }

      const normalized = normalizeResult(parsed, intent.tripType, destination, travelStyle, days);
      setResult(normalized);

      setLog((p) => [...p, { role: "assistant", content: `Generated: ${normalized.title}` }]);
      setToast("Generated. Review on the right.");
    } catch (e: any) {
      setToast(`Failed to generate itinerary: ${e?.message || "Unknown error."}`);
      setResult(null);
    } finally {
      setGenerating(false);
    }
  }

  function copyText() {
    if (!result) return;
    const text = [
      result.title,
      result.summary,
      "",
      ...result.days.map((d, i) => {
        const lines = [
          `Day ${i + 1}: ${d.title || "Day plan"}`,
          `Activities of the Day: ${d.activities}`,
        ];
        if (d.meals) lines.push(`Meals: ${d.meals}`);
        if (d.accommodation) lines.push(`Accommodation: ${d.accommodation}`);
        return lines.join("\n");
      }),
      "",
      "Details:",
      result.details,
      "",
      "Activities:",
      result.activitiesParagraph,
      "",
      "Meals & Accommodation:",
      ...(result.mealsAndAccommodation || []).map((x) => `- ${x}`),
      "",
      "Included:",
      ...(result.includes || []).map((x) => `- ${x}`),
      "",
      "Not included:",
      ...(result.excludes || []).map((x) => `- ${x}`),
    ].join("\n");
    navigator.clipboard?.writeText(text);
    setToast("Copied to clipboard.");
  }

  async function sendToOperator() {
    if (!result) return;

    if (!selectedOperatorId) {
      setToast("Chagua operator kwanza.");
      return;
    }

    if (!user) {
      setToast("Please log in or sign up to send this itinerary.");
      setShowLoginModal(true);
      return;
    }

    const nm = safeFullName(fullName);
    const em = email.trim().toLowerCase();

    if (!nm || nm === "Traveller") {
      setToast("Weka jina la mteja (Full name) kabla ya kutuma kwa operator.");
      return;
    }
    if (!isValidEmail(em)) {
      setToast("Email inahitajika na lazima iwe sahihi.");
      return;
    }

    setSending(true);
    setToast(null);

    try {
      const payload = {
        operator_id: selectedOperatorId,
        anon_id: anonId,
        user_id: user?.id ?? null,

        traveller_name: nm,
        traveller_email: em,
        phone: null,

        destination: result.destination || destination,
        when: result.travelDate || when || null,
        travellers,
        travel_style: result.style || travelStyle || null,

        prompt: prompt.trim(),
        itinerary: result,

        source_page: "/plan",
      };

      const res = await fetch("/api/operator/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to send to operator");

      void saveLeadNonBlocking("sent_to_operator", prompt.trim(), {
        itinerary_title: result.title,
        operator_id: selectedOperatorId,
      });

      setToast("✅ Sent to operator. You will be contacted for a quote.");
    } catch (e: any) {
      setToast(`❌ ${e?.message || "Failed to send to operator."}`);
    } finally {
      setSending(false);
    }
  }

  const selectedOperatorLabel = useMemo(() => {
    if (!selectedOperatorId) return null;
    const op = operators.find((x) => x.id === selectedOperatorId);
    if (!op) return null;
    const name = op.company_name || "Operator";
    const place = [op.country, op.location].filter(Boolean).join(" • ");
    return place ? `${name} — ${place}` : name;
  }, [operators, selectedOperatorId, operators]);

  return (
    <div style={S.page}>
      <style>{`
        .sc-plan-main { padding: 18px 18px 26px; }
        .sc-plan-layout { display: grid; }
        .sc-plan-panel { min-height: 0; }

        @media (max-width: 980px) {
          .sc-plan-layout { grid-template-columns: 1fr !important; }
          .sc-plan-right { position: static !important; top: auto !important; }
          .sc-plan-panel { height: auto !important; }
        }

        @media (max-width: 640px) {
          .sc-grid2 { grid-template-columns: 1fr !important; }
            .sc-cols { grid-template-columns: 1fr !important; }
          }

        @media (max-width: 520px) {
          .sc-plan-main { padding: 14px 12px 22px !important; }
          .sc-layout-gap { gap: 12px !important; }
          .sc-metaGrid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .sc-h1 { font-size: 26px !important; }
          .sc-textarea { min-height: 150px !important; }
          .sc-panelHeader { flex-direction: column !important; align-items: flex-start !important; }
          .sc-formGrid { grid-template-columns: 1fr !important; }
        }

        @media (max-width: 380px) {
          .sc-metaGrid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <main className="sc-plan-main" style={S.main}>
        <div className="sc-plan-layout sc-layout-gap" style={S.layout}>
          {/* LEFT */}
          <section style={S.left}>
            <div style={S.aiCard}>
              <div style={S.heroTitle}>Safari Connector AI Studio</div>
              <div style={S.heroSub}>Plan your dream trip with personalized itineraries.</div>

              <div className="sc-formGrid" style={S.formGrid}>
                <div>
                  <div style={S.formLabel}>Travel days</div>
                  <select
                    value={`${isDayTrip ? 1 : days}`}
                    onChange={(e) => setDays(clampInt(Number(e.target.value || "7"), 1, 21))}
                    style={S.select}
                    disabled={isDayTrip}
                  >
                    {Array.from({ length: 21 }).map((_, i) => {
                      const v = i + 1;
                      return (
                        <option key={v} value={v}>
                          {v} {v === 1 ? "day" : "days"}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <div style={S.formLabel}>Destination</div>
                  <input value={destination} onChange={(e) => setDestination(e.target.value)} style={S.input} />
                </div>

                {/* Travel style restored */}
                <div>
                  <div style={S.formLabel}>Travel style</div>
                  <select
                    value={travelStyle}
                    onChange={(e) => setTravelStyle(e.target.value)}
                    style={S.select}
                  >
                    {TRAVEL_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={S.formLabel}>Date</div>
                  <input type="date" value={when} onChange={(e) => setWhen(e.target.value)} style={S.input} />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <div style={S.formLabel}>Budget (USD pp)</div>
                  <input
                    type="number"
                    value={budget ?? ""}
                    onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : null)}
                    style={S.input}
                  />
                  <div style={S.budgetHint}>{currencyRangeFromBudget(budget)}</div>
                </div>
              </div>

              <div style={S.requestHead}>
                <div style={S.requestTitle}>Request</div>
                <button type="button" style={S.ghost} onClick={() => setShowContext((v) => !v)}>
                  {showContext ? "Hide details" : "Trip details (optional)"}
                </button>
              </div>

              <textarea
                ref={promptRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                style={S.textarea}
                className="sc-textarea"
                placeholder="7-day Kilimanjaro trek (Machame). Mid-range. Include acclimatization."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    generate();
                  }
                }}
              />

              <div style={S.hintLine}>Ctrl/⌘ + Enter to Run</div>

              <button
                type="button"
                onClick={generate}
                disabled={generating}
                style={{ ...S.runBtn, opacity: generating ? 0.65 : 1 }}
              >
                {generating ? "Generating..." : "✨ Run"}
              </button>

              {showContext && (
                <div style={S.context}>
                  <div style={S.contextTitle}>Optional trip details</div>
                  <div className="sc-grid2" style={S.grid2}>
                    <Field label={isDayTrip ? "Days (locked)" : "Days"}>
                      <div style={{ ...S.stepper, opacity: isDayTrip ? 0.6 : 1 }}>
                        <button
                          type="button"
                          style={S.stepBtn}
                          disabled={isDayTrip}
                          onClick={() => setDays((d) => clampInt(d - 1, 1, 21))}
                        >
                          −
                        </button>
                        <div style={S.stepVal}>{isDayTrip ? 1 : days}</div>
                        <button
                          type="button"
                          style={S.stepBtn}
                          disabled={isDayTrip}
                          onClick={() => setDays((d) => clampInt(d + 1, 1, 21))}
                        >
                          +
                        </button>
                      </div>
                    </Field>

                    <Field label="Travellers">
                      <div style={S.stepper}>
                        <button type="button" style={S.stepBtn} onClick={() => setTravellers((t) => clampInt(t - 1, 1, 12))}>
                          −
                        </button>
                        <div style={S.stepVal}>{travellers}</div>
                        <button type="button" style={S.stepBtn} onClick={() => setTravellers((t) => clampInt(t + 1, 1, 12))}>
                          +
                        </button>
                      </div>
                    </Field>
                  </div>
                </div>
              )}

              {/* Suggestions removed */}

              {log.length > 0 && (
                <div style={S.log}>
                  <div style={S.logTitle}>Recent</div>
                  {log.slice(-4).map((m, i) => (
                    <div key={i} style={m.role === "user" ? S.logUser : S.logAi}>
                      <div style={S.logRole}>{m.role === "user" ? "Client" : "AI"}</div>
                      <div style={S.logText}>{m.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT */}
          <aside className="sc-plan-right" style={S.right}>
            <div className="sc-plan-panel" style={S.panel}>
              <div className="sc-panelHeader" style={S.panelHeader}>
                <div>
                  <div style={S.panelTitle}>Results</div>
                  <div style={S.panelSub}>{result ? "Review output, then send to an operator." : "Run to view results."}</div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button type="button" style={S.panelBtn} onClick={copyText} disabled={!result}>
                    Copy
                  </button>
                </div>
              </div>

              <div style={S.actionBar}>
              <div style={S.actionTitle}>Send to operator</div>
                <div style={S.actionSub}>Select operator, then send your itinerary.</div>

              {!user && <div style={S.warnBox}>Please log in or sign up to send this itinerary to an operator.</div>}

              <div style={{ marginTop: 10 }}>
                <div style={S.smallLabel}>Select operator</div>

                  <select
                    value={selectedOperatorId}
                    onChange={(e) => setSelectedOperatorId(e.target.value)}
                    style={{
                      ...S.select2,
                      borderColor: !selectedOperatorId ? BRAND.warn : BRAND.line,
                    }}
                    disabled={operatorsLoading}
                  >
                    <option value="">{operatorsLoading ? "Loading operators..." : "Choose operator"}</option>
                    {operators.map((op) => {
                      const name = op.company_name || "Operator";
                      const place = [op.country, op.location].filter(Boolean).join(" • ");
                      return (
                        <option key={op.id} value={op.id}>
                          {place ? `${name} — ${place}` : name}
                        </option>
                      );
                    })}
                  </select>

                  {operatorsError && <div style={S.warnBox}>{operatorsError}</div>}
                  {!operatorsError && selectedOperatorLabel && (
                    <div style={S.hintBox}>Selected operator will receive your request.</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={sendToOperator}
                  disabled={!result || sending || !selectedOperatorId}
                  style={{
                    ...S.sendBtn,
                    opacity: !result || sending || !selectedOperatorId ? 0.6 : 1,
                    cursor: !result || sending || !selectedOperatorId ? "not-allowed" : "pointer",
                  }}
                >
                  {sending ? "Sending..." : user ? "Send to operator" : "Log in to send"}
                </button>

                {!selectedOperatorId && <div style={S.sendHint}>Select an operator to enable sending.</div>}
              </div>

              <div style={S.panelScroll}>
                {!result && !generating && (
                  <div style={S.empty}>
                    <div style={S.emptyTitle}>No results yet</div>
                    <div style={S.emptyText}>Fill the form and click Run.</div>
                  </div>
                )}

                {generating && (
                  <div style={S.loading}>
                    <div style={S.spinner} />
                    <div style={S.loadingTitle}>Generating…</div>
                    <div style={S.loadingText}>Building day-by-day and inclusions.</div>
                  </div>
                )}

                {result && (
                  <div>
                    <h2 style={S.rTitle}>{result.title}</h2>
                    <p style={S.rSummary}>{result.summary}</p>

                    <div className="sc-metaGrid" style={S.metaGrid}>
                      <Meta label="Destination" value={result.destination || destination} />
                      <Meta label="Days" value={`${result.daysCount}`} />
                      <Meta label="When" value={result.travelDate || when || "Any time"} />
                      <Meta label="Budget" value={result.budgetRange || currencyRangeFromBudget(budget)} />
                      <Meta label="Style" value={result.style || travelStyle || "Auto"} />
                      <Meta label="Travellers" value={`${travellers}`} />
                    </div>

                    {result.experiences?.length > 0 && (
                      <>
                        <div style={S.sectionTitle}>Focus areas</div>
                        <div style={S.pillsWrap}>
                          {result.experiences.slice(0, 10).map((x) => (
                            <span key={x} style={S.pill}>
                              {x}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    {result.details && (
                      <>
                        <div style={S.sectionTitle}>Short itinerary detail</div>
                        <div style={S.detailBox}>
                          <div style={S.detailText}>{result.details}</div>
                        </div>
                      </>
                    )}

                    {result.activitiesParagraph && (
                      <>
                        <div style={S.sectionTitle}>Activities</div>
                        <div style={S.detailBox}>
                          <div style={S.detailText}>{result.activitiesParagraph}</div>
                        </div>
                      </>
                    )}

                    {result.mealsAndAccommodation?.length > 0 && (
                      <>
                        <div style={S.sectionTitle}>Meals & Accommodation</div>
                        <ul style={S.ul}>
                          {result.mealsAndAccommodation.map((x) => (
                            <li key={x} style={S.li}>
                              {x}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <div style={S.sectionTitle}>Day-by-day</div>
                    <div style={S.daysList}>
                      {result.days.map((d, i) => (
                        <div key={`${d.title}-${i}`} style={S.dayCard}>
                          <div style={S.dayHead}>{d.title || `Day ${i + 1}`}</div>
                          <div style={S.dayText}>
                            <strong>Activities of the Day:</strong> {d.activities}
                          </div>
                          {(d.meals || d.accommodation) && (
                            <ul style={S.ul}>
                              {d.meals && (
                                <li style={S.li}>
                                  <strong>Meals:</strong> {d.meals}
                                </li>
                              )}
                              {d.accommodation && (
                                <li style={S.li}>
                                  <strong>Accommodation:</strong> {d.accommodation}
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="sc-cols" style={S.cols}>
                      <div style={S.box}>
                        <div style={S.boxTitle}>Included</div>
                        <ul style={S.ul}>
                          {(result.includes || []).slice(0, 20).map((x) => (
                            <li key={x} style={S.li}>
                              {x}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div style={S.box}>
                        <div style={S.boxTitle}>Not included</div>
                        <ul style={S.ul}>
                          {(result.excludes || []).slice(0, 20).map((x) => (
                            <li key={x} style={S.li}>
                              {x}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div style={{ height: 16 }} />
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {showLoginModal && (
        <div style={S.modalOverlay} onClick={() => setShowLoginModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span>Log in to send your itinerary</span>
              <button style={S.modalClose} onClick={() => setShowLoginModal(false)}>
                Close
              </button>
            </div>
            <iframe
              src="https://safariconnector.com/login/traveller"
              title="Traveller login"
              style={{ width: "100%", height: "500px", border: "none" }}
            />
          </div>
        </div>
      )}

      {toast && (
        <div style={S.toast} onClick={() => setToast(null)} title="Click to dismiss">
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={S.label}>{label}</div>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.meta}>
      <div style={S.metaLabel}>{label}</div>
      <div style={S.metaValue} title={value}>
        {value}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: BRAND.bg, color: BRAND.ink },

  main: { maxWidth: 1240, margin: "0 auto", padding: "18px 18px 26px" },
  layout: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 480px", gap: 16, alignItems: "start" },
  left: { minWidth: 0 },
  right: { position: "sticky", top: 16 },

  aiCard: {
    border: `1px solid ${BRAND.line}`,
    borderRadius: 24,
    background: "#fff",
    padding: 18,
  },

  heroTitle: {
    fontSize: 46,
    lineHeight: 1.05,
    fontWeight: 1000,
    letterSpacing: "-0.02em",
    color: BRAND.green,
    marginBottom: 6,
  },
  heroSub: { color: BRAND.gold, fontWeight: 900, fontSize: 18, marginBottom: 18 },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    alignItems: "end",
    marginBottom: 14,
  },

  formLabel: {
    fontSize: 13,
    fontWeight: 900,
    marginBottom: 8,
    color: BRAND.ink,
  },

  input: { width: "100%", border: `1px solid ${BRAND.line}`, borderRadius: 14, padding: "12px 12px", outline: "none", background: "#fff", fontSize: 14 },
  select: { width: "100%", border: `1px solid ${BRAND.line}`, borderRadius: 14, padding: "12px 12px", outline: "none", background: "#fff", fontSize: 14, fontWeight: 800 },

  budgetHint: { marginTop: 8, color: BRAND.muted, fontSize: 13, fontWeight: 800 },

  requestHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 8, gap: 10 },
  requestTitle: { fontSize: 18, fontWeight: 1000 },

  textarea: {
    width: "100%",
    minHeight: 150,
    border: `1px solid ${BRAND.line}`,
    borderRadius: 16,
    outline: "none",
    padding: "14px 14px",
    fontSize: 14,
    lineHeight: 1.7,
    resize: "vertical",
    background: "#fff",
  },

  hintLine: { marginTop: 10, color: BRAND.muted, fontWeight: 900 },

  runBtn: {
    marginTop: 10,
    width: "100%",
    borderRadius: 16,
    border: `1px solid ${BRAND.green}`,
    background: BRAND.green,
    color: "#fff",
    padding: "14px 14px",
    fontWeight: 1000,
    cursor: "pointer",
    fontSize: 16,
  },

  ghost: {
    borderRadius: 999,
    border: `1px solid ${BRAND.line}`,
    background: BRAND.soft2,
    padding: "9px 12px",
    fontWeight: 950,
    cursor: "pointer",
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  context: { marginTop: 12, border: `1px solid ${BRAND.line}`, borderRadius: 18, background: "#fff", padding: 14 },
  contextTitle: { fontWeight: 1000, marginBottom: 10 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },

  label: { fontSize: 11, fontWeight: 950, color: BRAND.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 },

  stepper: { display: "flex", alignItems: "center", gap: 8, border: `1px solid ${BRAND.line}`, borderRadius: 14, padding: 6, background: "#fff" },
  stepBtn: { width: 34, height: 34, borderRadius: 12, border: `1px solid ${BRAND.line}`, background: BRAND.soft2, fontWeight: 950, cursor: "pointer" },
  stepVal: { minWidth: 28, textAlign: "center", fontWeight: 950 },

  log: { marginTop: 14, border: `1px solid ${BRAND.line}`, borderRadius: 22, background: "#fff", padding: 14 },
  logTitle: { fontWeight: 950, marginBottom: 10 },
  logUser: { border: `1px solid ${BRAND.line}`, borderRadius: 16, padding: 10, marginBottom: 10, background: BRAND.soft },
  logAi: { border: `1px solid ${BRAND.line}`, borderRadius: 16, padding: 10, marginBottom: 10, background: "#fff" },
  logRole: { fontSize: 11, color: BRAND.muted, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.12em" },
  logText: { marginTop: 6, color: BRAND.ink, lineHeight: 1.6, fontSize: 13 },

  panel: {
    height: "calc(100vh - 32px)",
    border: `1px solid ${BRAND.line}`,
    borderRadius: 24,
    overflow: "hidden",
    background: "#fff",
    boxShadow: "0 18px 55px rgba(11,18,32,0.08)",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  panelHeader: {
    padding: 14,
    borderBottom: `1px solid ${BRAND.line}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(10px)",
    flex: "0 0 auto",
  },
  panelTitle: { fontWeight: 1000, fontSize: 16 },
  panelSub: { marginTop: 4, color: BRAND.muted, fontSize: 12, lineHeight: 1.5 },
  panelBtn: { borderRadius: 999, border: `1px solid ${BRAND.line}`, background: BRAND.soft2, padding: "9px 12px", fontWeight: 950, cursor: "pointer" },

  actionBar: { padding: 14, borderBottom: `1px solid ${BRAND.line}`, background: BRAND.soft, flex: "0 0 auto" },
  actionTitle: { fontWeight: 1000 },
  actionSub: { marginTop: 4, color: BRAND.muted, fontSize: 12, lineHeight: 1.5 },

  smallLabel: { fontSize: 11, fontWeight: 950, color: BRAND.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 },

  select2: {
    width: "100%",
    border: `1px solid ${BRAND.line}`,
    borderRadius: 14,
    padding: "10px 12px",
    outline: "none",
    background: "#fff",
    fontSize: 13.5,
    fontWeight: 700,
  },

  warnBox: {
    marginTop: 8,
    border: `1px solid rgba(245, 158, 11, 0.35)`,
    background: "rgba(245, 158, 11, 0.10)",
    color: "#7A4C00",
    padding: "9px 10px",
    borderRadius: 14,
    fontWeight: 800,
    fontSize: 12.5,
  },

  hintBox: {
    marginTop: 8,
    border: `1px solid ${BRAND.line}`,
    background: "rgba(255,255,255,0.7)",
    padding: "9px 10px",
    borderRadius: 14,
    color: BRAND.muted,
    fontWeight: 800,
    fontSize: 12.5,
  },

  sendBtn: { marginTop: 10, width: "100%", borderRadius: 999, border: `1px solid ${BRAND.green}`, background: BRAND.green, color: "#fff", padding: "10px 12px", fontWeight: 1000 },
  sendHint: { marginTop: 8, color: BRAND.muted, fontSize: 12, fontWeight: 800 },


  panelScroll: { padding: 14, overflow: "auto", flex: 1, minHeight: 0, WebkitOverflowScrolling: "touch" },

  empty: { border: `1px dashed ${BRAND.line}`, borderRadius: 18, padding: 14, background: BRAND.soft },
  emptyTitle: { fontWeight: 950 },
  emptyText: { marginTop: 6, color: BRAND.muted, lineHeight: 1.6 },

  loading: { border: `1px solid ${BRAND.line}`, borderRadius: 18, padding: 14, background: BRAND.soft },
  spinner: { width: 18, height: 18, borderRadius: 999, border: `2px solid ${BRAND.line}`, borderTopColor: BRAND.green, marginBottom: 10, animation: "scspin 1s linear infinite" },
  loadingTitle: { fontWeight: 950 },
  loadingText: { marginTop: 6, color: BRAND.muted, lineHeight: 1.6, fontSize: 12.5 },

  rTitle: { margin: 0, fontSize: 18, fontWeight: 1000, lineHeight: 1.2 },
  rSummary: { margin: "8px 0 0", color: BRAND.muted, lineHeight: 1.6, fontSize: 13 },

  metaGrid: { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 },
  meta: { border: `1px solid ${BRAND.line}`, borderRadius: 16, padding: 10, background: BRAND.soft2 },
  metaLabel: { fontSize: 11, color: BRAND.muted, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.12em" },
  metaValue: { marginTop: 6, fontWeight: 1000, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  sectionTitle: { marginTop: 14, fontWeight: 1000, fontSize: 13 },
  pillsWrap: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
  pill: { padding: "6px 10px", borderRadius: 999, border: `1px solid ${BRAND.line}`, background: "#fff", fontSize: 12, fontWeight: 850 },

  detailBox: { marginTop: 8, border: `1px solid ${BRAND.line}`, borderRadius: 14, padding: 12, background: "#fff" },
  detailText: { margin: 0, color: BRAND.muted, lineHeight: 1.6, fontSize: 13 },
  daysList: { marginTop: 10, display: "flex", flexDirection: "column", gap: 10 },
  dayCard: { border: `1px solid ${BRAND.line}`, borderRadius: 18, padding: 12, background: "#fff" },
  dayHead: { color: BRAND.green, fontWeight: 1000, fontSize: 12.5 },
  dayText: { marginTop: 6, color: BRAND.muted, lineHeight: 1.7, fontSize: 13 },

  cols: { marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  box: { border: `1px solid ${BRAND.line}`, borderRadius: 18, padding: 12, background: BRAND.soft },
  boxTitle: { fontWeight: 1000, fontSize: 12.5 },
  ul: { margin: "10px 0 0", paddingLeft: 18 },
  li: { color: BRAND.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 6 },

  toast: {
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: 18,
    zIndex: 80,
    padding: "10px 12px",
    borderRadius: 999,
    border: `1px solid ${BRAND.line}`,
    background: "#fff",
    boxShadow: "0 16px 40px rgba(2, 6, 23, 0.16)",
    fontWeight: 900,
    fontSize: 13,
    maxWidth: "min(920px, calc(100vw - 24px))",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    zIndex: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  modalBox: {
    background: "#fff",
    borderRadius: 18,
    width: "min(480px, 95vw)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.25)",
    overflow: "hidden",
    border: `1px solid ${BRAND.line}`,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderBottom: `1px solid ${BRAND.line}`,
    fontWeight: 900,
    fontSize: 14,
  },
  modalClose: {
    border: "1px solid #d1d5db",
    background: "#f3f4f6",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 800,
  },
};

if (typeof document !== "undefined") {
  const id = "sc-ai-studio-style";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `@keyframes scspin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`;
    document.head.appendChild(s);
  }
}



