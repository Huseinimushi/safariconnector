"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ---------- Types ---------- */

type QuoteRow = {
  id: string;
  operator_id: string;
  email: string | null;
  guest_name?: string | null;
  travel_start_date?: string | null;
  travel_end_date?: string | null;
  group_size?: number | null;
  status?: string | null;
  created_at: string | null;
  message?: string | null;
  [key: string]: any;
};

type ReplyRow = {
  id: string;
  quote_id: string;
  sender_role: string | null; // "operator" / "traveller"
  message: string | null;
  created_at: string | null;
};

type QuoteWithFlags = QuoteRow & {
  hasUnread: boolean;
  lastMessageAt: string | null;
  lastFrom: "operator" | "traveller" | null;
};

/* ---------- LocalStorage helpers (same key as dashboard) ---------- */

const OPERATOR_UNREAD_KEY = "sc_unread_operator";

const getUnreadMap = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OPERATOR_UNREAD_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
};

const setUnreadMap = (map: Record<string, number>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OPERATOR_UNREAD_KEY, JSON.stringify(map));
  } catch {
    //
  }
};

const markQuoteSeen = (quoteId: string) => {
  if (!quoteId) return;
  const map = getUnreadMap();
  map[quoteId] = Date.now();
  setUnreadMap(map);
};

/* ---------- Helpers ---------- */

const formatDateShort = (value: string | null | undefined) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatFullDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const formatStatus = (status?: string | null) => {
  const s = status || "pending";
  switch (s) {
    case "closed":
      return "Closed";
    case "answered":
      return "On process";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

/* ---------- Wrapper component with Suspense ---------- */

export default function OperatorQuotesPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "32px 16px 64px",
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: "#6B7280",
            }}
          >
            Loading enquiries…
          </p>
        </main>
      }
    >
      <OperatorQuotesPageInner />
    </Suspense>
  );
}

/* ---------- Main page (uses hooks) ---------- */

function OperatorQuotesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuoteIdFromURL = searchParams.get("quote_id");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(
    initialQuoteIdFromURL
  );

  // combine quotes + replies → add unread + last message flags
  const quotesWithFlags: QuoteWithFlags[] = useMemo(() => {
    const unreadMap = getUnreadMap();

    // find last reply per quote
    const latestByQuote: Record<string, ReplyRow> = {};
    replies.forEach((r) => {
      const key = r.quote_id;
      const prev = latestByQuote[key];
      if (!prev) {
        latestByQuote[key] = r;
        return;
      }
      const prevDate = prev.created_at
        ? new Date(prev.created_at).getTime()
        : 0;
      const currDate = r.created_at
        ? new Date(r.created_at).getTime()
        : 0;
      if (currDate > prevDate) {
        latestByQuote[key] = r;
      }
    });

    return quotes.map((q) => {
      const last = latestByQuote[q.id];
      let hasUnread = false;
      let lastMessageAt: string | null = null;
      let lastFrom: "operator" | "traveller" | null = null;

      if (last) {
        lastMessageAt = last.created_at;
        const rawRole = (last.sender_role || "traveller").toLowerCase();
        lastFrom = rawRole === "operator" ? "operator" : "traveller";

        // unread for operator only kama last message imetoka kwa traveller
        if (lastFrom === "traveller") {
          const lastTime = lastMessageAt
            ? new Date(lastMessageAt).getTime()
            : 0;
          const seenTime = unreadMap[q.id] || 0;
          hasUnread = lastTime > seenTime;
        }
      }

      return {
        ...q,
        hasUnread,
        lastMessageAt,
        lastFrom,
      };
    });
  }, [quotes, replies]);

  const selectedQuote: QuoteWithFlags | undefined = useMemo(
    () => quotesWithFlags.find((q) => q.id === selectedQuoteId),
    [quotesWithFlags, selectedQuoteId]
  );

  /* ---------- Load data ---------- */

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1) ensure operator logged in
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userResp?.user) {
          console.error("operator quotes auth error:", userErr);
          if (!isMounted) return;
          setErrorMsg("Please log in as a tour operator.");
          setLoading(false);
          return;
        }

        const user = userResp.user;

        // 2) find operator_id from operators / operators_view
        let operatorId: string | null = null;

        const { data: opViewRows } = await supabase
          .from("operators_view")
          .select("id, user_id")
          .eq("user_id", user.id)
          .limit(1);

        if (opViewRows && opViewRows.length > 0) {
          operatorId = opViewRows[0].id as string;
        } else {
          const { data: opRows } = await supabase
            .from("operators")
            .select("id, user_id")
            .eq("user_id", user.id)
            .limit(1);
          if (opRows && opRows.length > 0) {
            operatorId = opRows[0].id as string;
          }
        }

        if (!operatorId) {
          if (!isMounted) return;
          setErrorMsg(
            "We couldn't find your operator profile. Please contact support."
          );
          setLoading(false);
          return;
        }

        // 3) load quotes for this operator
        const { data: quoteRows, error: quoteErr } = await supabase
          .from("operator_quotes")
          .select("*")
          .eq("operator_id", operatorId)
          .order("created_at", { ascending: false });

        if (quoteErr) {
          console.error("operator quotes load error:", quoteErr);
          if (!isMounted) {
            return;
          }
          setErrorMsg("Could not load your enquiries.");
          setQuotes([]);
          setReplies([]);
          setLoading(false);
          return;
        }

        const qRows = (quoteRows || []) as QuoteRow[];

        // 4) load all replies for these quotes
        let rRows: ReplyRow[] = [];
        if (qRows.length > 0) {
          const ids = qRows.map((q) => q.id);
          const { data: repliesRows, error: repliesErr } = await supabase
            .from("operator_quote_replies")
            .select("id, quote_id, sender_role, message, created_at")
            .in("quote_id", ids);

          if (repliesErr) {
            console.warn("operator quotes replies error:", repliesErr);
          } else {
            rRows = (repliesRows || []) as ReplyRow[];
          }
        }

        if (!isMounted) return;
        setQuotes(qRows);
        setReplies(rRows);

        // 5) auto-select
        const fromURL = initialQuoteIdFromURL;
        const existsInList = fromURL && qRows.some((q) => q.id === fromURL);

        const firstId = qRows[0]?.id ?? null;
        const finalSelectedId = existsInList ? (fromURL as string) : firstId;

        setSelectedQuoteId(finalSelectedId);

        // kama ilikuja kutoka dashboard popup, mark as seen immediately
        if (existsInList && fromURL) {
          markQuoteSeen(fromURL);
        }
      } catch (err: any) {
        console.error("operator quotes exception:", err);
        if (isMounted) {
          setErrorMsg("Unexpected error while loading enquiries.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  /* ---------- UI helpers ---------- */

  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    markQuoteSeen(quoteId);

    // update URL to have ?quote_id=...
    const params = new URLSearchParams(window.location.search);
    params.set("quote_id", quoteId);
    const newUrl = `/operators/quotes?${params.toString()}`;
    router.replace(newUrl);
  };

  /* ---------- Render ---------- */

  return (
    <main
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "32px 16px 64px",
      }}
    >
      {/* Top heading + Back to dashboard */}
      <section
        style={{
          marginBottom: 18,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
              color: "#14532D",
            }}
          >
            Safari enquiries
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            All quote requests and direct messages from travellers appear here.
            Reply quickly to increase your chance of converting to bookings.
          </p>
        </div>

        <div>
          <Link
            href="/operators/dashboard"
            style={{
              borderRadius: 999,
              padding: "7px 14px",
              border: "1px solid #D1D5DB",
              backgroundColor: "#FFFFFF",
              color: "#374151",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Back to dashboard
          </Link>
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

      {/* Table of enquiries */}
      <section
        style={{
          borderRadius: 20,
          border: "1px solid #E5E7EB",
          backgroundColor: "#FFFFFF",
          padding: "14px 16px 18px",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 3.2fr) minmax(0, 2.2fr) 0.9fr 1.3fr 1.2fr 1.6fr",
            padding: "8px 10px",
            borderBottom: "1px solid #E5E7EB",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#6B7280",
          }}
        >
          <span>Guest</span>
          <span>Travel dates</span>
          <span>Group</span>
          <span>Status</span>
          <span>Received</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>

        {/* Table body */}
        <div>
          {loading ? (
            <div
              style={{
                padding: 20,
                fontSize: 13,
                color: "#6B7280",
              }}
            >
              Loading enquiries…
            </div>
          ) : quotesWithFlags.length === 0 ? (
            <div
              style={{
                padding: 20,
                fontSize: 13,
                color: "#4B5563",
              }}
            >
              You don&apos;t have any enquiries yet. When travellers send quote
              requests, they will appear here.
            </div>
          ) : (
            quotesWithFlags.map((q) => {
              const isSelected = selectedQuoteId === q.id;

              const datesLabel =
                q.travel_start_date && q.travel_end_date
                  ? `${formatDateShort(q.travel_start_date)} to ${formatDateShort(
                      q.travel_end_date
                    )}`
                  : "-";

              const groupLabel =
                q.group_size && q.group_size > 0
                  ? q.group_size.toString()
                  : "-";

              const statusLabel = formatStatus(q.status);

              let statusBg = "#FEF3C7";
              let statusColor = "#92400E";
              let statusBorder = "1px solid #FDE68A";

              if ((q.status || "pending") === "answered") {
                statusBg = "#ECFDF5";
                statusColor = "#166534";
                statusBorder = "1px solid #BBF7D0";
              } else if (q.status === "closed") {
                statusBg = "#E5E7EB";
                statusColor = "#374151";
                statusBorder = "1px solid #D1D5DB";
              }

              return (
                <div
                  key={q.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0, 3.2fr) minmax(0, 2.2fr) 0.9fr 1.3fr 1.2fr 1.6fr",
                    padding: "10px 10px",
                    borderBottom: "1px solid #F3F4F6",
                    backgroundColor: isSelected ? "#ECFDF3" : "#FFFFFF",
                    cursor: "pointer",
                  }}
                  onClick={() => handleSelectQuote(q.id)}
                >
                  {/* Guest */}
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#111827",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {q.guest_name || "Safari Connector traveller"}
                      {q.hasUnread && q.status !== "closed" && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 999,
                            backgroundColor: "#F97316",
                            color: "#FFFFFF",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          New
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                      }}
                    >
                      {q.email}
                    </div>
                  </div>

                  {/* Travel dates */}
                  <div
                    style={{
                      fontSize: 12,
                      color: "#111827",
                    }}
                  >
                    {datesLabel}
                  </div>

                  {/* Group */}
                  <div
                    style={{
                      fontSize: 12,
                      color: "#111827",
                    }}
                  >
                    {groupLabel}
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "2px 8px",
                        borderRadius: 999,
                        backgroundColor: statusBg,
                        color: statusColor,
                        border: statusBorder,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {/* Received */}
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                    }}
                  >
                    {formatDateShort(q.created_at)}
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 6,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectQuote(q.id);
                      }}
                      style={{
                        borderRadius: 999,
                        border: "1px solid #D1D5DB",
                        backgroundColor: "#FFFFFF",
                        padding: "4px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      View
                    </button>
                    <Link
                      href={`/operators/quotes/${encodeURIComponent(q.id)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        markQuoteSeen(q.id);
                      }}
                      style={{
                        borderRadius: 999,
                        backgroundColor:
                          q.status === "closed" ? "#9CA3AF" : "#14532D",
                        padding: "4px 12px",
                        fontSize: 12,
                        color: "#FFFFFF",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: q.status === "closed" ? 0.7 : 1,
                        pointerEvents: q.status === "closed" ? "none" : "auto",
                      }}
                    >
                      {q.status === "closed" ? "Chat closed" : "Reply"}
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Selected quote preview */}
      {selectedQuote && (
        <section
          style={{
            marginTop: 20,
            borderRadius: 20,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            padding: "16px 18px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 6,
            }}
          >
            {selectedQuote.guest_name || "Safari Connector traveller"}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#4B5563",
              marginBottom: 10,
            }}
          >
            Enquiry received {formatFullDate(selectedQuote.created_at)} – status{" "}
            {formatStatus(selectedQuote.status)}.
          </p>

          <div
            style={{
              fontSize: 13,
              color: "#111827",
            }}
          >
            <div style={{ marginBottom: 4 }}>
              <strong>Travel dates:</strong>{" "}
              {selectedQuote.travel_start_date &&
              selectedQuote.travel_end_date
                ? `${formatDateShort(
                    selectedQuote.travel_start_date
                  )} – ${formatDateShort(selectedQuote.travel_end_date)}`
                : "Not specified"}
            </div>
            <div style={{ marginBottom: 4 }}>
              <strong>Group size:</strong>{" "}
              {selectedQuote.group_size || "Not specified"}
            </div>
            <div style={{ marginBottom: 4 }}>
              <strong>Email:</strong> {selectedQuote.email}
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              borderRadius: 14,
              border: "1px solid #E5E7EB",
              backgroundColor: "#F9FAFB",
              padding: "10px 12px",
              fontSize: 13,
              color: "#111827",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#6B7280",
                marginBottom: 4,
              }}
            >
              Original message
            </div>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
              }}
            >
              {selectedQuote.message || "No message text was provided."}
            </pre>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Link
              href={`/operators/quotes/${encodeURIComponent(selectedQuote.id)}`}
              onClick={() => markQuoteSeen(selectedQuote.id)}
              style={{
                borderRadius: 999,
                backgroundColor:
                  selectedQuote.status === "closed" ? "#9CA3AF" : "#14532D",
                padding: "8px 16px",
                fontSize: 13,
                color: "#FFFFFF",
                textDecoration: "none",
                fontWeight: 600,
                pointerEvents:
                  selectedQuote.status === "closed" ? "none" : "auto",
                opacity: selectedQuote.status === "closed" ? 0.7 : 1,
              }}
            >
              {selectedQuote.status === "closed"
                ? "Chat closed"
                : "Open full chat & reply →"}
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
