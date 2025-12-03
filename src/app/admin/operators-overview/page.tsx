"use client";

import React, { useEffect, useState, CSSProperties } from "react";
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
  status: string | null;
};

type TripRow = {
  id: string;
  operator_id: string | null;
  created_at: string | null;
};

type OperatorWithStats = OperatorRow & {
  totalTrips: number;
  lastTripDate: string | null;
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

export default function AdminOperatorsOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [operators, setOperators] = useState<OperatorWithStats[]>([]);
  const [totalOperators, setTotalOperators] = useState(0);

  // total trips across all operators (from main `trips` table)
  const [totalMarketplaceTrips, setTotalMarketplaceTrips] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Operators (with status)
        const {
          data: opRows,
          count: opCount,
          error: opError,
        } = await supabase
          .from("operators_view")
          .select("id, name, country, created_at, status", {
            count: "exact",
          })
          .order("name", { ascending: true });

        if (opError) throw opError;

        const operatorsData = (opRows || []) as OperatorRow[];
        setTotalOperators(
          typeof opCount === "number" ? opCount : operatorsData.length
        );

        // 2) Trips from main `trips` table
        const {
          data: allTrips,
          count: marketplaceCount,
          error: tripsError,
        } = await supabase
          .from("trips")
          .select("id, operator_id, created_at", { count: "exact" });

        if (tripsError) throw tripsError;

        const trips = (allTrips || []) as TripRow[];
        setTotalMarketplaceTrips(
          typeof marketplaceCount === "number"
            ? marketplaceCount
            : trips.length
        );

        // 3) Compute per-operator stats from `trips`
        const withStats: OperatorWithStats[] = operatorsData.map((op) => {
          const opTrips = trips.filter(
            (t) => t.operator_id && t.operator_id === op.id
          );

          const totalTripsForOp = opTrips.length;

          let lastTripDate: string | null = null;
          if (opTrips.length > 0) {
            const latest = opTrips.reduce((latest, current) => {
              if (!latest.created_at) return current;
              if (!current.created_at) return latest;
              return new Date(current.created_at) > new Date(latest.created_at)
                ? current
                : latest;
            });
            lastTripDate = latest.created_at;
          }

          return {
            ...op,
            totalTrips: totalTripsForOp,
            lastTripDate,
          };
        });

        setOperators(withStats);
      } catch (err: any) {
        console.error("admin operators overview error:", err);
        setError(
          err?.message || "Failed to load operator overview. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const pendingCount = operators.filter(
    (op) => (op.status || "").toLowerCase() === "pending"
  ).length;

  const operatorsWithNoTrips = operators.filter((op) => op.totalTrips === 0)
    .length;

  // ====== ACTIONS: APPROVE / REJECT / SUSPEND ======
  const updateStatus = async (
    id: string,
    status: "approved" | "rejected" | "suspended"
  ) => {
    try {
      setSavingId(id);
      setError(null);

      const { error: updateError } = await supabase
        .from("operators")
        .update({ status })
        .eq("id", id);

      if (updateError) throw updateError;

      // update local state
      setOperators((prev) =>
        prev.map((op) =>
          op.id === id
            ? {
                ...op,
                status,
              }
            : op
        )
      );
    } catch (err: any) {
      console.error("update operator status error:", err);
      setError(
        err?.message ||
          "Failed to update operator status. Please try again."
      );
    } finally {
      setSavingId(null);
    }
  };

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
                marginBottom: 8,
              }}
            >
              Operators overview
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "#4b5563",
                maxWidth: 520,
              }}
            >
              View all operators on Safari Connector, approve or reject new
              applications and see how many trips each supplier has listed.
            </p>
          </div>

          <Link
            href="/admin"
            style={{
              fontSize: 13,
              color: "#065f46",
              textDecoration: "none",
              padding: "8px 14px",
              borderRadius: 999,
              border: `1px solid ${BRAND.border}`,
              backgroundColor: "#ffffff",
            }}
          >
            ← Back to admin overview
          </Link>
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

        {/* STATS CARDS */}
        <section style={{ ...grid3Style, marginBottom: 24 }}>
          {/* Total operators */}
          <div style={cardStyle}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 4,
              }}
            >
              Total operators
            </p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: BRAND.primary,
                marginBottom: 2,
              }}
            >
              {totalOperators.toLocaleString("en-US")}
            </p>
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              Companies currently registered on Safari Connector.
            </p>
          </div>

          {/* Total marketplace trips (from `trips` table) */}
          <div style={cardStyle}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 4,
              }}
            >
              Total marketplace trips
            </p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: BRAND.primary,
                marginBottom: 2,
              }}
            >
              {totalMarketplaceTrips.toLocaleString("en-US")}
            </p>
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              Trips currently in the main <code>trips</code> table powering the
              public marketplace.
            </p>
          </div>

          {/* Operators with no trips / pending */}
          <div style={cardStyle}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 4,
              }}
            >
              Pending & low-supply operators
            </p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: pendingCount > 0 ? "#b45309" : BRAND.primary,
                marginBottom: 2,
              }}
            >
              {pendingCount.toLocaleString("en-US")}
            </p>
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              Pending operators awaiting approval.{" "}
              {operatorsWithNoTrips > 0 &&
                `There are also ${operatorsWithNoTrips} operators with no trips yet.`}
            </p>
          </div>
        </section>

        {/* LIST OF OPERATORS */}
        <section style={cardStyle}>
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
                All operators
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                Browse suppliers, approve applications and jump into their
                dashboards.
              </p>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              Sorted A → Z
            </p>
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
              Loading operators…
            </p>
          ) : operators.length === 0 ? (
            <p
              style={{
                fontSize: 14,
                color: "#9ca3af",
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              No operators have been registered yet.
            </p>
          ) : (
            operators.map((op) => {
              const status = (op.status || "pending").toLowerCase();

              const isPending = status === "pending";

              let statusLabel = "Pending";
              let statusColor = "#b45309";
              let statusBg = "#fef3c7";

              if (status === "approved") {
                statusLabel = "Approved";
                statusColor = "#166534";
                statusBg = "#dcfce7";
              } else if (status === "rejected") {
                statusLabel = "Rejected";
                statusColor = "#991b1b";
                statusBg = "#fee2e2";
              } else if (status === "suspended") {
                statusLabel = "Suspended";
                statusColor = "#92400e";
                statusBg = "#fffbeb";
              }

              return (
                <div
                  key={op.id}
                  style={{
                    padding: "12px 0",
                    borderTop: `1px solid ${BRAND.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {/* Left: summary */}
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: BRAND.ink,
                        marginBottom: 2,
                      }}
                    >
                      {op.name || "Unnamed operator"}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      {op.country || "Country not set"}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                        marginTop: 2,
                      }}
                    >
                      {op.created_at
                        ? `Joined ${new Date(
                            op.created_at
                          ).toLocaleDateString()}`
                        : "Joined date unknown"}
                    </p>
                  </div>

                  {/* Middle: stats */}
                  <div
                    style={{
                      textAlign: "right",
                      minWidth: 140,
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        color: BRAND.ink,
                      }}
                    >
                      {op.totalTrips.toLocaleString("en-US")} trips
                    </div>
                    <div style={{ color: "#9ca3af", marginTop: 2 }}>
                      {op.lastTripDate
                        ? `Last trip ${new Date(
                            op.lastTripDate
                          ).toLocaleDateString()}`
                        : "No trips yet"}
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 6,
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 500,
                        color: statusColor,
                        backgroundColor: statusBg,
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {/* Right: actions */}
                  <div
                    style={{
                      textAlign: "right",
                      minWidth: 220,
                      fontSize: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      alignItems: "flex-end",
                    }}
                  >
                    <Link
                      href={`/admin/operators/${op.id}`}
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#065f46",
                        textDecoration: "none",
                      }}
                    >
                      View operator dashboard →
                    </Link>

                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      {/* Reject – mostly for pending */}
                      {isPending && (
                        <button
                          onClick={() => updateStatus(op.id, "rejected")}
                          disabled={savingId === op.id}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: `1px solid #fecaca`,
                            backgroundColor: "#fef2f2",
                            color: "#b91c1c",
                            cursor:
                              savingId === op.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {savingId === op.id ? "…" : "Reject"}
                        </button>
                      )}

                      {/* Approve – for pending or suspended */}
                      {(isPending || status === "suspended") && (
                        <button
                          onClick={() => updateStatus(op.id, "approved")}
                          disabled={savingId === op.id}
                          style={{
                            fontSize: 11,
                            padding: "4px 10px",
                            borderRadius: 999,
                            border: "none",
                            backgroundColor: "#16a34a",
                            color: "#ffffff",
                            cursor:
                              savingId === op.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {savingId === op.id ? "Saving…" : "Approve"}
                        </button>
                      )}

                      {/* Suspend – only for approved */}
                      {status === "approved" && (
                        <button
                          onClick={() => updateStatus(op.id, "suspended")}
                          disabled={savingId === op.id}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: `1px solid #fcd34d`,
                            backgroundColor: "#fffbeb",
                            color: "#92400e",
                            cursor:
                              savingId === op.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {savingId === op.id ? "Saving…" : "Suspend"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
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
