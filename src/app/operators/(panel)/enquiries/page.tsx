"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type OperatorRow = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  company_name?: string | null;
};

type QuoteRequestRow = {
  id: number;
  operator_id: string | null;
  trip_id: string | null;
  trip_title: string | null;
  date: string | null;
  pax: number | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  created_at: string | null;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const formatDateShort = (value: string | null) => {
  if (!value) return "Flexible date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

export default function OperatorEnquiriesPage() {
  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [requests, setRequests] = useState<QuoteRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Auth
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) console.warn("enquiries getUser error:", userErr);

        const user = userRes?.user;
        if (!user) {
          if (!alive) return;
          setAuthed(false);
          setOperator(null);
          setRequests([]);
          setLoading(false);
          return;
        }

        setAuthed(true);

        // 2) Operator profile (operators_view → operators fallback)
        let opRow: OperatorRow | null = null;

        const { data: opView, error: opViewErr } = await supabase
          .from("operators_view")
          .select("id,user_id,name,company_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (opViewErr) console.warn("operators_view enquiries error:", opViewErr);
        if (opView) opRow = opView as OperatorRow;

        if (!opRow) {
          const { data: op, error: opErr } = await supabase
            .from("operators")
            .select("id,user_id,name,company_name")
            .eq("user_id", user.id)
            .maybeSingle();

          if (opErr) console.warn("operators fallback enquiries error:", opErr);
          if (op) opRow = op as OperatorRow;
        }

        if (!opRow?.id) {
          if (!alive) return;
          setOperator(null);
          setRequests([]);
          setError("No operator profile found for this account. Please complete operator onboarding.");
          setLoading(false);
          return;
        }

        if (!alive) return;
        setOperator(opRow);

        // 3) Load enquiries directly from quote_requests (NO fetch to /api)
        const { data: qRows, error: qErr } = await supabase
          .from("quote_requests")
          .select("id,operator_id,trip_id,trip_title,date,pax,name,email,phone,note,created_at")
          .eq("operator_id", opRow.id)
          .order("created_at", { ascending: false });

        if (qErr) {
          console.error("load quote_requests error:", qErr);
          if (!alive) return;
          setRequests([]);
          setError(qErr.message || "Failed to load enquiries.");
          setLoading(false);
          return;
        }

        if (!alive) return;
        setRequests((qRows || []) as QuoteRequestRow[]);
      } catch (e: any) {
        console.error("Unexpected error loading operator enquiries:", e);
        if (alive) setError(e?.message || "Unexpected error.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  const operatorLabel =
    (operator?.company_name as string) || (operator?.name as string) || "";

  // --- Styles (match your existing design) ---
  const wrap: React.CSSProperties = {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 16px 40px",
  };

  const headingRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 16,
  };

  const backBtn: React.CSSProperties = {
    borderRadius: 999,
    border: "1px solid #d1e0da",
    padding: "6px 14px",
    fontSize: 13,
    background: "#f4f7f5",
    color: "#14532d",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };

  const card: React.CSSProperties = {
    borderRadius: 14,
    border: "1px solid #e3ebe7",
    padding: "14px 16px",
    background: "#fff",
    boxShadow: "0 1px 6px rgba(15, 23, 42, 0.04)",
  };

  const metaRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 12,
    color: "#6b7280",
    flexWrap: "wrap",
  };

  if (!authed) {
    return (
      <main style={wrap}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          Traveller Enquiries
        </h1>
        <p style={{ color: "#6b7280" }}>
          Please sign in as an operator to view your enquiries.
        </p>
        <div style={{ marginTop: 14 }}>
          <Link href="/login" style={{ ...backBtn, display: "inline-block" }}>
            Go to login →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={wrap}>
      {/* Header + back button */}
      <div style={headingRow}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            Traveller Enquiries{operatorLabel ? ` – ${operatorLabel}` : ""}
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 520 }}>
            All quote requests sent from your published trips. Respond quickly and turn
            conversations into confirmed bookings.
          </p>
        </div>

        <Link href="/dashboard" style={backBtn}>
          ← Back to dashboard
        </Link>
      </div>

      {loading && <p style={{ fontSize: 14, color: "#6b7280" }}>Loading enquiries…</p>}

      {!loading && error && (
        <div
          style={{
            ...card,
            borderColor: "#fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <p style={{ fontSize: 14, color: "#6b7280", marginTop: 12 }}>
          No enquiries yet. Once travellers send quote requests from your trips, they will appear here.
        </p>
      )}

      {!loading && !error && requests.length > 0 && (
        <section style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {requests.map((r) => (
            <article key={r.id} style={card}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                {r.trip_title || "Untitled trip"}
              </div>

              <div style={metaRow}>
                <div>
                  <span>{formatDateShort(r.date)}</span>
                  {" • "}
                  <span>{r.pax ?? "Not specified"} traveller(s)</span>
                </div>

                <span>Received: {formatDateTime(r.created_at)}</span>
              </div>

              <div style={{ marginTop: 6, fontSize: 13, color: "#374151" }}>
                From: <span style={{ fontWeight: 600 }}>{r.name || "Traveller"}</span>
                {" • "}
                <span>{r.email || "-"}</span>
                {r.phone ? <span>{" • "}{r.phone}</span> : null}
              </div>

              {r.note && (
                <p style={{ marginTop: 8, fontSize: 13, color: "#111827", whiteSpace: "pre-line" }}>
                  {r.note}
                </p>
              )}

              {/* CTA: open AI quotes/chat page */}
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#6b7280" }}>
                  Open the chat to reply, send a quote, and move towards a confirmed booking.
                </span>

                <Link
                  href={`/quotes?enquiry_id=${encodeURIComponent(String(r.id))}`}
                  style={{
                    textDecoration: "none",
                    fontWeight: 600,
                    color: "#14532d",
                    whiteSpace: "nowrap",
                  }}
                >
                  Open quote &amp; chat →
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
