// src/app/operators/(panel)/enquiries/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabaseBrowser } from "@/lib/supabaseClient";

type OperatorRow = {
  id: string;
  name: string | null;
};

type QuoteRequestRow = {
  id: string;
  trip_id: string;
  trip_title: string | null;
  date: string | null;
  pax: number | null;
  name: string;
  email: string;
  phone: string | null;
  note: string | null;
  created_at: string | null;
};

async function safeReadJson(res: Response): Promise<{ ok: boolean; data: any; errorText?: string }> {
  const ct = (res.headers.get("content-type") || "").toLowerCase();

  // Attempt JSON only if server says it's JSON
  if (ct.includes("application/json")) {
    const data = await res.json().catch(() => null);
    return { ok: res.ok, data };
  }

  // Otherwise read as text (HTML/redirect page/etc)
  const text = await res.text().catch(() => "");
  const snippet = text.slice(0, 240).replace(/\s+/g, " ").trim();

  return {
    ok: false,
    data: null,
    errorText: `Non-JSON response (${res.status}). Snippet: ${snippet || "(empty)"}`,
  };
}

export default function OperatorEnquiriesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [requests, setRequests] = useState<QuoteRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!user) {
        if (alive) {
          setLoading(false);
          setOperator(null);
          setRequests([]);
          setError("Please sign in as an operator to view your enquiries.");
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1) Load operator profile
        const { data: opData, error: opErr } = await supabaseBrowser
          .from("operators")
          .select("id, name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (opErr) {
          if (!alive) return;
          console.error("load operator error:", opErr);
          setError(opErr.message || "Failed to load operator profile.");
          setLoading(false);
          return;
        }

        if (!opData?.id) {
          if (!alive) return;
          setError("No operator profile found for this account. Please complete your operator onboarding.");
          setLoading(false);
          return;
        }

        if (!alive) return;
        setOperator(opData as OperatorRow);

        // 2) Fetch enquiries by operator
        const url = `/api/quote-requests/by-operator?operator_id=${encodeURIComponent(opData.id)}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            // force JSON expectation on server side (helps debugging)
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const parsed = await safeReadJson(res);

        if (!alive) return;

        if (!parsed.ok) {
          const msg =
            parsed?.data?.error ||
            parsed?.errorText ||
            `Failed to load enquiries (HTTP ${res.status}).`;

          console.error("fetch enquiries error:", { status: res.status, body: parsed?.data, msg });
          setRequests([]);
          setError(msg);
          setLoading(false);
          return;
        }

        setRequests((parsed.data?.requests || []) as QuoteRequestRow[]);
      } catch (e: any) {
        console.error("Unexpected error loading operator enquiries:", e);
        if (alive) setError(e?.message || "Unexpected error.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [user]);

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
  };

  if (!user) {
    return (
      <main style={wrap}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Traveller Enquiries</h1>
        <p>Please sign in as an operator to view your enquiries.</p>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <div style={headingRow}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            Traveller Enquiries{operator?.name ? ` – ${operator.name}` : ""}
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 520 }}>
            All quote requests sent from your published trips. Respond quickly and turn conversations into confirmed bookings.
          </p>
        </div>

        <a href="/dashboard" style={backBtn}>
          ← Back to dashboard
        </a>
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
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{r.trip_title || "Untitled trip"}</div>

              <div style={metaRow}>
                <div>
                  <span>{r.date ? new Date(r.date).toLocaleDateString() : "Flexible date"}</span>
                  {" • "}
                  <span>{r.pax ?? 1} traveller(s)</span>
                </div>
                {r.created_at && (
                  <span>
                    Received:{" "}
                    {new Date(r.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                )}
              </div>

              <div style={{ marginTop: 6, fontSize: 13, color: "#374151" }}>
                From: <span style={{ fontWeight: 600 }}>{r.name}</span> {" • "}
                <span>{r.email}</span>
                {r.phone && <span> • {r.phone}</span>}
              </div>

              {r.note && (
                <p style={{ marginTop: 8, fontSize: 13, color: "#111827", whiteSpace: "pre-line" }}>{r.note}</p>
              )}

              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span style={{ color: "#6b7280" }}>
                  Start a quote to chat with this traveller and move towards a confirmed booking.
                </span>

                <Link
                  href={`/quotes?from_enquiry=${encodeURIComponent(r.id)}`}
                  style={{ textDecoration: "none", fontWeight: 600, color: "#14532d", whiteSpace: "nowrap" }}
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
