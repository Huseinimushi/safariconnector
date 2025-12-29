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
  days: string[];
  includes: string[];
  excludes: string[];
};

type Msg = { role: "user" | "assistant"; content: string };

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
  ok: "#16A34A",
  danger: "#DC2626",
};

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
  "days": string[],
  "includes": string[],
  "excludes": string[]
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
 * Conservative: if user mentions nights/overnight -> multi.
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
  ];

  const wantsMulti = multiSignals.some((k) => t.includes(k));
  const wantsDayTrip = dayTripSignals.some((k) => t.includes(k));

  const tripType = !wantsMulti && wantsDayTrip ? "day_trip" : "multi_day";
  const forcedDays = tripType === "day_trip" ? 1 : null;

  return { tripType, forcedDays } as const;
}

/**
 * Hard normalize so Day trip NEVER becomes multi-day.
 */
function normalizeResult(
  parsed: ItineraryResult,
  intentTripType: "day_trip" | "multi_day",
  fallbackDestination: string
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
  };

  safe.days = safe.days.map((x) => String(x || "").trim()).filter(Boolean);

  if (intentTripType === "day_trip") {
    const first =
      safe.days[0] || "Morning pickup • activities • lunch • return by evening (same-day).";
    safe.days = [first];
    safe.daysCount = 1;
  } else {
    if (safe.days.length > 0) safe.daysCount = safe.days.length;
    if (!safe.daysCount || safe.daysCount < 1) safe.daysCount = Math.max(1, safe.days.length || 1);
  }

  if (safe.days.length > 21) safe.days = safe.days.slice(0, 21);
  safe.experiences = safe.experiences.slice(0, 12);
  safe.includes = safe.includes.slice(0, 30);
  safe.excludes = safe.excludes.slice(0, 30);

  if (!safe.title) safe.title = intentTripType === "day_trip" ? `Day trip: ${safe.destination}` : `Safari itinerary: ${safe.destination}`;
  if (!safe.summary) safe.summary = "Draft itinerary generated by Safari Connector AI Studio.";

  return safe;
}

export default function AIGeneratorPage() {
  const { user } = useAuth();

  // lead capture minimal (needed for PDF + operator followup)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // optional details
  const [destination, setDestination] = useState("Tanzania");
  const [days, setDays] = useState<number>(7);
  const [travellers, setTravellers] = useState<number>(2);
  const [budget, setBudget] = useState<number | null>(1500);
  const [when, setWhen] = useState<string>("");

  // prompt
  const [prompt, setPrompt] = useState(
    "Day trip to Chemka Hot Springs from Arusha. Same-day return. No overnight. Include timings + lunch."
  );

  // state
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ItineraryResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // UI
  const [showContext, setShowContext] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  // logs
  const [log, setLog] = useState<Msg[]>([]);

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

  const intentLive = useMemo(() => detectTripIntent(prompt), [prompt]);
  const isDayTrip = intentLive.tripType === "day_trip";

  const chips = useMemo(
    () => [
      "Day trip to Chemka Hot Springs from Arusha. Same-day return. No overnight. Include timings + lunch.",
      "Day trip to Materuni Waterfalls + Coffee tour from Moshi. Same-day return. Include timings + lunch.",
      "Day trip to Tarangire from Arusha. Same-day return. Focus on game drive schedule + picnic lunch.",
      "2 days safari: Tarangire + Ngorongoro (1 night). Mid-range. Couple. Clear inclusions/exclusions.",
    ],
    []
  );

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
        source: "ai_studio_form_first_v2",
        status,
        ...extra,
      });
    } catch {
      // silent by design
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
      },
      instruction:
        intent.tripType === "day_trip"
          ? "User requested a DAY TRIP (same-day, no overnight). Output MUST be 1 day only with timings (pickup, activities, lunch, return). Do not add multi-day safari content."
          : "Generate an operator-friendly itinerary. Use realistic drive times and pacing. Avoid exact fees/prices unless user provided; use ranges/assumptions.",
    };
  }

  async function generate() {
    setToast(null);

    const promptText = prompt.trim();
    if (promptText.length < 10) {
      setToast("Andika request yenye maelezo kidogo zaidi.");
      promptRef.current?.focus();
      return;
    }

    const intent = detectTripIntent(promptText);
    if (intent.tripType === "day_trip") setDays(1);

    const ctx = buildContext(intent);

    setGenerating(true);
    setResult(null);
    setShowDownload(false);

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

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "AI request failed.");
      }

      const data = await res.json();
      const text: string = data?.text || "";

      const parsed = safeJsonParse<ItineraryResult>(text) || extractJsonObject<ItineraryResult>(text);
      if (!parsed?.title || !Array.isArray(parsed?.days) || parsed.days.length === 0) {
        throw new Error("AI output format invalid. Please try again.");
      }

      const normalized = normalizeResult(parsed, intent.tripType, destination);
      setResult(normalized);

      setLog((p) => [...p, { role: "assistant", content: `Generated: ${normalized.title}` }]);
      setToast("Generated. Review on the right.");
    } catch (e: any) {
      setToast(`❌ ${e?.message || "Failed to generate itinerary."}`);
      setResult(null);
    } finally {
      setGenerating(false);
    }
  }

  function ensureEmailForPdf() {
    const e = email.trim().toLowerCase();
    if (!isValidEmail(e)) {
      setToast("Weka email sahihi ili upakue PDF.");
      setShowDownload(true);
      setTimeout(() => {
        const el = document.getElementById("sc-email") as HTMLInputElement | null;
        el?.focus();
      }, 80);
      return false;
    }
    return true;
  }

  async function downloadPdf() {
    if (!result) return;
    setToast(null);
    if (!ensureEmailForPdf()) return;

    void saveLeadNonBlocking("pdf_download", prompt.trim(), { itinerary_title: result.title });

    try {
      // ✅ NEW PDF ROUTE expects { itinerary, travellerName, email }
      const res = await fetch("/api/itinerary/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itinerary: result,
          travellerName: safeFullName(fullName),
          email: email.trim().toLowerCase(),
          title: result.title,
          subtitle: "Prepared by Safari Connector",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "PDF generation failed.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `SafariConnector-Itinerary-${safeFullName(fullName).replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setToast(`❌ ${e?.message || "PDF download failed."}`);
    }
  }

  function copyText() {
    if (!result) return;
    const text = [
      result.title,
      result.summary,
      "",
      ...result.days.map((d, i) => `Day ${i + 1}: ${d}`),
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

  /**
   * ✅ FIXED:
   * Send to operator via server endpoint: /api/operator/inbox
   * - avoids RLS problems from client insert
   * - supports DEFAULT_OPERATOR_ID fallback on server
   */
  async function sendToOperator() {
    if (!result) return;

    const nm = safeFullName(fullName);
    const em = email.trim().toLowerCase();

    if (!nm || nm === "Traveller") {
      setToast("Weka jina la mteja (Full name) kabla ya kutuma kwa operator.");
      setShowDownload(true);
      return;
    }
    if (em && !isValidEmail(em)) {
      setToast("Email si sahihi. Irekebishe au iachie wazi.");
      setShowDownload(true);
      return;
    }

    setSending(true);
    setToast(null);

    try {
      const operatorId = (process.env.NEXT_PUBLIC_DEFAULT_OPERATOR_ID as string | undefined) || "";

      const payload = {
        operator_id: operatorId || undefined, // route will fallback to DEFAULT_OPERATOR_ID
        anon_id: anonId,
        user_id: user?.id ?? null,
        traveller_name: nm,
        traveller_email: em || null,

        destination: result.destination || destination,
        when: result.travelDate || when || null,
        travellers,
        budget: result.budgetRange || currencyRangeFromBudget(budget),
        trip_type: result.daysCount === 1 ? "day_trip" : "multi_day",

        prompt: prompt.trim(),
        itinerary: result,
        status: "new",
        source: "ai_studio",
      };

      const res = await fetch("/api/operator/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to send to operator");

      void saveLeadNonBlocking("sent_to_operator", prompt.trim(), { itinerary_title: result.title });

      setToast("✅ Sent to operator. You will be contacted for a quote.");
    } catch (e: any) {
      setToast(`❌ ${e?.message || "Failed to send to operator."}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={S.page}>
      <main style={S.main}>
        <div style={S.layout}>
          {/* LEFT */}
          <section style={S.left}>
            <div style={S.aiCard}>
              {/* Brand block */}
              <div style={S.brandLine}>
                <div style={S.brandMark}>SC</div>
                <div>
                  <div style={S.brandName}>Safari Connector</div>
                  <div style={S.brandSub}>AI Studio</div>
                </div>
              </div>

              {/* Quick intro */}
              <div style={S.kicker}>AI itinerary generator</div>
              <h1 style={S.h1}>Tell us what the client wants.</h1>
              <p style={S.p}>
                {isDayTrip
                  ? "Detected: Day trip. Output stays 1 day only with timings."
                  : "Detected: Multi-day. AI generates day-by-day plan + inclusions."}
              </p>

              {/* FORM FIRST */}
              <div style={S.composer}>
                <div style={S.composerTop}>
                  <div style={S.composerTitle}>Client request</div>
                  <div style={S.composerHint}>Ctrl/⌘ + Enter to generate.</div>
                </div>

                <textarea
                  ref={promptRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  style={S.textarea}
                  placeholder='Example: "Day trip to Chemka from Arusha. Same-day return. Include timings + lunch."'
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      generate();
                    }
                  }}
                />

                <div style={S.composerBottom}>
                  <div style={S.composerLeft}>
                    <button type="button" style={S.ghost} onClick={() => setShowContext((v) => !v)}>
                      {showContext ? "Hide details" : "Trip details (optional)"}
                    </button>
                    {isDayTrip ? (
                      <span style={S.dayTripPill}>Day trip</span>
                    ) : (
                      <span style={S.multiPill}>Multi-day</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={generate}
                    disabled={generating}
                    style={{ ...S.primary, opacity: generating ? 0.65 : 1 }}
                  >
                    {generating ? "Generating..." : "Generate itinerary"}
                  </button>
                </div>
              </div>

              {/* OPTIONAL DETAILS */}
              {showContext && (
                <div style={S.context}>
                  <div style={S.contextTitle}>Optional trip details</div>
                  <div style={S.grid2}>
                    <Field label="Destination">
                      <input value={destination} onChange={(e) => setDestination(e.target.value)} style={S.input} />
                    </Field>

                    <Field label="When">
                      <input type="date" value={when} onChange={(e) => setWhen(e.target.value)} style={S.input} />
                    </Field>

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
                        <button
                          type="button"
                          style={S.stepBtn}
                          onClick={() => setTravellers((t) => clampInt(t - 1, 1, 12))}
                        >
                          −
                        </button>
                        <div style={S.stepVal}>{travellers}</div>
                        <button
                          type="button"
                          style={S.stepBtn}
                          onClick={() => setTravellers((t) => clampInt(t + 1, 1, 12))}
                        >
                          +
                        </button>
                      </div>
                    </Field>

                    <Field label="Budget (USD pp)">
                      <input
                        type="number"
                        value={budget ?? ""}
                        onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : null)}
                        style={S.input}
                      />
                    </Field>

                    <Field label="Budget range">
                      <div style={S.readonly}>{currencyRangeFromBudget(budget)}</div>
                    </Field>
                  </div>
                </div>
              )}

              {/* SUGGESTIONS */}
              <div style={S.suggestionsWrap}>
                <div style={S.suggestionsTitle}>Suggestions</div>
                <div style={S.chips}>
                  {chips.map((c) => (
                    <button
                      key={c}
                      type="button"
                      style={S.chip}
                      onClick={() => {
                        setPrompt(c);
                        setTimeout(() => promptRef.current?.focus(), 60);
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* LOG */}
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
          <aside style={S.right}>
            <div style={S.panel}>
              <div style={S.panelHeader}>
                <div>
                  <div style={S.panelTitle}>Generated itinerary</div>
                  <div style={S.panelSub}>{result ? "Scrollable output." : "Generate to view output here."}</div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button type="button" style={S.panelBtn} onClick={copyText} disabled={!result}>
                    Copy
                  </button>
                  <button type="button" style={S.panelBtn} onClick={() => setShowDownload((v) => !v)} disabled={!result}>
                    PDF
                  </button>
                </div>
              </div>

              {/* capture / send */}
              <div style={S.actionBar}>
                <div style={S.actionTitle}>Send to operator</div>
                <div style={S.actionSub}>Capture contact and submit for a quote.</div>

                <div style={S.actionGrid}>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={S.actionInput}
                    placeholder="Full name (required to send)"
                  />
                  <input
                    id="sc-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      ...S.actionInput,
                      borderColor: email && !isValidEmail(email) ? BRAND.warn : BRAND.line,
                    }}
                    placeholder="Email (optional, required for PDF)"
                  />
                </div>

                <button
                  type="button"
                  onClick={sendToOperator}
                  disabled={!result || sending}
                  style={{
                    ...S.sendBtn,
                    opacity: !result || sending ? 0.6 : 1,
                    cursor: !result || sending ? "not-allowed" : "pointer",
                  }}
                >
                  {sending ? "Sending..." : "Send to operator"}
                </button>
              </div>

              {showDownload && (
                <div style={S.capture}>
                  <div style={S.captureTitle}>PDF download</div>
                  <div style={S.captureSub}>Email is required for PDF.</div>
                  <button type="button" style={S.downloadBtn} onClick={downloadPdf} disabled={!result}>
                    Download branded PDF
                  </button>
                </div>
              )}

              {/* SCROLLABLE OUTPUT */}
              <div style={S.panelScroll}>
                {!result && !generating && (
                  <div style={S.empty}>
                    <div style={S.emptyTitle}>No result yet</div>
                    <div style={S.emptyText}>Write the client request then generate.</div>
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

                    <div style={S.metaGrid}>
                      <Meta label="Destination" value={result.destination || destination} />
                      <Meta label="Days" value={`${result.daysCount}`} />
                      <Meta label="When" value={result.travelDate || when || "Any time"} />
                      <Meta label="Budget" value={result.budgetRange || currencyRangeFromBudget(budget)} />
                      <Meta label="Travellers" value={`${travellers}`} />
                      <Meta label="Type" value={result.daysCount === 1 ? "Day trip" : "Multi-day"} />
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

                    <div style={S.sectionTitle}>Day-by-day</div>
                    <div style={S.daysList}>
                      {result.days.map((d, i) => (
                        <div key={i} style={S.dayCard}>
                          <div style={S.dayHead}>Day {i + 1}</div>
                          <div style={S.dayText}>{d}</div>
                        </div>
                      ))}
                    </div>

                    <div style={S.cols}>
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

/* =========================
   Styles
========================= */
const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: BRAND.bg, color: BRAND.ink },

  main: { maxWidth: 1240, margin: "0 auto", padding: "18px 18px 26px" },
  layout: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 480px", gap: 16, alignItems: "start" },
  left: { minWidth: 0 },
  right: { position: "sticky", top: 16 },

  aiCard: {
    border: `1px solid ${BRAND.line}`,
    borderRadius: 24,
    background: `linear-gradient(180deg, ${BRAND.soft}, #FFFFFF)`,
    padding: 16,
  },

  brandLine: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 14,
    background: `linear-gradient(180deg, ${BRAND.green}, ${BRAND.green2})`,
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    letterSpacing: "0.02em",
  },
  brandName: { fontWeight: 1000, fontSize: 14, lineHeight: 1.1 },
  brandSub: { fontSize: 12, color: BRAND.muted, marginTop: 2 },

  kicker: {
    display: "inline-flex",
    border: `1px solid ${BRAND.line}`,
    background: "#fff",
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 950,
    fontSize: 12,
    color: BRAND.green,
  },
  h1: { margin: "10px 0 6px", fontSize: 30, fontWeight: 1000, letterSpacing: "-0.02em", lineHeight: 1.1 },
  p: { margin: 0, color: BRAND.muted, lineHeight: 1.7 },

  composer: { marginTop: 14, border: `1px solid ${BRAND.line}`, borderRadius: 22, overflow: "hidden", background: "#fff" },
  composerTop: { padding: "12px 14px", borderBottom: `1px solid ${BRAND.line}`, background: BRAND.soft2 },
  composerTitle: { fontWeight: 1000, fontSize: 13 },
  composerHint: { marginTop: 4, color: BRAND.muted, fontSize: 12, lineHeight: 1.5 },
  textarea: { width: "100%", minHeight: 170, border: "none", outline: "none", padding: "12px 14px", fontSize: 14, lineHeight: 1.7, resize: "vertical" },

  composerBottom: { padding: "12px 14px", borderTop: `1px solid ${BRAND.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" },
  composerLeft: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },

  ghost: {
    borderRadius: 999,
    border: `1px solid ${BRAND.line}`,
    background: BRAND.soft2,
    padding: "9px 12px",
    fontWeight: 950,
    cursor: "pointer",
    fontSize: 13,
  },

  dayTripPill: {
    borderRadius: 999,
    border: `1px solid ${BRAND.line}`,
    background: "#ECFDF5",
    padding: "7px 10px",
    fontWeight: 950,
    fontSize: 12,
    color: BRAND.green,
  },
  multiPill: {
    borderRadius: 999,
    border: `1px solid ${BRAND.line}`,
    background: "#EFF6FF",
    padding: "7px 10px",
    fontWeight: 950,
    fontSize: 12,
    color: "#1D4ED8",
  },

  primary: { background: BRAND.green, color: "#fff", borderRadius: 999, padding: "10px 14px", border: `1px solid ${BRAND.green}`, fontWeight: 1000, cursor: "pointer" },

  context: { marginTop: 12, border: `1px solid ${BRAND.line}`, borderRadius: 18, background: "#fff", padding: 14 },
  contextTitle: { fontWeight: 1000, marginBottom: 10 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },

  label: { fontSize: 11, fontWeight: 950, color: BRAND.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 },
  input: { width: "100%", border: `1px solid ${BRAND.line}`, borderRadius: 14, padding: "10px 12px", outline: "none", background: "#fff", fontSize: 14 },
  readonly: { width: "100%", border: `1px solid ${BRAND.line}`, borderRadius: 14, padding: "10px 12px", background: BRAND.soft2, fontWeight: 900, fontSize: 13 },

  stepper: { display: "flex", alignItems: "center", gap: 8, border: `1px solid ${BRAND.line}`, borderRadius: 14, padding: 6, background: "#fff" },
  stepBtn: { width: 34, height: 34, borderRadius: 12, border: `1px solid ${BRAND.line}`, background: BRAND.soft2, fontWeight: 950, cursor: "pointer" },
  stepVal: { minWidth: 28, textAlign: "center", fontWeight: 950 },

  suggestionsWrap: { marginTop: 14 },
  suggestionsTitle: { fontWeight: 1000, fontSize: 13, marginBottom: 8, color: BRAND.ink },
  chips: { display: "flex", gap: 8, flexWrap: "wrap" },
  chip: { textAlign: "left", border: `1px solid ${BRAND.line}`, background: "#fff", borderRadius: 999, padding: "8px 10px", cursor: "pointer", fontWeight: 850, fontSize: 12.5 },

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
  actionGrid: { marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  actionInput: { width: "100%", border: `1px solid ${BRAND.line}`, borderRadius: 14, padding: "10px 12px", outline: "none", background: "#fff", fontSize: 13.5 },
  sendBtn: { marginTop: 10, width: "100%", borderRadius: 999, border: `1px solid ${BRAND.green}`, background: BRAND.green, color: "#fff", padding: "10px 12px", fontWeight: 1000 },

  capture: { padding: 14, borderBottom: `1px solid ${BRAND.line}`, background: "#fff", flex: "0 0 auto" },
  captureTitle: { fontWeight: 1000 },
  captureSub: { marginTop: 4, color: BRAND.muted, fontSize: 12 },
  downloadBtn: { marginTop: 10, width: "100%", borderRadius: 999, border: `1px solid ${BRAND.green}`, background: BRAND.green, color: "#fff", padding: "10px 12px", fontWeight: 1000, cursor: "pointer" },

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
};

/* CSS animation */
if (typeof document !== "undefined") {
  const id = "sc-ai-studio-style";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.innerHTML = `@keyframes scspin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`;
    document.head.appendChild(s);
  }
}
