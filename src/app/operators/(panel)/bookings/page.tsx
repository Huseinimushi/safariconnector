// src/app/bookings/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useBookingsLive } from "@/hooks/useBookingsLive";

/* ---------- Types ---------- */

type OperatorRow = {
  id: string;
  user_id?: string | null;
  operator_id?: string | null;
  name?: string | null;
  company_name?: string | null;
  email?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  [key: string]: any;
};

type BookingRow = {
  id: string;
  trip_id: string | null;
  traveller_id: string | null;
  operator_id: string | null;
  quote_id: string | null;

  // Booking lifecycle status:
  // payment_submitted -> payment_verified -> confirmed (then maybe completed/cancelled)
  status: string | null;

  date_from: string | null;
  date_to: string | null;
  pax: number | null;

  total_amount: string | number | null;
  currency: string | null;

  commission_percentage: string | number | null;
  commission_amount: string | number | null;
  operator_receivable: string | number | null;

  payment_status: string | null;
  disbursement_status: string | null;
  payment_reference: string | null;

  meta: any;

  created_at: string | null;
  updated_at: string | null;
};

/* ---------- Helpers ---------- */

const pickOperatorId = (op: OperatorRow | null): string | null => {
  if (!op) return null;
  if (typeof op.id === "string") return op.id;
  if (typeof op.operator_id === "string") return op.operator_id;
  if (typeof op.user_id === "string") return op.user_id;
  return null;
};

const formatDateShort = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateLong = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (
  amount: string | number | null | undefined,
  currency: string | null | undefined
) => {
  if (amount == null) return "-";
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(num)) return amount?.toString() ?? "-";
  const cur = currency || "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${cur} ${num.toLocaleString()}`;
  }
};

const normaliseStatus = (status: string | null | undefined) =>
  (status || "pending").toLowerCase();

/** Friendly label for booking.status */
const statusLabel = (status: string | null | undefined) => {
  const s = normaliseStatus(status);

  // Payment flow (Finance verifies)
  if (s === "payment_submitted") return "Payment submitted";
  if (s === "payment_verified") return "Payment verified";

  // Operator / system flow
  if (s === "confirmed") return "Confirmed";
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";

  return "Pending";
};

const statusStyles = (status: string | null | undefined) => {
  const s = normaliseStatus(status);

  // Green: confirmed/completed
  if (s === "confirmed" || s === "completed") {
    return {
      bg: "#ECFDF5",
      border: "1px solid #BBF7D0",
      color: "#166534",
    };
  }

  // Blue-ish: payment states
  if (s === "payment_verified") {
    return {
      bg: "#EFF6FF",
      border: "1px solid #BFDBFE",
      color: "#1D4ED8",
    };
  }
  if (s === "payment_submitted") {
    return {
      bg: "#F0FDFA",
      border: "1px solid #99F6E4",
      color: "#0F766E",
    };
  }

  // Red: cancelled
  if (s === "cancelled") {
    return {
      bg: "#FEF2F2",
      border: "1px solid #FCA5A5",
      color: "#B91C1C",
    };
  }

  // Amber: pending/other
  return {
    bg: "#FEF3C7",
    border: "1px solid #FDE68A",
    color: "#92400E",
  };
};

const isPaymentVerified = (status: string | null | undefined) =>
  normaliseStatus(status) === "payment_verified";

/* ---------- Component ---------- */

export default function OperatorBookingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [operatorId, setOperatorId] = useState<string | null>(null);

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1) Auth
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userResp?.user) {
        console.error("operator bookings auth error:", userErr);
        setErrorMsg("Please log in as a tour operator.");
        setOperator(null);
        setOperatorId(null);
        setBookings([]);
        return;
      }

      const user = userResp.user;

      // 2) Operator profile (operators_view then operators)
      let operatorRow: OperatorRow | null = null;

      const { data: opViewRows, error: opViewErr } = await supabase
        .from("operators_view")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);

      if (opViewErr) {
        console.warn("operator bookings operators_view error:", opViewErr);
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
          console.warn("operator bookings operators fallback error:", opErr);
        }
        if (opRows && opRows.length > 0) {
          operatorRow = opRows[0] as OperatorRow;
        }
      }

      const opId = pickOperatorId(operatorRow);

      if (!operatorRow || !opId) {
        setOperator(null);
        setOperatorId(null);
        setBookings([]);
        setErrorMsg(
          "We couldn’t find your operator profile. Please contact support."
        );
        return;
      }

      setOperator(operatorRow);
      setOperatorId(opId);

      // 3) Load bookings for this operator
      const { data: rows, error } = await supabase
        .from("bookings")
        .select(
          [
            "id",
            "trip_id",
            "traveller_id",
            "operator_id",
            "quote_id",
            "status",
            "date_from",
            "date_to",
            "pax",
            "total_amount",
            "currency",
            "commission_percentage",
            "commission_amount",
            "operator_receivable",
            "payment_status",
            "disbursement_status",
            "payment_reference",
            "meta",
            "created_at",
            "updated_at",
          ].join(", ")
        )
        .eq("operator_id", opId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("operator bookings load error:", error);
        setErrorMsg("Could not load your bookings.");
        setBookings([]);
      } else {
        const safeRows = ((rows ?? []) as unknown) as BookingRow[];
        setBookings(safeRows);
      }
    } catch (err: any) {
      console.error("operator bookings exception:", err);
      setErrorMsg("Unexpected error while loading your bookings.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ✅ Realtime + polling auto-refresh when Finance updates booking.status (and any booking changes)
  useBookingsLive({
    operatorId: operatorId || undefined,
    enabled: !!operatorId,
    onChange: () => {
      load();
    },
  });

  const totalBookings = bookings.length;

  const pendingBookings = useMemo(() => {
    // “Pending confirmation” here includes:
    // - pending
    // - payment_submitted
    // - payment_verified (waiting operator confirm)
    const pendingLike = new Set([
      "pending",
      "payment_submitted",
      "payment_verified",
    ]);
    return bookings.filter((b) => pendingLike.has(normaliseStatus(b.status)))
      .length;
  }, [bookings]);

  const confirmedBookings = useMemo(
    () =>
      bookings.filter((b) =>
        ["confirmed", "completed"].includes(normaliseStatus(b.status))
      ).length,
    [bookings]
  );

  const cancelledBookings = useMemo(
    () =>
      bookings.filter((b) => normaliseStatus(b.status) === "cancelled").length,
    [bookings]
  );

  const companyName =
    (operator?.company_name as string) ||
    (operator?.name as string) ||
    "Safari operator";

  const handleConfirm = useCallback(
    async (bookingId: string) => {
      if (!bookingId) return;

      try {
        setConfirmingId(bookingId);
        setErrorMsg(null);

        const res = await fetch("/api/bookings/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: bookingId }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || "Failed to confirm booking.");
        }

        // Optimistic UI: update locally
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "confirmed" } : b))
        );

        // Then refetch to ensure server is source of truth
        await load();
      } catch (e: any) {
        console.error("confirm booking error:", e);
        setErrorMsg(e?.message || "Failed to confirm booking.");
      } finally {
        setConfirmingId(null);
      }
    },
    [load]
  );

  /* ---------- Render ---------- */

  return (
    <main
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "32px 16px 64px",
      }}
    >
      {/* Top heading */}
      <section
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#9CA3AF",
              marginBottom: 4,
            }}
          >
            {companyName}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
              color: "#14532D",
            }}
          >
            Bookings
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 6,
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            View bookings generated from accepted quotes, track status and payment
            progress.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => load()}
            style={{
              borderRadius: 999,
              padding: "7px 14px",
              border: "1px solid #D1D5DB",
              backgroundColor: "#FFFFFF",
              color: "#374151",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Refresh bookings"
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            style={{
              borderRadius: 999,
              padding: "7px 14px",
              border: "1px solid #D1D5DB",
              backgroundColor: "#FFFFFF",
              color: "#374151",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Back to dashboard
          </button>
        </div>
      </section>

      {errorMsg && (
        <div
          style={{
            marginBottom: 16,
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

      {/* Summary cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            borderRadius: 20,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 4,
            }}
          >
            Total bookings
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#111827",
              marginTop: 8,
            }}
          >
            {totalBookings}
          </div>
        </div>

        <div
          style={{
            borderRadius: 20,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 4,
            }}
          >
            Pending confirmation
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#92400E",
              marginTop: 8,
            }}
          >
            {pendingBookings}
          </div>
        </div>

        <div
          style={{
            borderRadius: 20,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 4,
            }}
          >
            Confirmed / completed
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#166534",
              marginTop: 8,
            }}
          >
            {confirmedBookings}
          </div>
        </div>

        <div
          style={{
            borderRadius: 20,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 4,
            }}
          >
            Cancelled
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#B91C1C",
              marginTop: 8,
            }}
          >
            {cancelledBookings}
          </div>
        </div>
      </section>

      {/* Bookings list */}
      <section
        style={{
          borderRadius: 22,
          border: "1px solid #E5E7EB",
          backgroundColor: "#FFFFFF",
          padding: "16px 18px 14px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            gap: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#6B7280",
                marginBottom: 2,
              }}
            >
              Bookings list
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              All bookings for your trips
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 12, fontSize: 13, color: "#6B7280" }}>
            Loading bookings...
          </div>
        ) : bookings.length === 0 ? (
          <div
            style={{
              marginTop: 10,
              borderRadius: 16,
              border: "1px dashed #E5E7EB",
              padding: 14,
              fontSize: 13,
              color: "#4B5563",
              backgroundColor: "#F9FAFB",
            }}
          >
            You don&apos;t have any bookings yet. When travellers accept a quote,
            bookings will appear here.
          </div>
        ) : (
          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {bookings.map((b) => {
              const { bg, border, color } = statusStyles(b.status);

              const paymentLabel = (() => {
                const p = (b.payment_status || "").toLowerCase();
                if (!p) return "Not paid";
                if (p === "paid" || p === "completed") return "Paid";
                if (p === "deposit") return "Deposit received";
                if (p === "failed") return "Payment failed";
                return b.payment_status;
              })();

              const canConfirm =
                isPaymentVerified(b.status) && confirmingId !== b.id;

              const isConfirming = confirmingId === b.id;

              return (
                <div
                  key={b.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid #E5E7EB",
                    padding: "10px 12px",
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0, 2.4fr) minmax(0, 1.4fr) minmax(0, 1.6fr)",
                    gap: 10,
                  }}
                >
                  {/* Dates + pax + status */}
                  <div>
                    <div
                      style={{
                        marginBottom: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          padding: "2px 7px",
                          borderRadius: 999,
                          backgroundColor: bg,
                          border,
                          color,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {statusLabel(b.status)}
                      </span>
                      {b.created_at && (
                        <span style={{ fontSize: 11, color: "#6B7280" }}>
                          Created {formatDateShort(b.created_at)}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "#111827",
                        fontWeight: 600,
                      }}
                    >
                      {b.date_from || b.date_to
                        ? `${formatDateLong(b.date_from)} – ${formatDateLong(
                            b.date_to
                          )}`
                        : "Dates to be confirmed"}
                    </div>

                    <div style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>
                      Travellers {b.pax ?? "not specified"}
                    </div>

                    {isPaymentVerified(b.status) && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: "#1D4ED8",
                          fontWeight: 600,
                        }}
                      >
                        Finance verified payment. You can confirm this booking.
                      </div>
                    )}
                  </div>

                  {/* Money summary */}
                  <div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>
                      Total trip value
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                      {formatMoney(b.total_amount, b.currency)}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
                      Operator receivable:{" "}
                      <strong>{formatMoney(b.operator_receivable, b.currency)}</strong>
                    </div>
                    {b.commission_percentage && (
                      <div style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>
                        Commission {b.commission_percentage}% (
                        {formatMoney(b.commission_amount, b.currency)})
                      </div>
                    )}
                  </div>

                  {/* Payment + actions */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#6B7280", textAlign: "right" }}>
                      Payment status: <strong>{paymentLabel}</strong>
                    </div>

                    {b.payment_reference && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          textAlign: "right",
                          wordBreak: "break-all",
                        }}
                      >
                        Ref: {b.payment_reference}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 4,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        justifyContent: "flex-end",
                      }}
                    >
                      {b.trip_id && (
                        <Link
                          href={`/trips/${encodeURIComponent(b.trip_id)}/edit`}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 999,
                            border: "1px solid #D1D5DB",
                            backgroundColor: "#FFFFFF",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#374151",
                            textDecoration: "none",
                          }}
                        >
                          View trip
                        </Link>
                      )}

                      {b.quote_id && (
                        <Link
                          href={`/quotes?quote_id=${encodeURIComponent(b.quote_id)}`}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 999,
                            border: "none",
                            backgroundColor: "#14532D",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#FFFFFF",
                            textDecoration: "none",
                          }}
                        >
                          View quote &amp; chat
                        </Link>
                      )}

                      {isPaymentVerified(b.status) && (
                        <button
                          type="button"
                          onClick={() => handleConfirm(b.id)}
                          disabled={!canConfirm || isConfirming}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 999,
                            border: "none",
                            backgroundColor: isConfirming ? "#9CA3AF" : "#1D4ED8",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#FFFFFF",
                            cursor: isConfirming ? "not-allowed" : "pointer",
                          }}
                          title="Confirm this booking after Finance verifies payment"
                        >
                          {isConfirming ? "Confirming..." : "Confirm booking"}
                        </button>
                      )}
                    </div>
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
