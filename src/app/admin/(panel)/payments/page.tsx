// src/app/payments/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type BookingRow = {
  id: string;
  status: string | null;
  payment_status: string | null;
  created_at: string | null;

  total_amount: number | null;
  currency: string | null;

  traveller_id: string | null;
  operator_id: string | null;
  quote_id: string | null;
};

type Tab = "needs" | "verified";

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<Tab>("needs");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const formatDateTime = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      // Basic guard: ensure there is a session at all
      const sessionRes = await supabase.auth.getSession();
      if (!sessionRes.data.session) {
        setRows([]);
        setError("Not authenticated. Please log in as admin.");
        setLoading(false);
        return;
      }

      // Read bookings directly from Supabase.
      // "Needs" = payment_submitted, "Verified" = payment_verified.
      let query = supabase
        .from("bookings")
        .select(
          "id, status, payment_status, created_at, total_amount, currency, traveller_id, operator_id, quote_id"
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (tab === "needs") {
        query = query.eq("status", "payment_submitted");
      } else {
        query = query.eq("status", "payment_verified");
      }

      const { data, error: qErr } = await query;

      if (qErr) {
        console.error("admin payments list error (direct):", qErr);
        setRows([]);
        setError(qErr.message || "Failed to load payments.");
        return;
      }

      setRows((data || []) as BookingRow[]);
    } catch (e: any) {
      console.error("admin payments list exception (direct):", e);
      setRows([]);
      setError(e?.message || "Unexpected error loading payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const needsCount = useMemo(
    () =>
      rows.filter(
        (r) => (r.status || "").toLowerCase() === "payment_submitted"
      ).length,
    [rows]
  );

  const handleVerify = async (bookingId: string) => {
    if (!bookingId) return;

    setVerifyingId(bookingId);
    setError(null);

    try {
      const sessionRes = await supabase.auth.getSession();
      if (!sessionRes.data.session) {
        setError("Session expired. Please log in again.");
        setVerifyingId(null);
        return;
      }

      // Mark booking + related payments as verified directly in Supabase.
      const { error: bErr } = await supabase
        .from("bookings")
        .update({
          status: "payment_verified",
          payment_status: "verified",
        })
        .eq("id", bookingId);

      if (bErr) {
        console.error("admin verify booking error:", bErr);
        setError(bErr.message || "Failed to verify booking payment.");
        setVerifyingId(null);
        return;
      }

      // Optional: update payments table if such relation exists
      const { error: pErr } = await supabase
        .from("payments")
        .update({ status: "verified" })
        .eq("booking_id", bookingId);

      if (pErr) {
        console.error("admin verify payments error:", pErr);
        // still show an error but booking itself is already verified
        setError(
          pErr.message || "Booking verified, but updating payment record failed."
        );
      }

      // Refresh list
      await load();
    } catch (e: any) {
      console.error("admin verify exception:", e);
      setError(e?.message || "Unexpected error verifying payment.");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <main
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "32px 16px 64px",
      }}
    >
      {/* HEADER */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
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
            Safari Connector Admin
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 34,
              fontWeight: 900,
              color: "#0F172A",
            }}
          >
            Payment verification
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 6,
              fontSize: 14,
              color: "#475569",
            }}
          >
            Verify traveller proof submissions. Once verified, operator can
            confirm the booking.
          </p>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setTab("needs")}
              style={{
                borderRadius: 999,
                padding: "8px 14px",
                border:
                  tab === "needs"
                    ? "2px solid #0F766E"
                    : "1px solid #CBD5E1",
                backgroundColor:
                  tab === "needs" ? "#ECFEFF" : "#FFFFFF",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Needs verification
              {needsCount > 0 ? ` (${needsCount})` : ""}
            </button>

            <button
              type="button"
              onClick={() => setTab("verified")}
              style={{
                borderRadius: 999,
                padding: "8px 14px",
                border:
                  tab === "verified"
                    ? "2px solid #0F766E"
                    : "1px solid #CBD5E1",
                backgroundColor:
                  tab === "verified" ? "#ECFEFF" : "#FFFFFF",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Verified
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <Link
            href="/"
            style={{
              borderRadius: 999,
              padding: "9px 14px",
              border: "1px solid #CBD5E1",
              backgroundColor: "#FFFFFF",
              textDecoration: "none",
              color: "#0F172A",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            Back to admin
          </Link>

          <button
            type="button"
            onClick={load}
            style={{
              borderRadius: 999,
              padding: "9px 14px",
              border: "none",
              backgroundColor: "#0F766E",
              color: "#FFFFFF",
              fontWeight: 900,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      </section>

      {/* ERROR BANNER */}
      {error && (
        <div
          style={{
            marginTop: 14,
            borderRadius: 14,
            padding: 12,
            border: "1px solid #FCA5A5",
            background: "#FEF2F2",
            color: "#B91C1C",
          }}
        >
          {error}
        </div>
      )}

      {/* LIST */}
      <section
        style={{
          marginTop: 18,
          borderRadius: 18,
          border: "1px solid #E2E8F0",
          background: "#FFFFFF",
          padding: 14,
        }}
      >
        {loading ? (
          <div style={{ padding: 10, color: "#64748B" }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 10, color: "#64748B" }}>
            No items in this view.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((r) => {
              const ref = r.id.slice(0, 8).toUpperCase();
              const amount =
                r.total_amount != null
                  ? `${r.currency || "USD"} ${r.total_amount}`
                  : `${r.currency || "USD"} -`;
              const canVerify =
                (r.status || "").toLowerCase() === "payment_submitted";

              return (
                <div
                  key={r.id}
                  style={{
                    borderRadius: 16,
                    border: "1px solid #E2E8F0",
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 900,
                          color: "#0F172A",
                        }}
                      >
                        Booking {ref}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: "#475569",
                        }}
                      >
                        Created: {formatDateTime(r.created_at)}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: "#475569",
                        }}
                      >
                        Amount: {amount}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: "#475569",
                        }}
                      >
                        Status: <strong>{r.status}</strong> | Payment:{" "}
                        <strong>{r.payment_status}</strong>
                      </div>
                    </div>

                    {tab === "needs" && (
                      <button
                        type="button"
                        onClick={() => handleVerify(r.id)}
                        disabled={!canVerify || verifyingId === r.id}
                        style={{
                          borderRadius: 999,
                          padding: "8px 14px",
                          border: "none",
                          backgroundColor: !canVerify
                            ? "#94A3B8"
                            : "#14532D",
                          color: "#FFFFFF",
                          fontWeight: 900,
                          cursor: !canVerify ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {verifyingId === r.id
                          ? "Verifying..."
                          : "Mark verified"}
                      </button>
                    )}
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
