"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

/* -------- Types -------- */

type OperatorRow = {
  id: string;
  user_id?: string | null;
  operator_id?: string | null;
  name?: string | null;
  company_name?: string | null;
  status?: string | null; // pending / approved / live / ...
  [key: string]: any;
};

type TripRow = {
  id: string;
  title: string | null;
  price_from: number | null;
  status?: string | null; // kama una column hii, la sivyo tuna-set "active"
  operator_id: string | null;
};

/* -------- Helper -------- */

const pickOperatorId = (op: OperatorRow | null): string | null => {
  if (!op) return null;
  if (typeof op.operator_id === "string" && op.operator_id) return op.operator_id;
  if (typeof op.id === "string" && op.id) return op.id;
  if (typeof op.user_id === "string" && op.user_id) return op.user_id;
  return null;
};

export default function OperatorTripsPage() {
  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1) Current user
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) {
          console.error("operator trips auth error:", userErr);
        }

        if (!user) {
          if (!isMounted) return;
          setErrorMsg("Please log in as an operator to manage your trips.");
          setOperator(null);
          setTrips([]);
          setLoading(false);
          return;
        }

        // 2) Operator profile (operators_view → operators fallback)
        let operatorRow: OperatorRow | null = null;

        const { data: opViewRows, error: opViewErr } = await supabase
          .from("operators_view")
          .select("*")
          .eq("user_id", user.id)
          .limit(1);

        if (opViewErr) {
          console.warn("operators_view trips error:", opViewErr);
        }

        if (opViewRows && opViewRows.length > 0) {
          operatorRow = opViewRows[0] as OperatorRow;
        }

        if (!operatorRow) {
          const { data: opRows, error: opErr } = await supabase
            .from("operators")
            .select("*")
            .eq("user_id", user.id)
            .limit(1);

          if (opErr) {
            console.warn("operators fallback trips error:", opErr);
          }
          if (opRows && opRows.length > 0) {
            operatorRow = opRows[0] as OperatorRow;
          }
        }

        const operatorId = pickOperatorId(operatorRow);

        if (!operatorRow || !operatorId) {
          if (!isMounted) return;
          setOperator(null);
          setTrips([]);
          setErrorMsg(
            "We couldn’t find your operator profile. Please contact support to get set up."
          );
          setLoading(false);
          return;
        }

        if (!isMounted) return;
        setOperator(operatorRow);

        // 3) Trips for this operator
        const { data: tripRows, error: tripsErr } = await supabase
          .from("trips")
          .select("id,title,price_from,status,operator_id")
          .eq("operator_id", operatorId)
          .order("created_at", { ascending: false });

        if (tripsErr) {
          console.error("operator trips load error:", tripsErr);
          if (!isMounted) return;
          setTrips([]);
          setErrorMsg("Could not load your trips.");
        } else if (isMounted) {
          setTrips((tripRows || []) as TripRow[]);
        }
      } catch (err: any) {
        console.error("operator trips exception:", err);
        if (isMounted) {
          setErrorMsg("Unexpected error while loading your trips.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteTrip = async (tripId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this trip? This cannot be undone."
    );
    if (!confirmDelete) return;

    const { error } = await supabase.from("trips").delete().eq("id", tripId);
    if (error) {
      console.error("delete trip error:", error);
      alert("Failed to delete trip. Please try again.");
      return;
    }

    setTrips((prev) => prev.filter((t) => t.id !== tripId));
  };

  const operatorName =
    (operator?.name as string) ||
    (operator?.company_name as string) ||
    "Tour Operator";

  const tripsCount = trips.length;

  // -------- Approval logic --------
  const rawStatus = (operator?.status as string) || "pending";
  const canPostTrips =
    rawStatus === "approved" || rawStatus === "live";

  const statusLabel =
    rawStatus === "approved" || rawStatus === "live"
      ? "Approved – you can post trips and receive enquiries."
      : rawStatus === "pending"
      ? "Pending approval – you can’t add new trips yet."
      : "Not listed – contact support.";

  const statusColor =
    rawStatus === "approved" || rawStatus === "live"
      ? "#ECFDF3"
      : rawStatus === "pending"
      ? "#FEF3C7"
      : "#FEE2E2";

  const statusTextColor =
    rawStatus === "approved" || rawStatus === "live"
      ? "#166534"
      : rawStatus === "pending"
      ? "#92400E"
      : "#B91C1C";

  return (
    <main
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "32px 16px 64px",
      }}
    >
      {/* Top heading + back button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#9CA3AF",
              marginBottom: 6,
            }}
          >
            Safari Connector
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: "#14532D",
            }}
          >
            Tour Operator Dashboard
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            Welcome, {operatorName} — manage your trips listed for travellers
            here.
          </p>
        </div>

        {/* back to dashboard button */}
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid #D1D5DB",
            backgroundColor: "#FFFFFF",
            fontSize: 13,
            fontWeight: 500,
            color: "#374151",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 16 }}>←</span>
          <span>Back to dashboard</span>
        </Link>
      </div>

      {/* Operator status banner */}
      {operator && (
        <div
          style={{
            marginTop: 10,
            marginBottom: 12,
            borderRadius: 12,
            padding: "8px 12px",
            backgroundColor: statusColor,
            border: "1px solid #E5E7EB",
            fontSize: 13,
            color: statusTextColor,
          }}
        >
          <strong>{operatorName}</strong>: {statusLabel}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            marginTop: 8,
            marginBottom: 12,
            borderRadius: 16,
            padding: "10px 12px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            fontSize: 13,
            color: "#B91C1C",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Main trips section */}
      <section
        style={{
          marginTop: 12,
          borderRadius: 24,
          backgroundColor: "#FFFFFF",
          border: "1px solid #E5E7EB",
          padding: "18px 18px 16px",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              Your trips
            </h2>
            <p
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 13,
                color: "#6B7280",
              }}
            >
              Trips you have listed for travellers to book.
            </p>
          </div>

          {canPostTrips ? (
            <Link
              href="/trips/new"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                backgroundColor: "#0B6B3A",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                whiteSpace: "nowrap",
              }}
            >
              + Add new trip
            </Link>
          ) : (
            <button
              type="button"
              disabled
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #D1D5DB",
                backgroundColor: "#E5E7EB",
                color: "#6B7280",
                fontSize: 13,
                fontWeight: 500,
                cursor: "not-allowed",
                whiteSpace: "nowrap",
              }}
            >
              + Add new trip (awaiting approval)
            </button>
          )}
        </div>

        {loading ? (
          <div
            style={{
              fontSize: 13,
              color: "#6B7280",
            }}
          >
            Loading trips…
          </div>
        ) : tripsCount === 0 ? (
          <div
            style={{
              marginTop: 8,
              borderRadius: 16,
              border: "1px dashed #D1D5DB",
              backgroundColor: "#F9FAFB",
              padding: 16,
              fontSize: 13,
              color: "#4B5563",
            }}
          >
            You haven&apos;t created any trips yet.{" "}
            {canPostTrips ? (
              <>
                Click <strong>&ldquo;Add new trip&rdquo;</strong> to publish
                your first itinerary.
              </>
            ) : (
              <>
                Your account is still pending approval. Once approved, you&apos;ll
                be able to add trips here.
              </>
            )}
          </div>
        ) : (
          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {trips.map((trip) => {
              const statusLabel = trip.status || "active";

              return (
                <div
                  key={trip.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid #E5E7EB",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {trip.title || "Untitled trip"}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6B7280",
                      }}
                    >
                      {trip.price_from
                        ? `From $${trip.price_from.toLocaleString()}`
                        : "Price on request"}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        fontSize: 13,
                      }}
                    >
                      <Link
                        href={`/trips/${trip.id}`}
                        style={{
                          color: "#0B6B3A",
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        Manage trip →
                      </Link>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#D1D5DB",
                        }}
                      >
                        |
                      </span>
                      <Link
                        href={`/trips/${trip.id}`}
                        style={{
                          color: "#2563EB",
                          textDecoration: "none",
                          fontWeight: 500,
                        }}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteTrip(trip.id)}
                        style={{
                          border: "none",
                          background: "none",
                          padding: 0,
                          margin: 0,
                          fontSize: 13,
                          color: "#B91C1C",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      alignSelf: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "lowercase",
                        backgroundColor:
                          statusLabel === "active" ? "#FEF3C7" : "#E5E7EB",
                        color:
                          statusLabel === "active" ? "#92400E" : "#4B5563",
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
