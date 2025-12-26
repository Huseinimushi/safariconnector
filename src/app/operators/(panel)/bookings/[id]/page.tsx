"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type OperatorRow = {
  id: string;
  user_id?: string | null;
  company_name?: string | null;
  name?: string | null;
  email?: string | null;
};

type BookingRow = {
  id: string;
  trip_id: string | null;
  quote_id: string | null;
  operator_id: string | null;
  date_from: string | null;
  date_to: string | null;
  pax: number | null;
  total_amount: number | null;
  currency: string | null;
  status: string | null; // pending_payment / confirmed / cancelled
  payment_status: string | null; // unpaid / deposit_paid / paid_in_full
  created_at: string | null;
};

/* ---------- Helpers ---------- */

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const formatDateShort = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const bookingStatusLabel = (status?: string | null) => {
  const s = String(status || "pending_payment").toLowerCase();
  switch (s) {
    case "pending_payment":
      return "Pending payment";
    case "confirmed":
      return "Confirmed booking";
    case "cancelled":
      return "Cancelled";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

const paymentStatusLabel = (status?: string | null) => {
  const s = String(status || "unpaid").toLowerCase();
  switch (s) {
    case "unpaid":
      return "Unpaid";
    case "deposit_paid":
      return "Deposit paid";
    case "paid_in_full":
      return "Paid in full";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

const chipStyles = (kind: "booking" | "payment", value?: string | null) => {
  const v = String(value || (kind === "booking" ? "pending_payment" : "unpaid")).toLowerCase();

  if (kind === "booking") {
    if (v === "confirmed") return { bg: "#ECFDF5", bd: "#BBF7D0", fg: "#166534" };
    if (v === "cancelled") return { bg: "#FEE2E2", bd: "#FECACA", fg: "#B91C1C" };
    return { bg: "#FEF3C7", bd: "#FDE68A", fg: "#92400E" }; // pending
  }

  // payment
  if (v === "paid_in_full") return { bg: "#ECFDF5", bd: "#BBF7D0", fg: "#166534" };
  if (v === "deposit_paid") return { bg: "#EFF6FF", bd: "#BFDBFE", fg: "#1D4ED8" };
  return { bg: "#FEF3C7", bd: "#FDE68A", fg: "#92400E" }; // unpaid
};

/* ---------- Page ---------- */

export default function OperatorBookingDetailPage() {
  const params = useParams();
  const router = useRouter();

  const bookingId = useMemo(() => {
    const id = (params as any)?.id;
    if (!id) return null;
    return Array.isArray(id) ? id[0] : String(id);
  }, [params]);

  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [booking, setBooking] = useState<BookingRow | null>(null);

  const [status, setStatus] = useState<string>("pending_payment");
  const [paymentStatus, setPaymentStatus] = useState<string>("unpaid");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const STATUS_OPTIONS = [
    { value: "pending_payment", label: "Pending payment" },
    { value: "confirmed", label: "Confirmed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const PAYMENT_STATUS_OPTIONS = [
    { value: "unpaid", label: "Unpaid" },
    { value: "deposit_paid", label: "Deposit paid" },
    { value: "paid_in_full", label: "Paid in full" },
  ];

  /* ---------- Load booking (and operator) ---------- */

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!bookingId) {
        setErrorMsg("Missing booking id in the URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);
      setDebugError(null);
      setSuccessMsg(null);

      try {
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userResp?.user) {
          if (!isMounted) return;
          setErrorMsg("Please log in as a tour operator.");
          setLoading(false);
          return;
        }

        const user = userResp.user;

        // 1) operator profile (operators_view -> fallback operators)
        let opRow: OperatorRow | null = null;

        const { data: opView, error: opViewErr } = await supabase
          .from("operators_view")
          .select("id,user_id,company_name,name,email")
          .eq("user_id", user.id)
          .maybeSingle();

        if (opViewErr) console.warn("operators_view error:", opViewErr);
        if (opView) {
          opRow = opView as OperatorRow;
        } else {
          const { data: op, error: opErr } = await supabase
            .from("operators")
            .select("id,user_id,company_name,name,email")
            .eq("user_id", user.id)
            .maybeSingle();

          if (opErr) console.warn("operators fallback error:", opErr);
          if (op) opRow = op as OperatorRow;
        }

        if (!opRow) {
          if (!isMounted) return;
          setErrorMsg("We couldn’t find your operator profile. Please contact support.");
          setLoading(false);
          return;
        }

        if (!isMounted) return;
        setOperator(opRow);

        // 2) booking details (must belong to operator)
        const { data: bookingRow, error: bErr } = await supabase
          .from("bookings")
          .select("id,trip_id,quote_id,operator_id,date_from,date_to,pax,total_amount,currency,status,payment_status,created_at")
          .eq("id", bookingId)
          .eq("operator_id", opRow.id)
          .maybeSingle();

        if (bErr) {
          console.error("load booking error:", bErr);
          if (!isMounted) return;
          setErrorMsg("Failed to load booking details (DB error).");
          setDebugError(bErr);
          setLoading(false);
          return;
        }

        if (!bookingRow) {
          if (!isMounted) return;
          setErrorMsg("Booking not found for this operator.");
          setLoading(false);
          return;
        }

        const row = bookingRow as BookingRow;

        if (!isMounted) return;

        setBooking(row);
        setStatus(row.status || "pending_payment");
        setPaymentStatus(row.payment_status || "unpaid");
        setLoading(false);
      } catch (err: any) {
        console.error("load booking exception:", err);
        if (!isMounted) return;
        setErrorMsg("Unexpected error while loading booking.");
        setDebugError(err);
        setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  /* ---------- Save changes ---------- */

  const handleSave = async () => {
    if (!bookingId || !operator) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setDebugError(null);

    try {
      const { data, error: uErr } = await supabase
        .from("bookings")
        .update({ status, payment_status: paymentStatus })
        .eq("id", bookingId)
        .eq("operator_id", operator.id)
        .select("id,trip_id,quote_id,operator_id,date_from,date_to,pax,total_amount,currency,status,payment_status,created_at")
        .single();

      if (uErr) {
        console.error("update booking error:", uErr);
        setErrorMsg("Failed to update booking.");
        setDebugError(uErr);
        return;
      }

      const updated = data as BookingRow;
      setBooking(updated);
      setStatus(updated.status || "pending_payment");
      setPaymentStatus(updated.payment_status || "unpaid");
      setSuccessMsg("Booking updated successfully.");
    } catch (err: any) {
      console.error("update booking exception:", err);
      setErrorMsg("Unexpected error while updating booking.");
      setDebugError(err);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Derived ---------- */

  const amountLabel =
    booking?.total_amount != null
      ? `${booking.currency || "USD"} ${Number(booking.total_amount).toLocaleString()}`
      : "Not set";

  const bookingRef = booking?.id ? booking.id.slice(0, 8).toUpperCase() : "-";

  const bookingChip = chipStyles("booking", booking?.status);
  const payChip = chipStyles("payment", booking?.payment_status);

  /* ---------- Render ---------- */

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 16px 64px" }}>
      {/* Heading */}
      <section style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#6B7280", marginBottom: 4 }}>
            Operator / Booking
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#14532D" }}>
            Booking {bookingRef}
          </h1>
          {booking?.created_at && (
            <p style={{ margin: 0, marginTop: 4, fontSize: 13, color: "#4B5563" }}>
              Created {formatDateTime(booking.created_at)}
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* If you have a specific enquiry/quote detail page later, update this link accordingly */}
          {booking?.quote_id ? (
            <Link
              href="/enquiries"
              style={{
                borderRadius: 999,
                padding: "7px 14px",
                border: "1px solid #BBF7D0",
                backgroundColor: "#ECFDF5",
                color: "#166534",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View related enquiry
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => router.push("/bookings")}
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
            Back to bookings
          </button>
        </div>
      </section>

      {errorMsg && (
        <div style={{ marginBottom: 16, borderRadius: 16, padding: "10px 12px", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", fontSize: 13, color: "#B91C1C" }}>
          {errorMsg}
        </div>
      )}

      {debugError && (
        <details style={{ marginBottom: 16, borderRadius: 16, padding: "10px 12px", backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", fontSize: 11, color: "#374151" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Debug info</summary>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {JSON.stringify(debugError, null, 2)}
          </pre>
        </details>
      )}

      <section style={{ borderRadius: 22, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF", padding: "16px 16px 14px", minHeight: 320 }}>
        {loading ? (
          <div style={{ fontSize: 13, color: "#6B7280" }}>Loading booking details…</div>
        ) : !booking ? (
          <div style={{ fontSize: 13, color: "#6B7280" }}>No booking data available.</div>
        ) : (
          <>
            {/* Summary row */}
            <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, color: "#111827", marginBottom: 4 }}>
                  Amount: <strong>{amountLabel}</strong>
                </div>

                <div style={{ fontSize: 12, color: "#4B5563" }}>
                  Trip ID: <span style={{ fontFamily: "monospace" }}>{booking.trip_id || "—"}</span>
                  {"  •  "}
                  Travellers: {booking.pax ?? "Not specified"}
                </div>

                <div style={{ fontSize: 12, color: "#4B5563", marginTop: 4 }}>
                  Travel dates:{" "}
                  {booking.date_from || booking.date_to
                    ? `${formatDateShort(booking.date_from)} – ${formatDateShort(booking.date_to)}`
                    : "Not set"}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: bookingChip.bg,
                    border: `1px solid ${bookingChip.bd}`,
                    color: bookingChip.fg,
                  }}
                >
                  {bookingStatusLabel(booking.status)}
                </span>

                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: payChip.bg,
                    border: `1px solid ${payChip.bd}`,
                    color: payChip.fg,
                  }}
                >
                  Payment: {paymentStatusLabel(booking.payment_status)}
                </span>
              </div>
            </div>

            {/* Form – status & payment_status */}
            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 12, marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
                Update booking status
              </div>

              {successMsg && (
                <div style={{ marginBottom: 8, borderRadius: 12, padding: "6px 9px", backgroundColor: "#ECFDF5", border: "1px solid #BBF7D0", fontSize: 12, color: "#166534" }}>
                  {successMsg}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
                    Booking status
                  </div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ width: "100%", borderRadius: 12, border: "1px solid #D1D5DB", padding: "7px 9px", fontSize: 13, outline: "none" }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
                    Payment status
                  </div>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    style={{ width: "100%", borderRadius: 12, border: "1px solid #D1D5DB", padding: "7px 9px", fontSize: 13, outline: "none" }}
                  >
                    {PAYMENT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  borderRadius: 999,
                  padding: "8px 18px",
                  border: "none",
                  backgroundColor: saving ? "#9CA3AF" : "#14532D",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>

              <p style={{ marginTop: 8, fontSize: 11, color: "#6B7280", lineHeight: 1.5 }}>
                Use this control to keep the booking and payment status in sync with your actual records.
                For example, when you receive a bank transfer, set payment status to <strong>Paid in full</strong>{" "}
                and booking status to <strong>Confirmed</strong>.
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
