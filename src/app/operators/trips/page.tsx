// src/app/operators/trips/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";
const BG_SAND = "#F4F3ED";

type OperatorRow = {
  id: string;
  company_name: string;
  status: string;
};

type QuoteRow = {
  id: string;
  full_name: string;
  email: string;
  message: string;
  created_at: string;
  trip_id: string | null; // 👈 sasa tunajua enquiry imeenda trip gani
};

type TripRow = {
  id: string;
  title: string;
  status: string | null;
  price_from: number | null;
};

type ParsedAIQuote = {
  meta: Record<string, string>;
  days: string[];
};

function isAIQuote(message: string | null | undefined): boolean {
  if (!message) return false;
  return message.startsWith(
    "Enquiry generated via Safari Connector AI Trip Builder."
  );
}

function parseAIQuote(message: string): ParsedAIQuote {
  const lines = message.split("\n").map((l) => l.trim());
  const meta: Record<string, string> = {};
  const days: string[] = [];

  let inItinerary = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line === "Suggested itinerary:" || line === "Suggested itinerary") {
      inItinerary = true;
      continue;
    }

    if (!inItinerary) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        meta[key] = value;
      }
    } else {
      days.push(line);
    }
  }

  return { meta, days };
}

export default function OperatorDashboard() {
  const router = useRouter();

  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [lockedTripIds, setLockedTripIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg(null);

      // 1. AUTH
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setMsg("❌ Please log in first.");
        setLoading(false);
        return;
      }

      // 2. OPERATOR PROFILE
      const { data: op, error: opError } = await supabase
        .from("operators")
        .select("id, company_name, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (opError) {
        console.error("operator load error:", opError);
        setMsg("⚠ Problem loading operator profile.");
        setLoading(false);
        return;
      }

      if (!op) {
        setOperator(null);
        setLoading(false);
        return;
      }

      setOperator(op);

      // 3. QUOTES – sasa tuna-request pia trip_id
      const { data: q, error: qError } = await supabase
        .from("operator_quotes")
        .select("id, full_name, email, message, created_at, trip_id")
        .eq("operator_id", op.id)
        .order("created_at", { ascending: false });

      if (qError) {
        console.error("quote load error:", qError);
        setQuotes([]);
        setLockedTripIds([]);
      } else {
        const list = (q || []) as QuoteRow[];
        setQuotes(list);

        // trips zote zenye enquiries → ziwe locked
        const locked = list
          .map((item) => item.trip_id)
          .filter((id): id is string => !!id);

        setLockedTripIds(Array.from(new Set(locked)));
      }

      // 4. TRIPS — trips.operator_id = operators.id
      const { data: t, error: tError } = await supabase
        .from("trips")
        .select("id, title, status, price_from")
        .eq("operator_id", op.id)
        .order("created_at", { ascending: false });

      if (tError) console.error("trips load error:", tError);
      else setTrips((t || []) as TripRow[]);

      setLoading(false);
    };

    load();
  }, []);

  // EDIT TRIP
  const handleEditTrip = (tripId: string) => {
    router.push(`/operators/trips/${tripId}/edit`);
  };

  // DELETE TRIP
  const handleDeleteTrip = async (tripId: string) => {
    const ok = window.confirm(
      "Are you sure you want to delete this trip? This action cannot be undone."
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/trips/${tripId}/delete`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        alert(
          "Error deleting trip: " + (data?.error || "Unknown error occurred")
        );
        return;
      }

      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      alert("Trip deleted successfully.");
    } catch (err) {
      console.error(err);
      alert("Unexpected error deleting trip.");
    }
  };

  if (loading) {
    return (
      <main
        style={{
          backgroundColor: BG_SAND,
          minHeight: "100vh",
          padding: 40,
          textAlign: "center",
          color: "#6B7280",
        }}
      >
        Loading your operator dashboard…
      </main>
    );
  }

  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
        {/* HEADER */}
        <section style={{ marginBottom: 28 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "#6B7280",
            }}
          >
            Safari Connector
          </p>
          <h1
            style={{
              margin: 0,
              marginTop: 6,
              fontSize: 28,
              fontWeight: 800,
              color: BRAND_GREEN,
            }}
          >
            Tour Operator Dashboard
          </h1>

          {!operator && (
            <p
              style={{
                marginTop: 6,
                fontSize: 14,
                color: "#B91C1C",
                fontWeight: 600,
              }}
            >
              ⚠ You have no operator profile.&nbsp;
              <a
                href="/operators/register"
                style={{ color: BRAND_GREEN, fontWeight: 700 }}
              >
                Create operator profile →
              </a>
            </p>
          )}

          {operator && (
            <p
              style={{
                marginTop: 4,
                fontSize: 14,
                color: "#4B5563",
              }}
            >
              Welcome, <b>{operator.company_name}</b> — manage your trips &
              enquiries here.
            </p>
          )}
        </section>

        {msg && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 13,
              backgroundColor: msg.startsWith("❌") ? "#FEE2E2" : "#FEF3C7",
              color: msg.startsWith("❌") ? "#B91C1C" : "#92400E",
              border: "1px solid #E5E7EB",
            }}
          >
            {msg}
          </div>
        )}

        {/* GRID LAYOUT */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
            gap: 20,
          }}
        >
          {/* QUOTES SECTION */}
          <div
            style={{
              backgroundColor: "#FFF",
              border: "1px solid #E5E7EB",
              borderRadius: 18,
              padding: 18,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#111827",
                marginBottom: 6,
              }}
            >
              Quote requests
            </h3>

            <p style={{ fontSize: 13, color: "#6B7280", marginTop: 0 }}>
              AI-generated enquiries + direct client messages appear here.
            </p>

            {quotes.length === 0 && (
              <p style={{ fontSize: 13, color: "#9CA3AF" }}>
                No enquiries yet. Once guests send requests from your public
                profile, they will appear here.
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {quotes.map((q) => {
                const ai = isAIQuote(q.message);
                const parsed = ai ? parseAIQuote(q.message!) : null;

                return (
                  <div
                    key={q.id}
                    style={{
                      backgroundColor: "#FAFAFA",
                      border: "1px solid #E5E7EB",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 13,
                    }}
                  >
                    {/* NAME + EMAIL */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "#111827",
                          }}
                        >
                          {q.full_name || "Guest enquiry"}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6B7280",
                          }}
                        >
                          {q.email}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(q.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* AI BADGE */}
                    {ai && (
                      <div
                        style={{
                          marginTop: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: "1px solid #FDE68A",
                          backgroundColor: "#FFFBEB",
                          fontSize: 11,
                          color: "#92400E",
                          fontWeight: 600,
                        }}
                      >
                        <span>AI Trip Builder enquiry</span>
                      </div>
                    )}

                    {/* SUMMARY GRID FOR AI QUOTES */}
                    {ai && parsed && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(140px, 1fr))",
                          gap: 8,
                          fontSize: 12,
                        }}
                      >
                        {parsed.meta["Destination"] && (
                          <SummaryPill
                            label="Destination"
                            value={parsed.meta["Destination"]}
                          />
                        )}
                        {parsed.meta["Days"] && (
                          <SummaryPill
                            label="Days"
                            value={parsed.meta["Days"]}
                          />
                        )}
                        {parsed.meta["Budget"] && (
                          <SummaryPill
                            label="Budget"
                            value={parsed.meta["Budget"]}
                          />
                        )}
                        {parsed.meta["Group type"] && (
                          <SummaryPill
                            label="Group"
                            value={parsed.meta["Group type"]}
                          />
                        )}
                        {parsed.meta["Style"] && (
                          <SummaryPill
                            label="Style"
                            value={parsed.meta["Style"]}
                          />
                        )}
                      </div>
                    )}

                    {/* ITINERARY PREVIEW */}
                    {ai && parsed && parsed.days.length > 0 && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 8,
                          borderTop: "1px dashed #E5E7EB",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#111827",
                            marginBottom: 4,
                          }}
                        >
                          Suggested itinerary (preview)
                        </div>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 18,
                            fontSize: 12,
                            color: "#374151",
                          }}
                        >
                          {parsed.days.slice(0, 3).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                          {parsed.days.length > 3 && (
                            <li>…and more days in full itinerary</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* NON-AI MESSAGE */}
                    {!ai && (
                      <p
                        style={{
                          marginTop: 8,
                          fontSize: 13,
                          color: "#374151",
                        }}
                      >
                        {q.message}
                      </p>
                    )}

                    {/* LINK TO FULL CHAT */}
                    <a
                      href={`/operators/quotes/${q.id}`}
                      style={{
                        marginTop: 10,
                        display: "inline-block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: BRAND_GREEN,
                      }}
                    >
                      Open chat →
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TRIPS SECTION */}
          <div
            style={{
              backgroundColor: "#FFF",
              border: "1px solid #E5E7EB",
              borderRadius: 18,
              padding: 18,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#111827",
                marginBottom: 6,
              }}
            >
              Your trips
            </h3>

            <p style={{ fontSize: 13, color: "#6B7280", marginTop: 0 }}>
              Trips you have listed for travellers to book.
            </p>

            <a
              href="/operators/trips/new"
              style={{
                display: "inline-block",
                fontSize: 13,
                marginBottom: 10,
                padding: "6px 12px",
                borderRadius: 999,
                backgroundColor: BRAND_GREEN,
                color: "white",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              + Add new trip
            </a>

            {trips.length === 0 && (
              <p style={{ fontSize: 13, color: "#9CA3AF" }}>
                You have not listed any trips yet.
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {trips.map((t) => {
                const hasQuotesForThisTrip = lockedTripIds.includes(t.id);

                return (
                  <div
                    key={t.id}
                    style={{
                      backgroundColor: "#FAFAFA",
                      border: "1px solid #E5E7EB",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: 4,
                      }}
                    >
                      {t.title}
                    </div>

                    <div style={{ fontSize: 12, color: "#6B7280" }}>
                      {t.price_from != null
                        ? `From $${t.price_from}`
                        : "Price on request"}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <a
                          href={`/operators/trips/${t.id}`}
                          style={{
                            fontSize: 12,
                            color: BRAND_GREEN,
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          Manage trip →
                        </a>

                        {hasQuotesForThisTrip ? (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#9CA3AF",
                              fontStyle: "italic",
                            }}
                          >
                            Locked (this trip has enquiries – admin only)
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditTrip(t.id)}
                              style={{
                                fontSize: 12,
                                border: "none",
                                background: "transparent",
                                color: "#1D4ED8",
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTrip(t.id)}
                              style={{
                                fontSize: 12,
                                border: "none",
                                background: "transparent",
                                color: "#B91C1C",
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 999,
                          backgroundColor:
                            t.status === "published" ? "#DCFCE7" : "#FEF3C7",
                          color:
                            t.status === "published" ? "#166534" : "#92400E",
                          border:
                            t.status === "published"
                              ? "1px solid #BBF7D0"
                              : "1px solid #FDE68A",
                        }}
                      >
                        {t.status || "draft"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/** Chip ya summary (Destination / Days / Budget / Group / Style) */
function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 999,
        padding: "6px 10px",
        backgroundColor: "#F9FAFB",
        border: "1px solid #E5E7EB",
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#9CA3AF",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}
