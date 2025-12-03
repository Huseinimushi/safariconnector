"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BRAND = {
  ink: "#0E2430",
  primary: "#1B4D3E",
  sand: "#F4F3ED",
  border: "#E1E5ED",
};

type OperatorRow = {
  id: string;
  name: string | null;
  country: string | null;
  created_at: string | null;
};

type TripRow = {
  id: string;
  title: string | null;
  operator_id: string | null;
  created_at: string | null;
};

type QuoteRow = {
  id: string;
  operator_id: string | null;
  created_at: string | null;
  replied_at?: string | null;
  status?: string | null;
  traveller_name?: string | null;
  traveller_email?: string | null;
  trip_title?: string | null;
  message?: string | null;
  [key: string]: any;
};

const pageWrapper: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: BRAND.sand,
};

const containerStyle: CSSProperties = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "48px 16px 40px",
};

const cardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 24,
  padding: "20px 24px",
  boxShadow: "0 8px 30px rgba(15, 23, 42, 0.06)",
  border: `1px solid ${BRAND.border}`,
};

const grid3Style: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

const grid2Style: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

export default function AdminOperatorDetailPage() {
  const params = useParams();
  const operatorId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [savingTripId, setSavingTripId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);

  useEffect(() => {
    if (!operatorId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Operator info
        const { data: opRows, error: opError } = await supabase
          .from("operators_view")
          .select("id, name, country, created_at")
          .eq("id", operatorId)
          .maybeSingle();

        if (opError) {
          console.error("load operator error:", opError);
          setError(
            (opError as any)?.message ||
              "Failed to load operator details."
          );
          setOperator(null);
          setTrips([]);
          setQuotes([]);
          setLoading(false);
          return;
        }

        if (!opRows) {
          setError("Operator not found.");
          setOperator(null);
          setTrips([]);
          setQuotes([]);
          setLoading(false);
          return;
        }

        const op = opRows as OperatorRow;
        setOperator(op);

        // 2) TRIPS from main `trips` table (NOT operator_trips)
        const { data: tripRows, error: tripError } = await supabase
          .from("trips")
          .select("id, title, operator_id, created_at")
          .eq("operator_id", operatorId)
          .order("created_at", { ascending: false });

        if (tripError) {
          console.error("load trips error:", tripError);
          setTrips([]);
        } else {
          setTrips((tripRows || []) as TripRow[]);
        }

        // 3) QUOTES from operator_quotes
        const { data: quoteRows, error: quoteError } = await supabase
          .from("operator_quotes")
          .select("*")
          .eq("operator_id", operatorId)
          .order("created_at", { ascending: false });

        if (quoteError) {
          console.error("load quotes error:", quoteError);
          setQuotes([]);
        } else {
          setQuotes((quoteRows || []) as QuoteRow[]);
        }
      } catch (err: any) {
        console.error("admin operator detail unexpected error:", err);
        setError(
          err?.message ||
            "Failed to load operator dashboard. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [operatorId]);

  // ====== REMOVE TRIP (moderation) – now from `trips` table ======
  const handleRemoveTrip = async (tripId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this trip from Safari Connector? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      setSavingTripId(tripId);
      setError(null);

      const { error: deleteError } = await supabase
        .from("trips")
        .delete()
        .eq("id", tripId);

      if (deleteError) {
        console.error("delete trip error:", deleteError);
        setError(
          (deleteError as any)?.message ||
            "Failed to remove trip. Please try again."
        );
        return;
      }

      setTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch (err: any) {
      console.error("delete trip unexpected error:", err);
      setError(
        err?.message || "Failed to remove trip. Please try again."
      );
    } finally {
      setSavingTripId(null);
    }
  };

  // ====== QUICK STATS ======
  const totalTrips = trips.length;
  const totalQuotes = quotes.length;

  const unansweredQuotes = quotes.filter((q) => {
    const status = (q.status || "").toLowerCase();
    const hasReply = !!q.replied_at;
    if (hasReply) return false;
    if (["answered", "closed", "completed"].includes(status)) return false;
    return true;
  }).length;

  const answeredQuotes = totalQuotes - unansweredQuotes;

  const answeredWithTimes = quotes.filter(
    (q) => q.created_at && q.replied_at
  );
  let avgResponseMinutes: number | null = null;
  if (answeredWithTimes.length > 0) {
    const totalMinutes = answeredWithTimes.reduce((sum, q) => {
      const created = new Date(q.created_at as string).getTime();
      const replied = new Date(q.replied_at as string).getTime();
      const diffMinutes = (replied - created) / (1000 * 60);
      return sum + Math.max(diffMinutes, 0);
    }, 0);
    avgResponseMinutes = totalMinutes / answeredWithTimes.length;
  }

  const operatorName = operator?.name || "Operator";

  return (
    <div style={pageWrapper}>
      <div style={containerStyle}>
        {/* HEADER */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "2.1rem",
                lineHeight: 1.1,
                fontWeight: 600,
                color: BRAND.primary,
                marginBottom: 4,
              }}
            >
              {operatorName}
            </h1>
            <p
              style={{
                fontSize: 12,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#6b7280",
                marginBottom: 8,
              }}
            >
              Admin view · Operator dashboard
            </p>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "#4b5563",
                maxWidth: 520,
              }}
            >
              See this operator&apos;s trips, quote activity and account
              details. Use this view to monitor quality and remove problematic
              itineraries if needed.
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <Link
              href="/admin/operators-overview"
              style={{
                display: "inline-block",
                fontSize: 13,
                color: "#065f46",
                textDecoration: "none",
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${BRAND.border}`,
                backgroundColor: "#ffffff",
                marginBottom: 8,
              }}
            >
              ← Back to all operators
            </Link>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              Operator ID: {operatorId}
            </div>
          </div>
        </header>

        {error && (
          <div
            style={{
              ...cardStyle,
              borderColor: "#fecaca",
              backgroundColor: "#fef2f2",
              color: "#b91c1c",
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 14 }}>{error}</p>
          </div>
        )}

        {/* TOP STATS CARDS */}
        <section style={{ ...grid3Style, marginBottom: 24 }}>
          <div style={cardStyle}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 4,
              }}
            >
              Trips
            </p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: BRAND.primary,
                marginBottom: 2,
              }}
            >
              {totalTrips.toLocaleString("en-US")}
            </p>
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              Itineraries this operator has created.
            </p>
          </div>

          <div style={cardStyle}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 4,
              }}
            >
              Quotes received
            </p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: BRAND.primary,
                marginBottom: 2,
              }}
            >
              {totalQuotes.toLocaleString("en-US")}
            </p>
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              Total quote requests from travellers.
            </p>
          </div>

          <div style={cardStyle}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 4,
              }}
            >
              Unanswered quotes
            </p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 600,
                color:
                  unansweredQuotes > 0 ? "#b45309" : BRAND.primary,
                marginBottom: 2,
              }}
            >
              {unansweredQuotes.toLocaleString("en-US")}
            </p>
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              Quotes with no reply recorded yet.
            </p>
          </div>
        </section>

        {/* SECOND ROW: snapshot + response time */}
        <section style={{ ...grid2Style, marginBottom: 24 }}>
          {/* Operator snapshot */}
          <div style={cardStyle}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 12,
              }}
            >
              Operator snapshot
            </p>
            <div style={{ fontSize: 14 }}>
              <SnapshotRow label="Name" value={operatorName} />
              <SnapshotRow
                label="Country"
                value={operator?.country || "Not set"}
              />
              <SnapshotRow
                label="Joined"
                value={
                  operator?.created_at
                    ? new Date(
                        operator.created_at
                      ).toLocaleDateString()
                    : "Unknown"
                }
              />
              <SnapshotRow
                label="Total trips"
                value={totalTrips.toLocaleString("en-US")}
              />
              <SnapshotRow
                label="Total quotes"
                value={totalQuotes.toLocaleString("en-US")}
              />
              <SnapshotRow
                label="Answered quotes"
                value={answeredQuotes.toLocaleString("en-US")}
              />
            </div>
          </div>

          {/* Response behaviour */}
          <div style={cardStyle}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 12,
              }}
            >
              Response behaviour
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#4b5563",
                marginBottom: 12,
              }}
            >
              Use these metrics to understand how quickly this operator answers
              travellers and whether they need support or nudges.
            </p>

            <div style={{ fontSize: 14 }}>
              <SnapshotRow
                label="Average response time"
                value={
                  avgResponseMinutes !== null
                    ? `${Math.round(avgResponseMinutes)} min`
                    : totalQuotes === 0
                    ? "No quotes yet"
                    : "No replies recorded"
                }
              />
              <SnapshotRow
                label="Answered"
                value={`${answeredQuotes.toLocaleString(
                  "en-US"
                )} of ${totalQuotes.toLocaleString("en-US")}`}
              />
              <SnapshotRow
                label="Unanswered"
                value={unansweredQuotes.toLocaleString("en-US")}
              />
            </div>
          </div>
        </section>

        {/* THIRD ROW: trips + quotes lists */}
        <section style={grid2Style}>
          {/* Trips list + moderation */}
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: BRAND.ink,
                  }}
                >
                  Trips
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  All itineraries listed by this operator. You can remove any
                  problematic trip from the marketplace.
                </p>
              </div>
            </div>

            {loading ? (
              <p
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                Loading trips…
              </p>
            ) : trips.length === 0 ? (
              <p
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                This operator hasn&apos;t listed any trips yet.
              </p>
            ) : (
              trips.map((trip) => (
                <div
                  key={trip.id}
                  style={{
                    padding: "10px 0",
                    borderTop: `1px solid ${BRAND.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: BRAND.ink,
                      }}
                    >
                      {trip.title || "Untitled trip"}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                      }}
                    >
                      {trip.created_at
                        ? `Created ${new Date(
                            trip.created_at
                          ).toLocaleDateString()}`
                        : "Created date not available"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveTrip(trip.id)}
                    disabled={savingTripId === trip.id}
                    style={{
                      fontSize: 11,
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: `1px solid #fecaca`,
                      backgroundColor: "#fef2f2",
                      color: "#b91c1c",
                      cursor:
                        savingTripId === trip.id
                          ? "not-allowed"
                          : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {savingTripId === trip.id ? "Removing…" : "Remove trip"}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quotes list */}
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: BRAND.ink,
                  }}
                >
                  Quotes
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  All quote requests from travellers sent to this operator.
                </p>
              </div>
            </div>

            {loading ? (
              <p
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                Loading quotes…
              </p>
            ) : quotes.length === 0 ? (
              <p
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                No quote requests have been sent to this operator yet.
              </p>
            ) : (
              quotes.map((q) => {
                const status = (q.status || "").toLowerCase();
                const hasReply = !!q.replied_at;

                let statusLabel = "Pending";
                let statusColor = "#92400e";
                let statusBg = "#fffbeb";

                if (hasReply || ["answered", "closed", "completed"].includes(status)) {
                  statusLabel = "Answered";
                  statusColor = "#065f46";
                  statusBg = "#ecfdf5";
                } else if (
                  status === "cancelled" ||
                  status === "cancelled_by_guest"
                ) {
                  statusLabel = "Cancelled";
                  statusColor = "#991b1b";
                  statusBg = "#fef2f2";
                }

                return (
                  <div
                    key={q.id}
                    style={{
                      padding: "10px 0",
                      borderTop: `1px solid ${BRAND.border}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: BRAND.ink,
                          }}
                        >
                          {q.traveller_name || "Guest"}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "#9ca3af",
                          }}
                        >
                          {q.traveller_email || "No email recorded"}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "#6b7280",
                            marginTop: 4,
                          }}
                        >
                          {q.trip_title || "General safari enquiry"}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p
                          style={{
                            fontSize: 11,
                            color: "#9ca3af",
                          }}
                        >
                          {q.created_at
                            ? new Date(q.created_at).toLocaleDateString()
                            : "Date unknown"}
                        </p>
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 4,
                            fontSize: 11,
                            padding: "3px 10px",
                            borderRadius: 999,
                            backgroundColor: statusBg,
                            color: statusColor,
                            fontWeight: 500,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {q.message && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#4b5563",
                          marginTop: 4,
                        }}
                      >
                        {q.message.length > 140
                          ? q.message.slice(0, 140) + "…"
                          : q.message}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ========== SMALL COMPONENTS ========== */

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 6,
        fontSize: 14,
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 600, color: BRAND.ink }}>{value}</span>
    </div>
  );
}
