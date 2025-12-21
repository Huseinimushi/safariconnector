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

async function safeReadResponse(res: Response): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  contentType: string | null;
  json: any | null;
  text: string | null;
}> {
  const contentType = res.headers.get("content-type");
  const status = res.status;
  const statusText = res.statusText;

  if (contentType && contentType.toLowerCase().includes("application/json")) {
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status, statusText, contentType, json, text: null };
  }

  const text = await res.text().catch(() => null);
  let json: any | null = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  return { ok: res.ok, status, statusText, contentType, json, text };
}

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<Tab>("needs");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const getAccessToken = async (): Promise<string | null> => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || null;
  };

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Not authenticated. Please log in as admin.");
        setRows([]);
        return;
      }

      const res = await fetch(`/api/admin/payments/list?view=${tab}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const parsed = await safeReadResponse(res);
      const json = parsed.json;

      if (!parsed.ok || !json?.ok) {
        console.error("admin payments list error:", {
          status: parsed.status,
          statusText: parsed.statusText,
          json,
          text: parsed.text,
        });
        setRows([]);
        setError(json?.error || `Failed to load payments (${parsed.status}).`);
        return;
      }

      setRows((json.items || []) as BookingRow[]);
    } catch (e) {
      console.error("admin payments list exception:", e);
      setRows([]);
      setError("Unexpected error loading payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const needsCount = useMemo(
    () => rows.filter((r) => (r.status || "").toLowerCase() === "payment_submitted").length,
    [rows]
  );

  const formatDateTime = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  };

  const handleVerify = async (bookingId: string) => {
    if (!bookingId) return;

    setVerifyingId(bookingId);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Session expired. Please log in again.");
        return;
      }

      const res = await fetch("/api/admin/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });

      const parsed = await safeReadResponse(res);
      const json = parsed.json;

      if (!parsed.ok || !json?.ok) {
        console.error("admin verify error:", {
          status: parsed.status,
          statusText: parsed.statusText,
          json,
          text: parsed.text,
        });
        setError(json?.error || `Failed to verify (${parsed.status}).`);
        return;
      }

      // refresh list
      await load();
    } catch (e) {
      console.error("admin verify exception:", e);
      setError("Unexpected error verifying payment.");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 16px 64px" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 }}>
            Safari Connector Admin
          </div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900, color: "#0F172A" }}>Payment verification</h1>
          <p style={{ margin: 0, marginTop: 6, fontSize: 14, color: "#475569" }}>
            Verify traveller proof submissions. Once verified, operator can confirm the booking.
          </p>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setTab("needs")}
              style={{
                borderRadius: 999,
                padding: "8px 14px",
                border: tab === "needs" ? "2px solid #0F766E" : "1px solid #CBD5E1",
                backgroundColor: tab === "needs" ? "#ECFEFF" : "#FFFFFF",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Needs verification
            </button>

            <button
              type="button"
              onClick={() => setTab("verified")}
              style={{
                borderRadius: 999,
                padding: "8px 14px",
                border: tab === "verified" ? "2px solid #0F766E" : "1px solid #CBD5E1",
                backgroundColor: tab === "verified" ? "#ECFEFF" : "#FFFFFF",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Verified
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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

      {error && (
        <div style={{ marginTop: 14, borderRadius: 14, padding: 12, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      <section style={{ marginTop: 18, borderRadius: 18, border: "1px solid #E2E8F0", background: "#FFFFFF", padding: 14 }}>
        {loading ? (
          <div style={{ padding: 10, color: "#64748B" }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 10, color: "#64748B" }}>No items in this view.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((r) => {
              const ref = r.id.slice(0, 8).toUpperCase();
              const amount = `${r.currency || "USD"} ${r.total_amount ?? "-"}`;
              const canVerify = (r.status || "").toLowerCase() === "payment_submitted";

              return (
                <div key={r.id} style={{ borderRadius: 16, border: "1px solid #E2E8F0", padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 900, color: "#0F172A" }}>Booking {ref}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#475569" }}>Created: {formatDateTime(r.created_at)}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#475569" }}>Amount: {amount}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#475569" }}>
                        Status: <strong>{r.status}</strong> | Payment: <strong>{r.payment_status}</strong>
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
                          backgroundColor: !canVerify ? "#94A3B8" : "#14532D",
                          color: "#FFFFFF",
                          fontWeight: 900,
                          cursor: !canVerify ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {verifyingId === r.id ? "Verifying..." : "Mark verified"}
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
