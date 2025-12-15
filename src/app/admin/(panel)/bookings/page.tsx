"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";

const BRAND = {
  ink: "#0E2430",
  primary: "#1B4D3E",
  sand: "#F4F3ED",
  border: "#E1E5ED",
};

type BookingRow = {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  operator_id: string | null;
  trip_id: string | null;
  traveller_name: string | null;
  traveller_email: string | null;
  status: string;
  total_amount: number | null;
  currency: string | null;
  travel_date: string | null;
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

export default function AdminBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "confirmed" | "cancelled" | "completed"
  >("all");

  useEffect(() => {
    const loadBookings = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: qErr } = await supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false });

        if (qErr) throw qErr;

        setBookings((data || []) as BookingRow[]);
      } catch (err: any) {
        console.error("admin bookings load error:", err);
        setError(
          err?.message || "Failed to load bookings. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  const updateStatus = async (
    id: string,
    status: "pending" | "confirmed" | "cancelled" | "completed"
  ) => {
    try {
      setSavingId(id);
      setError(null);

      const { error: upErr } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", id);

      if (upErr) throw upErr;

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                status,
              }
            : b
        )
      );
    } catch (err: any) {
      console.error("update booking status error:", err);
      setError(
        err?.message || "Failed to update booking. Please try again."
      );
    } finally {
      setSavingId(null);
    }
  };

  const filteredBookings =
    filterStatus === "all"
      ? bookings
      : bookings.filter(
          (b) => (b.status || "").toLowerCase() === filterStatus
        );

  const pendingCount = bookings.filter(
    (b) => (b.status || "").toLowerCase() === "pending"
  ).length;
  const confirmedCount = bookings.filter(
    (b) => (b.status || "").toLowerCase() === "confirmed"
  ).length;
  const completedCount = bookings.filter(
    (b) => (b.status || "").toLowerCase() === "completed"
  ).length;

  const totalValue = bookings.reduce((sum, b) => {
    if (!b.total_amount) return sum;
    return sum + Number(b.total_amount);
  }, 0);

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
              Bookings
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "#4b5563",
                maxWidth: 520,
              }}
            >
              Track all safari bookings coming through Safari Connector. Confirm,
              complete or cancel as needed.
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <Link
              href="/admin"
              style={{
                fontSize: 13,
                color: "#065f46",
                textDecoration: "none",
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${BRAND.border}`,
                backgroundColor: "#ffffff",
              }}
            >
              ← Back to admin
            </Link>
            <div style={{ marginTop: 6 }}>
              <AdminLogoutButton />
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

        {/* TOP SUMMARY */}
        <div
          style={{
            ...cardStyle,
            marginBottom: 20,
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 4,
              }}
            >
              Booking summary
            </p>
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              {bookings.length.toLocaleString("en-US")} total bookings ·{" "}
              {pendingCount} pending · {confirmedCount} confirmed ·{" "}
              {completedCount} completed
            </p>
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Total value (all currencies):{" "}
              {totalValue.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(
              [
                ["all", "All"],
                ["pending", "Pending"],
                ["confirmed", "Confirmed"],
                ["completed", "Completed"],
                ["cancelled", "Cancelled"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  setFilterStatus(value as typeof filterStatus)
                }
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border:
                    filterStatus === value
                      ? "none"
                      : `1px solid ${BRAND.border}`,
                  backgroundColor:
                    filterStatus === value ? BRAND.primary : "#ffffff",
                  color: filterStatus === value ? "#ffffff" : BRAND.ink,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* BOOKINGS LIST */}
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
                All bookings
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                Use this view for a high-level understanding of current demand.
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
              Loading bookings…
            </p>
          ) : filteredBookings.length === 0 ? (
            <p
              style={{
                fontSize: 14,
                color: "#9ca3af",
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              No bookings in this view.
            </p>
          ) : (
            filteredBookings.map((b) => {
              const status = (b.status || "").toLowerCase();
              let statusColor = "#6b7280";
              if (status === "pending") statusColor = "#b91c1c";
              if (status === "confirmed") statusColor = "#166534";
              if (status === "completed") statusColor = "#1d4ed8";
              if (status === "cancelled") statusColor = "#9ca3af";

              return (
                <div
                  key={b.id}
                  style={{
                    padding: "10px 0",
                    borderTop: `1px solid ${BRAND.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: BRAND.ink,
                        marginBottom: 2,
                      }}
                    >
                      {b.traveller_name || "Unknown traveller"}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 2,
                      }}
                    >
                      {b.traveller_email || "No email"} · Trip:{" "}
                      {b.trip_id || "-"} · Operator:{" "}
                      {b.operator_id || "-"}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#4b5563",
                      }}
                    >
                      Travel date:{" "}
                      {b.travel_date
                        ? new Date(b.travel_date).toLocaleDateString()
                        : "Not set"}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                        marginTop: 2,
                      }}
                    >
                      {b.created_at
                        ? `Created ${new Date(
                            b.created_at
                          ).toLocaleString()}`
                        : ""}
                    </p>
                  </div>

                  <div
                    style={{
                      minWidth: 180,
                      textAlign: "right",
                      fontSize: 11,
                    }}
                  >
                    <p
                      style={{
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: `1px solid ${BRAND.border}`,
                          color: statusColor,
                        }}
                      >
                        {status.charAt(0).toUpperCase() +
                          status.slice(1)}
                      </span>
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#4b5563",
                        marginBottom: 6,
                      }}
                    >
                      {b.total_amount
                        ? `${b.currency || "USD"} ${Number(
                            b.total_amount
                          ).toLocaleString("en-US")}`
                        : "No amount"}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      {status !== "pending" && (
                        <button
                          onClick={() => updateStatus(b.id, "pending")}
                          disabled={savingId === b.id}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: `1px solid #fecaca`,
                            backgroundColor: "#fef2f2",
                            color: "#b91c1c",
                            cursor:
                              savingId === b.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {savingId === b.id ? "…" : "Pending"}
                        </button>
                      )}
                      {status !== "confirmed" && (
                        <button
                          onClick={() => updateStatus(b.id, "confirmed")}
                          disabled={savingId === b.id}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "none",
                            backgroundColor: "#16a34a",
                            color: "#fff",
                            cursor:
                              savingId === b.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {savingId === b.id ? "…" : "Confirm"}
                        </button>
                      )}
                      {status !== "completed" && (
                        <button
                          onClick={() => updateStatus(b.id, "completed")}
                          disabled={savingId === b.id}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "none",
                            backgroundColor: "#1d4ed8",
                            color: "#fff",
                            cursor:
                              savingId === b.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {savingId === b.id ? "…" : "Mark completed"}
                        </button>
                      )}
                      {status !== "cancelled" && (
                        <button
                          onClick={() => updateStatus(b.id, "cancelled")}
                          disabled={savingId === b.id}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: `1px solid ${BRAND.border}`,
                            backgroundColor: "#f9fafb",
                            color: "#6b7280",
                            cursor:
                              savingId === b.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {savingId === b.id ? "…" : "Cancel"}
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
