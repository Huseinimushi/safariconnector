"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";

const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";
const BG_SAND = "#F4F3ED";

type OperatorRow = {
  id: string;
  company_name: string | null;
  country: string | null;
  location: string | null;
  status: string | null;
};

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

export default function PlanPage() {
  const { user, loading } = useAuth();

  const [step, setStep] = useState(1);

  // ===== FORM STATE =====
  const [destination, setDestination] = useState("Serengeti");
  const [daysCount, setDaysCount] = useState(7);
  const [travelDate, setTravelDate] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null>(1500);

  const [groupType, setGroupType] = useState("Couple");
  const [travelStyle, setTravelStyle] = useState("Mid-range");
  const [experiences, setExperiences] = useState<string[]>([
    "Big 5 Safari",
    "Zanzibar",
  ]);

  const [travellerName, setTravellerName] = useState("");
  const [email, setEmail] = useState("");

  // ===== RESULT STATE =====
  const [result, setResult] = useState<ItineraryResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ===== OPERATORS (for suggestions + send quote) =====
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");

  // 🔐 Auto-fill name & email from logged in user
  useEffect(() => {
    if (!user) return;

    const meta: any = user.user_metadata || {};

    setTravellerName((prev) => {
      if (prev) return prev;
      const fullFromMeta =
        meta.full_name ||
        meta.name ||
        `${meta.first_name ?? ""} ${meta.last_name ?? ""}`.trim();
      return fullFromMeta || "";
    });

    setEmail((prev) => {
      if (prev) return prev;
      return user.email || meta.email || "";
    });
  }, [user]);

  useEffect(() => {
    const loadOperators = async () => {
      const { data, error } = await supabase
        .from("operators")
        .select("id, company_name, country, location, status")
        .eq("status", "approved")
        .order("company_name", { ascending: true })
        .limit(10);

      if (!error && data) {
        setOperators(data as OperatorRow[]);
      }
    };

    loadOperators();
  }, []);

  const next = () => {
    if (!result) setStep((s) => Math.min(4, s + 1));
  };

  const back = () => {
    if (!result) setStep((s) => Math.max(1, s - 1));
  };

  // ===== DUMMY AI LOGIC =====
  const generateDummyAI = () => {
    setMessage(null);

    const baseTitle = `Suggested ${daysCount}-day ${destination} safari`;
    const destSummaryMap: Record<string, string> = {
      Serengeti:
        "Follow the wildlife-rich plains of Serengeti with sunrise and sunset game drives.",
      Ngorongoro:
        "Explore the world-famous Ngorongoro Crater with its dense concentration of animals.",
      Tarangire:
        "Enjoy elephant herds, baobab trees and quieter, less crowded wilderness.",
      Kilimanjaro:
        "Combine trekking on the slopes of Kilimanjaro with cultural experiences.",
      Zanzibar:
        "Mix beach time with historic Stone Town and spice tours in Zanzibar.",
    };

    const experiencesText =
      experiences.length > 0 ? experiences.join(", ") : "classic game drives";

    const summary = `A ${daysCount}-day ${travelStyle.toLowerCase()} ${destination} itinerary designed for a ${groupType.toLowerCase()}, focusing on ${experiencesText.toLowerCase()}. ${
      destSummaryMap[destination] || ""
    }`;

    const dummyDays: string[] = buildDummyDays({
      destination,
      daysCount,
      experiences,
    });

    const budgetMin = budget ? Math.max(600, budget - 400) : 800;
    const budgetMax = budget ? budget + 900 : 2500;
    const budgetRange = `$${budgetMin.toFixed(0)} - $${budgetMax.toFixed(
      0
    )} per person`;

    const resultData: ItineraryResult = {
      title: baseTitle,
      summary,
      destination,
      daysCount,
      travelDate,
      budgetRange,
      style: travelStyle,
      groupType,
      experiences,
      days: dummyDays,
      includes: [
        "Park fees for included parks",
        "Accommodation in lodges / camps",
        "Professional safari guide",
        "Private 4x4 safari vehicle",
        "Meals as per itinerary",
        "Drinking water on game drives",
      ],
      excludes: [
        "International flights",
        "Visas & personal travel insurance",
        "Tips & personal spending",
        "Optional activities not listed",
      ],
    };

    setResult(resultData);

    // Scroll to top to show results
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  // ===== DOWNLOAD AS TEXT FILE =====
  const handleDownload = () => {
    if (!result) return;

    let content = `Safari Connector - AI Trip Plan\n\n`;
    content += `Title: ${result.title}\n`;
    content += `Destination: ${result.destination}\n`;
    content += `Days: ${result.daysCount}\n`;
    if (result.travelDate) content += `Travel date: ${result.travelDate}\n`;
    content += `Budget: ${result.budgetRange}\n`;
    content += `Style: ${result.style}\n`;
    content += `Group: ${result.groupType}\n`;
    content += `Experiences: ${result.experiences.join(", ")}\n\n`;
    content += `Itinerary:\n`;
    result.days.forEach((d, i) => {
      content += `Day ${i + 1}: ${d}\n`;
    });
    content += `\nIncluded:\n- ${result.includes.join("\n- ")}\n`;
    content += `\nNot Included:\n- ${result.excludes.join("\n- ")}\n`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "safari-connector-trip-plan.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== SAVE TO SUPABASE (ai_plans) – SIMPLE FIELDS ONLY =====
  const handleSaveToSupabase = async () => {
    if (!result) {
      setMessage("❌ There is no plan to save yet.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const currentUser = user ?? null;
      const travellerEmail = email || currentUser?.email || null;

      const { data: inserted, error } = await supabase
        .from("ai_plans")
        .insert({
          user_id: currentUser?.id ?? null,
          email: travellerEmail,
          title: result.title,
          destination: result.destination,
          days_count: result.daysCount,
          summary: result.summary,
        })
        .select("id");

      if (error) {
        console.error("save error (ai_plans):", error);
        setMessage(
          "❌ Failed to save your plan in ai_plans. Details: " +
            // @ts-ignore
            (error.message || JSON.stringify(error))
        );
      } else if (!inserted || inserted.length === 0) {
        setMessage(
          "❌ Plan not saved. Most likely RLS on ai_plans is blocking INSERT. Allow authenticated users to insert."
        );
      } else {
        setMessage("✅ Your trip plan has been saved to your account.");
      }
    } catch (e: any) {
      console.error("save exception:", e);
      setMessage(
        "❌ Unexpected error while saving your plan: " +
          (e?.message || "Unknown error")
      );
    } finally {
      setSaving(false);
    }
  };

  // ===== EMAIL PLACEHOLDER =====
  const handleEmail = () => {
    if (!result) return;
    if (!email) {
      setMessage("⚠ Please enter your email first so we know where to send it.");
      return;
    }
    setMessage(
      `✉ We will email this itinerary to ${email} (placeholder – connect to real email service later).`
    );
  };

  // ===== SEND AS QUOTE TO OPERATOR =====
  const handleSendQuote = async () => {
    if (!result) return;
    if (!selectedOperatorId) {
      setMessage("⚠ Please choose a tour operator to send this enquiry to.");
      return;
    }
    if (!email) {
      setMessage(
        "⚠ Please add your email so the operator can reply to your enquiry."
      );
      return;
    }

    setSendingQuote(true);
    setMessage(null);

    try {
      const messageText = buildQuoteMessage(result, travellerName);

      const { error } = await supabase.from("operator_quotes").insert({
        operator_id: selectedOperatorId,
        full_name: travellerName || "Safari Connector traveller",
        email,
        travel_start_date: result.travelDate,
        travel_end_date: result.travelDate,
        group_size: null,
        message: messageText,
      });

      if (error) {
        console.error("send quote error:", error);
        setMessage(
          "❌ Failed to send your enquiry to the operator. Check RLS/table (operator_quotes). Details: " +
            // @ts-ignore
            (error.message || JSON.stringify(error))
        );
      } else {
        setMessage(
          "✅ Your AI-built trip has been sent as an enquiry to the selected operator."
        );
      }
    } catch (e: any) {
      console.error(e);
      setMessage(
        "❌ Unexpected error while sending your enquiry: " +
          (e?.message || "Unknown error")
      );
    } finally {
      setSendingQuote(false);
    }
  };

  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 16px 80px",
        }}
      >
        {/* PAGE HEADER */}
        <section style={{ marginBottom: 26 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#6B7280",
            }}
          >
            AI Trip Builder
          </p>

          <h1
            style={{
              margin: 0,
              marginTop: 6,
              fontSize: 32,
              fontWeight: 800,
              color: BRAND_GREEN,
            }}
          >
            Plan your dream safari with AI (dummy version)
          </h1>

          <p
            style={{
              margin: 0,
              marginTop: 8,
              fontSize: 14,
              color: "#4B5563",
              maxWidth: 680,
              lineHeight: 1.6,
            }}
          >
            Answer a few quick questions and we&apos;ll generate a personalised
            safari itinerary using local patterns and dummy AI logic. Later this
            can be upgraded to real OpenAI, but for now it&apos;s safe and fast
            demo mode.
          </p>
        </section>

        {/* MAIN LAYOUT: LEFT (form/results) + RIGHT (operators/map) */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)",
            gap: 18,
            alignItems: "flex-start",
          }}
        >
          {/* LEFT COLUMN */}
          <div>
            {/* MESSAGES */}
            {message && (
              <div
                style={{
                  marginBottom: 14,
                  padding: "8px 11px",
                  borderRadius: 10,
                  fontSize: 13,
                  border: "1px solid #E5E7EB",
                  backgroundColor: message.startsWith("✅")
                    ? "#ECFDF3"
                    : message.startsWith("❌")
                    ? "#FEE2E2"
                    : "#FEF3C7",
                  color: message.startsWith("✅")
                    ? "#166534"
                    : message.startsWith("❌")
                    ? "#B91C1C"
                    : "#92400E",
                }}
              >
                {message}
              </div>
            )}

            {/* STEPS BAR (only when not showing result) */}
            {!result && (
              <section
                style={{
                  marginBottom: 18,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    style={{
                      width: "22%",
                      padding: "9px 0",
                      textAlign: "center",
                      borderRadius: 12,
                      backgroundColor: step === n ? BRAND_GREEN : "#E5E7EB",
                      color: step === n ? "white" : "#374151",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Step {n}
                  </div>
                ))}
              </section>
            )}

            {/* CARD */}
            <section
              style={{
                borderRadius: 20,
                backgroundColor: "white",
                padding: "18px 18px 22px",
                border: "1px solid #E5E7EB",
              }}
            >
              {!result && (
                <>
                  {step === 1 && (
                    <Step1
                      destination={destination}
                      setDestination={setDestination}
                      daysCount={daysCount}
                      setDaysCount={setDaysCount}
                      travelDate={travelDate}
                      setTravelDate={setTravelDate}
                      budget={budget}
                      setBudget={setBudget}
                    />
                  )}
                  {step === 2 && (
                    <Step2
                      groupType={groupType}
                      setGroupType={setGroupType}
                      travelStyle={travelStyle}
                      setTravelStyle={setTravelStyle}
                    />
                  )}
                  {step === 3 && (
                    <Step3
                      experiences={experiences}
                      setExperiences={setExperiences}
                    />
                  )}
                  {step === 4 && <Step4 />}

                  <div
                    style={{
                      marginTop: 22,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={back}
                        style={btnSecondary}
                      >
                        ← Back
                      </button>
                    ) : (
                      <div />
                    )}

                    {step < 4 ? (
                      <button type="button" onClick={next} style={btnPrimary}>
                        Continue →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={generateDummyAI}
                        style={{
                          ...btnPrimary,
                          backgroundColor: BRAND_GOLD,
                          color: "#111827",
                        }}
                      >
                        Generate My Trip ✨
                      </button>
                    )}
                  </div>
                </>
              )}

              {result && (
                <AIResults
                  data={result}
                  email={email}
                  setEmail={setEmail}
                  travellerName={travellerName}
                  setTravellerName={setTravellerName}
                  operators={operators}
                  selectedOperatorId={selectedOperatorId}
                  setSelectedOperatorId={setSelectedOperatorId}
                  onDownload={handleDownload}
                  onSave={handleSaveToSupabase}
                  onEmail={handleEmail}
                  onSendQuote={handleSendQuote}
                  saving={saving}
                  sendingQuote={sendingQuote}
                />
              )}
            </section>
          </div>

          {/* RIGHT COLUMN: Suggested Operators + Route/Map mockup */}
          <aside
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Suggested operators */}
            <section
              style={{
                borderRadius: 18,
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                padding: "14px 14px 16px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                Suggested tour operators
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#6B7280",
                  marginBottom: 8,
                }}
              >
                These are some of our approved local partners who can run your
                safari.
              </p>

              {operators.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "#9CA3AF",
                  }}
                >
                  Operators will appear here once onboarded.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {operators.slice(0, 3).map((op) => (
                    <div
                      key={op.id}
                      style={{
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        padding: "8px 10px",
                        fontSize: 13,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#111827",
                          marginBottom: 2,
                        }}
                      >
                        {op.company_name || "Safari operator"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6B7280",
                        }}
                      >
                        {[op.location, op.country].filter(Boolean).join(", ") ||
                          "Location not set"}
                      </div>
                      <a
                        href={`/operators/${op.id}`}
                        style={{
                          marginTop: 4,
                          display: "inline-block",
                          fontSize: 12,
                          color: BRAND_GREEN,
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        View profile →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Simple “map” / photo section */}
            <section
              style={{
                borderRadius: 18,
                background:
                  "linear-gradient(135deg, rgba(11,107,58,0.14), rgba(212,160,23,0.18))",
                padding: "14px 14px 16px",
                border: "1px solid #E5E7EB",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                Trip route (concept view)
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#374151",
                  marginBottom: 10,
                }}
              >
                In the full version, this area can show a map route and photos
                of parks included in your itinerary.
              </p>

              <div
                style={{
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg, #022C22, #064E3B, #059669)",
                  height: 120,
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    top: 10,
                    padding: "4px 10px",
                    borderRadius: 999,
                    backgroundColor: "rgba(244,244,245,0.16)",
                    color: "white",
                    fontSize: 11,
                  }}
                >
                  Safari Connector route mockup
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 14,
                    right: 14,
                    fontSize: 12,
                    color: "white",
                    opacity: 0.9,
                  }}
                >
                  Serengeti → Ngorongoro → Tarangire → Zanzibar
                </div>
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

/* ============================
   STEP 1
============================ */
function Step1(props: {
  destination: string;
  setDestination: (v: string) => void;
  daysCount: number;
  setDaysCount: (v: number) => void;
  travelDate: string | null;
  setTravelDate: (v: string | null) => void;
  budget: number | null;
  setBudget: (v: number | null) => void;
}) {
  const {
    destination,
    setDestination,
    daysCount,
    setDaysCount,
    travelDate,
    setTravelDate,
    budget,
    setBudget,
  } = props;

  return (
    <div>
      <h2 style={title}>Your trip basics</h2>

      <div style={grid2}>
        <div>
          <label style={label}>Destination</label>
          <select
            style={input}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option>Serengeti</option>
            <option>Ngorongoro</option>
            <option>Tarangire</option>
            <option>Kilimanjaro</option>
            <option>Zanzibar</option>
          </select>
        </div>

        <div>
          <label style={label}>Number of days</label>
          <input
            type="number"
            style={input}
            min={3}
            max={21}
            value={daysCount}
            onChange={(e) => setDaysCount(Number(e.target.value))}
          />
        </div>

        <div>
          <label style={label}>Approx. travel date</label>
          <input
            type="date"
            style={input}
            value={travelDate || ""}
            onChange={(e) =>
              setTravelDate(e.target.value ? e.target.value : null)
            }
          />
        </div>

        <div>
          <label style={label}>Budget per person (USD)</label>
          <input
            type="number"
            style={input}
            value={budget ?? ""}
            onChange={(e) =>
              setBudget(e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>
      </div>
    </div>
  );
}

/* ============================
   STEP 2
============================ */
function Step2(props: {
  groupType: string;
  setGroupType: (v: string) => void;
  travelStyle: string;
  setTravelStyle: (v: string) => void;
}) {
  const { groupType, setGroupType, travelStyle, setTravelStyle } = props;

  const pill = (active: boolean) => ({
    padding: "7px 14px",
    borderRadius: 30,
    border: active ? `1px solid ${BRAND_GREEN}` : "1px solid #D1D5DB",
    cursor: "pointer",
    fontSize: 13,
    color: active ? BRAND_GREEN : "#374151",
    background: active ? "#ECFDF3" : "#F9FAFB",
  });

  return (
    <div>
      <h2 style={title}>Who are you traveling with?</h2>

      <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 8 }}>
        This helps us tune the pace, comfort level and activities to your group.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            ...label,
            marginBottom: 8,
          }}
        >
          Group type
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Solo", "Couple", "Family", "Group", "Honeymoon"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupType(g)}
              style={pill(groupType === g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          style={{
            ...label,
            marginBottom: 8,
          }}
        >
          Travel style
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Budget", "Mid-range", "Luxury"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTravelStyle(s)}
              style={pill(travelStyle === s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================
   STEP 3
============================ */
function Step3(props: {
  experiences: string[];
  setExperiences: (v: string[]) => void;
}) {
  const { experiences, setExperiences } = props;

  const options = [
    "Big 5 Safari",
    "Great Migration",
    "Kilimanjaro",
    "Zanzibar",
    "Hot air balloon",
    "Cultural",
    "Bird watching",
  ];

  const toggle = (value: string) => {
    if (experiences.includes(value)) {
      setExperiences(experiences.filter((v) => v !== value));
    } else {
      setExperiences([...experiences, value]);
    }
  };

  const chip = (active: boolean) => ({
    padding: "7px 14px",
    borderRadius: 30,
    border: active ? `1px solid ${BRAND_GREEN}` : "1px solid #D1D5DB",
    cursor: "pointer",
    fontSize: 13,
    color: active ? BRAND_GREEN : "#374151",
    background: active ? "#ECFDF3" : "#F9FAFB",
  });

  return (
    <div>
      <h2 style={title}>Preferred experiences</h2>
      <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 8 }}>
        Choose what matters most to you so we can shape your trip around it.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            style={chip(experiences.includes(opt))}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================
   STEP 4
============================ */
function Step4() {
  return (
    <div>
      <h2 style={title}>Ready to generate?</h2>
      <p
        style={{
          fontSize: 14,
          color: "#4B5563",
          lineHeight: 1.6,
        }}
      >
        When you click the button below, we&apos;ll use our dummy AI logic to
        build a safari itinerary based on everything you&apos;ve shared. In the
        future this can be connected to real AI like OpenAI.
      </p>
    </div>
  );
}

/* ============================
   AI RESULTS COMPONENT
============================ */
function AIResults(props: {
  data: ItineraryResult;
  email: string;
  setEmail: (v: string) => void;
  travellerName: string;
  setTravellerName: (v: string) => void;
  operators: OperatorRow[];
  selectedOperatorId: string;
  setSelectedOperatorId: (v: string) => void;
  onDownload: () => void;
  onSave: () => void;
  onEmail: () => void;
  onSendQuote: () => void;
  saving: boolean;
  sendingQuote: boolean;
}) {
  const {
    data,
    email,
    setEmail,
    travellerName,
    setTravellerName,
    operators,
    selectedOperatorId,
    setSelectedOperatorId,
    onDownload,
    onSave,
    onEmail,
    onSendQuote,
    saving,
    sendingQuote,
  } = props;

  return (
    <div>
      <h2
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 800,
          color: BRAND_GREEN,
          marginBottom: 6,
        }}
      >
        {data.title}
      </h2>

      <p style={{ color: "#374151", fontSize: 14, marginBottom: 14 }}>
        {data.summary}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          marginBottom: 18,
          fontSize: 13,
        }}
      >
        <InfoPill label="Destination" value={data.destination} />
        <InfoPill label="Days" value={`${data.daysCount} days`} />
        {data.travelDate && (
          <InfoPill label="Travel date" value={data.travelDate} />
        )}
        <InfoPill label="Budget" value={data.budgetRange} />
        <InfoPill label="Style" value={data.style} />
        <InfoPill label="Group" value={data.groupType} />
      </div>

      {/* Experiences */}
      {data.experiences.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Focus areas
          </h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {data.experiences.map((e) => (
              <span
                key={e}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  backgroundColor: "#F3F4F6",
                  fontSize: 12,
                }}
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Itinerary days */}
      <h3
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Suggested itinerary
      </h3>

      {data.days.map((d, i) => (
        <div
          key={i}
          style={{
            background: "#FFFFFF",
            padding: "10px 12px",
            borderRadius: 14,
            marginBottom: 8,
            border: "1px solid #E5E7EB",
            fontSize: 13,
          }}
        >
          <strong style={{ color: "#111827" }}>Day {i + 1}:</strong>{" "}
          <span style={{ color: "#374151" }}>{d}</span>
        </div>
      ))}

      {/* Includes / Excludes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 18,
          fontSize: 13,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            What&apos;s included
          </h3>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {data.includes.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            What&apos;s not included
          </h3>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {data.excludes.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* ACTIONS: CONTACT + DOWNLOAD + SAVE + SEND QUOTE */}
      <div
        style={{
          marginTop: 20,
          borderTop: "1px dashed #E5E7EB",
          paddingTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Name + Email */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Your name"
            value={travellerName}
            onChange={(e) => setTravellerName(e.target.value)}
            style={{
              flex: "1 1 160px",
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              fontSize: 13,
            }}
          />
          <input
            type="email"
            placeholder="Your email (for sending this plan)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              flex: "1 1 200px",
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              fontSize: 13,
            }}
          />
          <button type="button" onClick={onEmail} style={btnSecondary}>
            Email me this plan
          </button>
        </div>

        {/* Download + Save */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={onDownload} style={btnSecondary}>
            Download as file
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              ...btnPrimary,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save to my account"}
          </button>
        </div>

        {/* SEND AS QUOTE TO OPERATOR */}
        <div
          style={{
            marginTop: 4,
            paddingTop: 10,
            borderTop: "1px dashed #E5E7EB",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Send this plan as an enquiry to a tour operator
          </h3>

          <p
            style={{
              margin: 0,
              marginBottom: 8,
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            Choose an operator and we’ll send this AI-generated itinerary to
            their dashboard as a quote request. They can reply directly to your
            email.
          </p>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              value={selectedOperatorId}
              onChange={(e) => setSelectedOperatorId(e.target.value)}
              style={{
                flex: "1 1 200px",
                padding: "7px 10px",
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                fontSize: 13,
              }}
            >
              <option value="">Select tour operator…</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.company_name || "Safari operator"}{" "}
                  {op.location || op.country
                    ? `– ${[op.location, op.country]
                        .filter(Boolean)
                        .join(", ")}`
                    : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onSendQuote}
              disabled={sendingQuote}
              style={{
                ...btnPrimary,
                opacity: sendingQuote ? 0.7 : 1,
                cursor: sendingQuote ? "default" : "pointer",
              }}
            >
              {sendingQuote ? "Sending…" : "Send enquiry to operator"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Small helper component */
function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 12,
        backgroundColor: "#F9FAFB",
        border: "1px solid #E5E7EB",
        padding: "8px 10px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#9CA3AF",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================
   HELPER: BUILD DUMMY DAYS
============================ */
function buildDummyDays(opts: {
  destination: string;
  daysCount: number;
  experiences: string[];
}): string[] {
  const { destination, daysCount, experiences } = opts;

  const base: string[] = [];
  const expText =
    experiences.length > 0 ? experiences.join(", ") : "classic game drives";

  for (let i = 1; i <= daysCount; i++) {
    if (i === 1) {
      base.push(
        `Arrival in ${destination} region, transfer to your lodge, afternoon at leisure and trip briefing.`
      );
    } else if (i === daysCount) {
      base.push(
        `Final morning activity, relaxed breakfast and transfer back to the airport or onward destination.`
      );
    } else {
      base.push(
        `Full-day exploring ${destination} with focus on ${expText}, picnic lunch in the bush and sunset back at camp.`
      );
    }
  }

  return base;
}

/* ============================
   HELPER: BUILD QUOTE MESSAGE
============================ */
function buildQuoteMessage(result: ItineraryResult, travellerName: string) {
  return [
    `Enquiry generated via Safari Connector AI Trip Builder.`,
    "",
    travellerName ? `Name: ${travellerName}` : "",
    `Destination: ${result.destination}`,
    `Days: ${result.daysCount}`,
    result.travelDate ? `Preferred date: ${result.travelDate}` : "",
    `Budget: ${result.budgetRange}`,
    `Group type: ${result.groupType}`,
    `Style: ${result.style}`,
    result.experiences.length
      ? `Experiences: ${result.experiences.join(", ")}`
      : "",
    "",
    "Suggested itinerary:",
    ...result.days.map((d, i) => `Day ${i + 1}: ${d}`),
  ]
    .filter(Boolean)
    .join("\n");
}

/* ============================
   SHARED STYLES
============================ */
const title = {
  margin: 0,
  marginBottom: 14,
  fontSize: 20,
  fontWeight: 700,
  color: "#111827",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const label = {
  fontSize: 13,
  color: "#374151",
  marginBottom: 6,
  display: "block",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  background: "#F9FAFB",
  fontSize: 14,
};

const btnPrimary: React.CSSProperties = {
  padding: "9px 16px",
  backgroundColor: BRAND_GREEN,
  color: "white",
  borderRadius: 999,
  border: "none",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  padding: "9px 16px",
  backgroundColor: "#E5E7EB",
  color: "#374151",
  borderRadius: 999,
  border: "none",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
