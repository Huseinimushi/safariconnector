// src/app/operators/trips/new/page.tsx
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";

type OperatorRow = {
  id: string;
  company_name: string | null;
  status: string | null;
};

type TripForm = {
  title: string;
  duration: number;
  style: string;
  parksText: string;
  priceFrom: string;
  priceTo: string;
  heroUrl: string;
  gallery1: string;
  gallery2: string;
  gallery3: string;
  overview: string;
  description: string;
  highlightsText: string;
  includesText: string;
  excludesText: string;
};

type DayForm = {
  title: string;
  desc: string;
};

type RateForm = {
  season: string;
  notes: string;
  currency: string;
  pricePp: string;
  minPax: string;
};

// Shape ya AI plan tunayoihifadhi kwenye localStorage kutoka /plan
type AIPlanDay = { day: number; title: string; description: string };
type AIPlan = {
  summary: string;
  days: AIPlanDay[];
  highlights?: string[];
  estimated_rate?: { min: number; max: number };
};
type AIStored = {
  form?: {
    destination?: string;
    circuit?: string;
    duration?: number;
    style?: string;
    interests?: string[];
  };
  plan: AIPlan;
};

const emptyForm: TripForm = {
  title: "",
  duration: 6,
  style: "balanced",
  parksText: "",
  priceFrom: "",
  priceTo: "",
  heroUrl: "",
  gallery1: "",
  gallery2: "",
  gallery3: "",
  overview: "",
  description: "",
  highlightsText: "",
  includesText: "",
  excludesText: "",
};

/** Wrapper ili kukidhi Next: useSearchParams lazima iwe ndani ya Suspense */
export default function NewTripPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            backgroundColor: BG_SAND,
            minHeight: "80vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "#6B7280",
          }}
        >
          Loading trip builder…
        </main>
      }
    >
      <NewTripPageInner />
    </Suspense>
  );
}

/** Hii ndiyo component yetu ya zamani yote, sasa iko ndani ya Suspense */
function NewTripPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<TripForm>(emptyForm);
  const [days, setDays] = useState<DayForm[]>([]);
  const [rates, setRates] = useState<RateForm[]>([]);
  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Mode: manual vs AI-assisted
  const [mode, setMode] = useState<"manual" | "ai">("manual");

  // AI plan state
  const [aiData, setAiData] = useState<AIStored | null>(null);
  const [aiPreviewTitle, setAiPreviewTitle] = useState<string | null>(null);
  const [aiPreviewDuration, setAiPreviewDuration] = useState<number | null>(
    null
  );

  // ───────── Load AI plan from localStorage (client only) ─────────
  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("sc_ai_plan")
          : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as AIStored;
      if (!parsed || !parsed.plan || !Array.isArray(parsed.plan.days)) return;

      setAiData(parsed);

      const duration =
        parsed.plan.days.length ||
        parsed.form?.duration ||
        emptyForm.duration;
      const baseTitle =
        parsed.form?.circuit ||
        parsed.form?.destination ||
        "Custom Safari";
      const title = `${duration}-Day ${baseTitle}`;

      setAiPreviewTitle(title);
      setAiPreviewDuration(duration);
    } catch {
      // ignore
    }
  }, []);

  // ───────── Load current operator from user session ─────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/operators/login");
        return;
      }

      // Check if operatorId in URL (from dashboard button)
      const operatorIdFromUrl = searchParams.get("operatorId");

      let op: OperatorRow | null = null;

      if (operatorIdFromUrl) {
        const { data, error } = await supabase
          .from("operators")
          .select("id, company_name, status")
          .eq("id", operatorIdFromUrl)
          .single();

        if (!error && data) {
          op = data as OperatorRow;
        }
      }

      if (!op) {
        const { data, error } = await supabase
          .from("operators")
          .select("id, company_name, status")
          .eq("user_id", user.id)
          .single();

        if (error || !data) {
          setMsg(
            "❌ We could not find an operator profile linked to your account."
          );
          setLoading(false);
          return;
        }
        op = data as OperatorRow;
      }

      setOperator(op);

      // Initialise days to match default duration
      setDays((prev) => {
        if (prev.length > 0) return prev;
        return Array.from({ length: emptyForm.duration }, (_, i) => ({
          title: `Day ${i + 1} - `,
          desc: "",
        }));
      });

      setLoading(false);
    };

    load();
  }, [router, searchParams]);

  // Whenever duration changes, adjust days length
  useEffect(() => {
    setDays((prev) => {
      const n = form.duration || 0;
      if (n <= 0) return [];
      let next = [...prev];
      if (next.length < n) {
        while (next.length < n) {
          const idx = next.length + 1;
          next.push({ title: `Day ${idx} - `, desc: "" });
        }
      } else if (next.length > n) {
        next = next.slice(0, n);
      }
      return next;
    });
  }, [form.duration]);

  const handleBasicChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "duration") {
      setForm((f) => ({ ...f, duration: Number(value) || 1 }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleDayChange = (
    index: number,
    field: keyof DayForm,
    value: string
  ) => {
    setDays((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRateChange = (
    index: number,
    field: keyof RateForm,
    value: string
  ) => {
    setRates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addRateRow = () => {
    setRates((prev) => [
      ...prev,
      {
        season: "",
        notes: "",
        currency: "USD",
        pricePp: "",
        minPax: "",
      },
    ]);
  };

  const removeRateRow = (index: number) => {
    setRates((prev) => prev.filter((_, i) => i !== index));
  };

  const parseLines = (text: string) =>
    text
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const parseParks = (text: string) =>
    text
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const parseNumber = (s: string) => {
    const n = Number(s.replace(/,/g, "").trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  // ───────── AI: apply plan to form ─────────
  const handleApplyAiPlan = () => {
    if (!aiData) return;

    const plan = aiData.plan;
    const srcForm = aiData.form || {};
    const duration = plan.days.length || srcForm.duration || form.duration;

    const parksFromInterests = Array.isArray(srcForm.interests)
      ? srcForm.interests.join(", ")
      : form.parksText;

    const styleFromAi =
      (srcForm.style || "").toLowerCase() || form.style || "balanced";

    setForm((f) => ({
      ...f,
      title:
        aiPreviewTitle ||
        f.title ||
        `${duration}-Day ${srcForm.circuit || srcForm.destination || "Safari"}`,
      duration,
      style: styleFromAi,
      parksText: parksFromInterests,
      overview: plan.summary || f.overview,
      highlightsText:
        (plan.highlights || []).join("\n") || f.highlightsText || "",
    }));

    // Set days from AI plan
    if (Array.isArray(plan.days) && plan.days.length > 0) {
      const mapped: DayForm[] = plan.days.map((d, i) => ({
        title: d.title || `Day ${d.day || i + 1}`,
        desc: d.description || "",
      }));
      setDays(mapped);
    }
  };

  // ───────── Submit ─────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operator) return;

    setSaving(true);
    setMsg(null);

    const parks = parseParks(form.parksText);
    const highlights = parseLines(form.highlightsText);
    const includes = parseLines(form.includesText);
    const excludes = parseLines(form.excludesText);

    const price_from = parseNumber(form.priceFrom);
    const price_to = parseNumber(form.priceTo);

    const images = [
      form.heroUrl,
      form.gallery1,
      form.gallery2,
      form.gallery3,
    ].filter((u) => u && u.trim().length > 0);

    try {
      // Insert into trips (no status passed → use DB default, avoid trips_status_check)
      const { data, error } = await supabase
        .from("trips")
        .insert([
          {
            operator_id: operator.id,
            title: form.title,
            duration: form.duration,
            style: form.style,
            parks,
            price_from,
            price_to,
            hero_url: form.heroUrl || null,
            images: images.length ? images : null,
            overview: form.overview || null,
            description: form.description || null,
            highlights: highlights.length ? highlights : null,
            includes: includes.length ? includes : null,
            excludes: excludes.length ? excludes : null,
          },
        ])
        .select("id")
        .single();

      if (error || !data) {
        console.error("trip insert error:", error);
        setMsg("❌ Failed to create trip. Please check your inputs.");
        setSaving(false);
        return;
      }

      const tripId = (data as any).id as string;

      // Insert days
      const dayPayload = days
        .map((d, idx) => ({
          trip_id: tripId,
          day_index: idx + 1,
          title: d.title.trim() || `Day ${idx + 1}`,
          desc: d.desc.trim() || null,
        }))
        .filter((d) => d.title || d.desc);

      if (dayPayload.length > 0) {
        const { error: daysError } = await supabase
          .from("trip_days")
          .insert(dayPayload);
        if (daysError) {
          console.error("trip_days insert error:", daysError);
        }
      }

      // Insert rates
      const ratePayload = rates
        .map((r) => ({
          trip_id: tripId,
          season: r.season.trim() || null,
          start_date: null as string | null,
          end_date: null as string | null,
          currency: r.currency.trim() || "USD",
          price_pp: parseNumber(r.pricePp),
          min_pax: parseNumber(r.minPax),
          notes: r.notes.trim() || null,
        }))
        .filter(
          (r) =>
            r.season ||
            r.notes ||
            r.price_pp != null ||
            r.min_pax != null
        );

      if (ratePayload.length > 0) {
        const { error: ratesError } = await supabase
          .from("trip_rates")
          .insert(ratePayload);
        if (ratesError) {
          console.error("trip_rates insert error:", ratesError);
        }
      }

      setMsg("✅ Trip created successfully.");
      setSaving(false);
      router.push("/operators/trips");
    } catch (err) {
      console.error("trip save exception:", err);
      setMsg("❌ Something went wrong while saving your trip.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main
        style={{
          backgroundColor: BG_SAND,
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6B7280",
        }}
      >
        Loading trip builder…
      </main>
    );
  }

  if (!operator) {
    return (
      <main
        style={{
          backgroundColor: BG_SAND,
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#B91C1C",
          padding: 16,
          textAlign: "center",
        }}
      >
        We couldn&apos;t find an operator profile connected to your account.
        Please create your operator profile first.
      </main>
    );
  }

  const isPending = operator.status !== "approved";

  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "24px 16px 64px",
        }}
      >
        {/* Header */}
        <section
          style={{
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: "16px 20px 14px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6B7280",
              }}
            >
              New trip
            </p>
            <h1
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 24,
                fontWeight: 800,
                color: BRAND_GREEN,
              }}
            >
              Create a safari itinerary
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 13,
                color: "#4B5563",
                maxWidth: 560,
              }}
            >
              Add a detailed trip that will appear on Safari Connector. You can
              edit and refine it later, and we&apos;ll review it before
              featuring it to travellers.
            </p>

            {/* Mode toggle */}
            <div
              style={{
                marginTop: 10,
                display: "inline-flex",
                borderRadius: 999,
                border: "1px solid #D1D5DB",
                overflow: "hidden",
                backgroundColor: "#F9FAFB",
              }}
            >
              <button
                type="button"
                onClick={() => setMode("manual")}
                style={{
                  padding: "6px 14px",
                  fontSize: 11,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor:
                    mode === "manual" ? "#FFFFFF" : "transparent",
                  color: mode === "manual" ? "#111827" : "#6B7280",
                }}
              >
                ✍️ Manual mode
              </button>
              <button
                type="button"
                onClick={() => setMode("ai")}
                style={{
                  padding: "6px 14px",
                  fontSize: 11,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: mode === "ai" ? "#0F766E" : "transparent",
                  color: mode === "ai" ? "#ECFEFF" : "#6B7280",
                }}
              >
                ⚡ AI-assisted
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <span
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                backgroundColor: isPending ? "#FEF3C7" : "#ECFDF3",
                color: isPending ? "#92400E" : "#166534",
                textTransform: "capitalize",
              }}
            >
              {isPending ? "pending approval" : "approved operator"}
            </span>

            {/* AI / Manual mode UX on the right */}
            {mode === "ai" ? (
              aiData ? (
                <button
                  type="button"
                  onClick={handleApplyAiPlan}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    border: "none",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    backgroundColor: "#0F766E",
                    color: "#ECFEFF",
                    boxShadow: "0 4px 10px rgba(15,118,110,0.4)",
                    textAlign: "left",
                  }}
                >
                  ⚡ Prefill from AI Trip Builder
                  {aiPreviewTitle && (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        marginTop: 2,
                        opacity: 0.9,
                      }}
                    >
                      {aiPreviewTitle}
                      {aiPreviewDuration
                        ? ` · ${aiPreviewDuration} days`
                        : ""}
                    </div>
                  )}
                </button>
              ) : (
                <div
                  style={{
                    fontSize: 11,
                    color: "#6B7280",
                    maxWidth: 220,
                    textAlign: "right",
                  }}
                >
                  No AI trip draft found in this browser. Start in{" "}
                  <a
                    href="/plan"
                    style={{ color: "#0B7A53", fontWeight: 600 }}
                  >
                    AI Trip Builder
                  </a>{" "}
                  and we&apos;ll bring it back here.
                </div>
              )
            ) : (
              <div
                style={{
                  fontSize: 11,
                  color: "#6B7280",
                  maxWidth: 230,
                  textAlign: "right",
                }}
              >
                You&apos;re using{" "}
                <strong style={{ color: "#111827" }}>manual mode</strong>. Fill
                in the details below exactly how you want travellers to see
                them.
              </div>
            )}
          </div>
        </section>

        {msg && (
          <div
            style={{
              marginBottom: 14,
              borderRadius: 12,
              padding: "8px 12px",
              fontSize: 13,
              backgroundColor: msg.startsWith("❌") ? "#FEE2E2" : "#EFF6FF",
              color: msg.startsWith("❌") ? "#B91C1C" : "#1D4ED8",
              border: `1px solid ${
                msg.startsWith("❌") ? "#FECACA" : "#BFDBFE"
              }`,
            }}
          >
            {msg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            borderRadius: 20,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: 18,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.8fr) minmax(0, 1.2fr)",
            gap: 16,
          }}
        >
          {/* LEFT: main info */}
          <div style={{ display: "grid", gap: 16 }}>
            {/* Basic info */}
            <section>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                Basic trip details
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#6B7280",
                  marginBottom: 8,
                }}
              >
                Give travellers a clear idea of the itinerary, style and
                routing.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#4B5563",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Trip title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleBasicChange}
                    placeholder="6-Day Highlights of Serengeti & Ngorongoro"
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#4B5563",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    min={1}
                    value={form.duration}
                    onChange={handleBasicChange}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#4B5563",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Style
                  </label>
                  <select
                    name="style"
                    value={form.style}
                    onChange={handleBasicChange}
                    style={inputStyle}
                  >
                    <option value="value">Value</option>
                    <option value="balanced">Balanced</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#4B5563",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Parks / regions
                  </label>
                  <input
                    type="text"
                    name="parksText"
                    value={form.parksText}
                    onChange={handleBasicChange}
                    placeholder="Serengeti, Ngorongoro, Tarangire"
                    style={inputStyle}
                  />
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section>
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                Base pricing
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#4B5563",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    From (per person, USD)
                  </label>
                  <input
                    type="text"
                    name="priceFrom"
                    value={form.priceFrom}
                    onChange={handleBasicChange}
                    placeholder="e.g. 2200"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#4B5563",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Up to (optional)
                  </label>
                  <input
                    type="text"
                    name="priceTo"
                    value={form.priceTo}
                    onChange={handleBasicChange}
                    placeholder="e.g. 3200"
                    style={inputStyle}
                  />
                </div>
              </div>
            </section>

            {/* Overview & description */}
            <section>
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                Overview & story
              </h3>
              <label
                style={{
                  fontSize: 12,
                  color: "#4B5563",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Short overview (1–3 sentences)
              </label>
              <textarea
                name="overview"
                value={form.overview}
                onChange={handleBasicChange}
                placeholder="Perfect for first-time visitors who want iconic wildlife, crater views and a touch of comfort."
                rows={3}
                style={textareaStyle}
              />

              <label
                style={{
                  fontSize: 12,
                  color: "#4B5563",
                  display: "block",
                  marginBottom: 4,
                  marginTop: 8,
                }}
              >
                Full description (optional)
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleBasicChange}
                placeholder="Share a bit more about the route, accommodation style and what makes this itinerary special."
                rows={4}
                style={textareaStyle}
              />
            </section>

            {/* Day-by-day itinerary */}
            <section>
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                Day-by-day itinerary
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#6B7280",
                  marginBottom: 8,
                }}
              >
                We&apos;ve created one row per day based on the duration. Keep
                titles short and punchy.
              </p>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  maxHeight: 380,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {days.map((d, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 10,
                      border: "1px solid #E5E7EB",
                      padding: 8,
                      backgroundColor: "#F9FAFB",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr)",
                        gap: 6,
                      }}
                    >
                      <input
                        type="text"
                        value={d.title}
                        onChange={(e) =>
                          handleDayChange(idx, "title", e.target.value)
                        }
                        placeholder={`Day ${idx + 1} - Arrival & transfer`}
                        style={inputStyle}
                      />
                      <textarea
                        value={d.desc}
                        onChange={(e) =>
                          handleDayChange(idx, "desc", e.target.value)
                        }
                        placeholder="Describe activities, game drives, and overnight location for this day."
                        rows={2}
                        style={textareaStyle}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT: images, highlights, inc/exc, rates */}
          <div style={{ display: "grid", gap: 16 }}>
            {/* Images */}
            <section>
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                Images (URLs)
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#6B7280",
                  marginBottom: 6,
                }}
              >
                For now, use hosted image URLs from your website, CDN or
                Unsplash. The featured image appears as the banner & homepage
                card.
              </p>

              <label
                style={{
                  fontSize: 12,
                  color: "#4B5563",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Featured image URL (required)
              </label>
              <input
                type="url"
                name="heroUrl"
                value={form.heroUrl}
                onChange={handleBasicChange}
                placeholder="https://…/serengeti-sunset.jpg"
                required
                style={inputStyle}
              />

              <label
                style={{
                  fontSize: 12,
                  color: "#4B5563",
                  display: "block",
                  marginBottom: 4,
                  marginTop: 8,
                }}
              >
                Gallery images (optional)
              </label>
              <input
                type="url"
                name="gallery1"
                value={form.gallery1}
                onChange={handleBasicChange}
                placeholder="https://…/lion.jpg"
                style={inputStyle}
              />
              <input
                type="url"
                name="gallery2"
                value={form.gallery2}
                onChange={handleBasicChange}
                placeholder="https://…/camp.jpg"
                style={{ ...inputStyle, marginTop: 6 }}
              />
              <input
                type="url"
                name="gallery3"
                value={form.gallery3}
                onChange={handleBasicChange}
                placeholder="https://…/pool.jpg"
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </section>

            {/* Highlights & inc/exc */}
            <section>
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                Highlights & inclusions
              </h3>

              <label
                style={{
                  fontSize: 12,
                  color: "#4B5563",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Highlights (one per line)
              </label>
              <textarea
                name="highlightsText"
                value={form.highlightsText}
                onChange={handleBasicChange}
                placeholder={
                  "Big 5 game viewing\nNgorongoro Crater safari\nSundowners with crater views"
                }
                rows={3}
                style={textareaStyle}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#4B5563",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Included (one per line)
                  </label>
                  <textarea
                    name="includesText"
                    value={form.includesText}
                    onChange={handleBasicChange}
                    placeholder={
                      "All park fees\nFull-board accommodation\nPrivate 4x4 safari vehicle"
                    }
                    rows={4}
                    style={textareaStyle}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "#4B5563",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Excluded (one per line)
                  </label>
                  <textarea
                    name="excludesText"
                    value={form.excludesText}
                    onChange={handleBasicChange}
                    placeholder={
                      "International flights\nTravel insurance\nTips & personal expenses"
                    }
                    rows={4}
                    style={textareaStyle}
                  />
                </div>
              </div>
            </section>

            {/* Rates by season */}
            <section>
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                Rates by season
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#6B7280",
                  marginBottom: 6,
                }}
              >
                Optional but recommended. These will appear in a table under
                “Rates” on the trip page.
              </p>

              {rates.length === 0 && (
                <button
                  type="button"
                  onClick={addRateRow}
                  style={{
                    borderRadius: 999,
                    border: "1px dashed #D1D5DB",
                    padding: "6px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    backgroundColor: "#F9FAFB",
                  }}
                >
                  + Add first season
                </button>
              )}

              {rates.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    maxHeight: 260,
                    overflowY: "auto",
                    marginTop: 4,
                    paddingRight: 4,
                  }}
                >
                  {rates.map((r, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderRadius: 10,
                        border: "1px solid #E5E7EB",
                        padding: 8,
                        backgroundColor: "#F9FAFB",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 12,
                            color: "#111827",
                          }}
                        >
                          Season {idx + 1}
                        </strong>
                        <button
                          type="button"
                          onClick={() => removeRateRow(idx)}
                          style={{
                            border: "none",
                            background: "transparent",
                            fontSize: 11,
                            color: "#B91C1C",
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(0, 1.2fr) minmax(0, 1.8fr)",
                          gap: 8,
                        }}
                      >
                        <input
                          type="text"
                          value={r.season}
                          onChange={(e) =>
                            handleRateChange(idx, "season", e.target.value)
                          }
                          placeholder="Green season"
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          value={r.notes}
                          onChange={(e) =>
                            handleRateChange(idx, "notes", e.target.value)
                          }
                          placeholder="March – May"
                          style={inputStyle}
                        />
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(0, 0.8fr) minmax(0, 1.1fr) minmax(0, 1.1fr)",
                          gap: 8,
                          marginTop: 6,
                        }}
                      >
                        <input
                          type="text"
                          value={r.currency}
                          onChange={(e) =>
                            handleRateChange(idx, "currency", e.target.value)
                          }
                          placeholder="USD"
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          value={r.pricePp}
                          onChange={(e) =>
                            handleRateChange(idx, "pricePp", e.target.value)
                          }
                          placeholder="Price / person"
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          value={r.minPax}
                          onChange={(e) =>
                            handleRateChange(idx, "minPax", e.target.value)
                          }
                          placeholder="Min pax"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addRateRow}
                    style={{
                      borderRadius: 999,
                      border: "1px dashed #D1D5DB",
                      padding: "6px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                      backgroundColor: "#F9FAFB",
                      marginTop: 2,
                    }}
                  >
                    + Add another season
                  </button>
                </div>
              )}
            </section>

            {/* Submit */}
            <div
              style={{
                borderTop: "1px dashed #E5E7EB",
                paddingTop: 10,
                marginTop: 4,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="submit"
                disabled={saving}
                style={{
                  borderRadius: 999,
                  border: "none",
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  backgroundColor: BRAND_GREEN,
                  color: "#FFFFFF",
                  boxShadow: "0 4px 12px rgba(11,107,58,0.35)",
                }}
              >
                {saving ? "Saving trip…" : "Save trip"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid #D1D5DB",
  padding: "7px 9px",
  fontSize: 13,
  outline: "none",
  backgroundColor: "#FFFFFF",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 60,
  resize: "vertical",
};
