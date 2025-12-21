"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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
};

type ReplyRow = {
  id: string;
  quote_id: string;
  sender_role: string | null;
  message: string | null;
  created_at: string | null;
};

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

const formatStatusLabel = (status?: string | null) => {
  const s = (status || "pending").toLowerCase();
  switch (s) {
    case "pending":
      return "Awaiting your reply";
    case "answered":
      return "In conversation";
    case "confirmed":
      return "Booking confirmed";
    case "archived":
    case "closed":
    case "closed_by_traveller":
      return "Closed by guest";
    case "cancelled":
      return "Cancelled";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

const isClosedStatus = (status?: string | null) => {
  const s = (status || "").toLowerCase();
  return (
    s === "closed_by_traveller" ||
    s === "closed" ||
    s === "archived" ||
    s === "cancelled"
  );
};

export default function OperatorQuoteChatPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params?.id as string | undefined;

  const [quote, setQuote] = useState<QuoteRow | null>(null);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!quoteId) return;
    let isMounted = true;

    const load = async () => {
      setLoadingQuote(true);
      setLoadingReplies(true);
      setErrorMsg(null);

      try {
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userResp?.user) {
          if (!isMounted) return;
          setErrorMsg("Please log in as a tour operator.");
          setLoadingQuote(false);
          setLoadingReplies(false);
          return;
        }

        const user = userResp.user;

        // resolve operator_id from logged-in user
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
          setErrorMsg("We couldn't find your operator profile.");
          setLoadingQuote(false);
          setLoadingReplies(false);
          return;
        }

        // load quote (ensure it belongs to this operator)
        const { data: quoteRows, error: quoteErr } = await supabase
          .from("operator_quotes")
          .select("*")
          .eq("id", quoteId)
          .eq("operator_id", operatorId)
          .limit(1);

        if (quoteErr) {
          console.error("operator chat quote error:", quoteErr);
          if (!isMounted) return;
          setErrorMsg("Could not load this enquiry.");
          setLoadingQuote(false);
          setLoadingReplies(false);
          return;
        }

        if (!quoteRows || quoteRows.length === 0) {
          if (!isMounted) return;
          setErrorMsg("Enquiry not found.");
          setLoadingQuote(false);
          setLoadingReplies(false);
          return;
        }

        const qRow = quoteRows[0] as QuoteRow;

        if (!isMounted) return;
        setQuote(qRow);
        setLoadingQuote(false);

        // load replies
        const { data: replyRows, error: replyErr } = await supabase
          .from("operator_quote_replies")
          .select("id, quote_id, sender_role, message, created_at")
          .eq("quote_id", quoteId)
          .order("created_at", { ascending: true });

        if (replyErr) {
          console.error("operator chat replies error:", replyErr);
          if (!isMounted) return;
          setReplies([]);
          setLoadingReplies(false);
          return;
        }

        if (!isMounted) return;
        setReplies((replyRows || []) as ReplyRow[]);
        setLoadingReplies(false);
      } catch (err: any) {
        console.error("operator chat exception:", err);
        if (isMounted) {
          setErrorMsg("Unexpected error while loading this conversation.");
          setLoadingQuote(false);
          setLoadingReplies(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [quoteId]);

  const closed = isClosedStatus(quote?.status);
  const statusLabel = formatStatusLabel(quote?.status);

  const handleSend = async () => {
    if (!quote || !quoteId) return;
    const text = newMessage.trim();
    if (!text) return;
    if (closed) {
      // safety: usitume kama tayari imefungwa
      return;
    }

    setSending(true);
    setErrorMsg(null);

    try {
      // insert reply
      const { data, error } = await supabase
        .from("operator_quote_replies")
        .insert({
          quote_id: quoteId,
          sender_role: "operator",
          message: text,
        })
        .select("*")
        .single();

      if (error) {
        console.error("operator send reply error:", error);
        setErrorMsg("Could not send reply. Please try again.");
        setSending(false);
        return;
      }

      if (data) {
        setReplies((prev) => [...prev, data as ReplyRow]);
        setNewMessage("");
      }

      // update status to answered ONLY if not closed/cancelled
      if (!isClosedStatus(quote.status) && quote.status !== "answered") {
        const { error: statusErr } = await supabase
          .from("operator_quotes")
          .update({ status: "answered" })
          .eq("id", quoteId)
          .neq("status", "closed_by_traveller")
          .neq("status", "closed")
          .neq("status", "archived")
          .neq("status", "cancelled");

        if (statusErr) {
          console.warn("operator update status error:", statusErr);
        } else {
          setQuote((prev) =>
            prev ? { ...prev, status: "answered" } : prev
          );
        }
      }
    } catch (err: any) {
      console.error("operator send reply exception:", err);
      setErrorMsg("Unexpected error while sending reply.");
    } finally {
      setSending(false);
    }
  };

  const disableInput = closed || loadingQuote || sending;

  return (
    <main
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "32px 16px 64px",
      }}
    >
      {/* Top bar: title + back */}
      <section
        style={{
          marginBottom: 20,
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
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#9CA3AF",
              marginBottom: 6,
            }}
          >
            Guest enquiry
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 900,
              color: "#14532D",
            }}
          >
            {quote?.guest_name || "Safari Connector traveller"}
          </h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link
            href="/quotes"
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
            Back to enquiries
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

      {/* Conversation + composer */}
      <section
        style={{
          borderRadius: 20,
          border: "1px solid #E5E7EB",
          backgroundColor: "#FFFFFF",
          padding: "16px 18px 20px",
        }}
      >
        {/* header info */}
        <div
          style={{
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                color: "#4B5563",
              }}
            >
              Enquiry received{" "}
              {quote?.created_at ? formatFullDate(quote.created_at) : "-"}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "#4B5563",
              }}
            >
              Travel dates:{" "}
              {quote?.travel_start_date && quote.travel_end_date
                ? `${formatDateShort(quote.travel_start_date)} – ${formatDateShort(
                    quote.travel_end_date
                  )}`
                : "Not specified"}
              {"  •  "}
              Group size:{" "}
              {quote?.group_size ? quote.group_size : "Not specified"}
            </div>
          </div>

          <div>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: closed ? "#FEE2E2" : "#FEF3C7",
                color: closed ? "#B91C1C" : "#92400E",
                border: closed
                  ? "1px solid #FCA5A5"
                  : "1px solid #FDE68A",
              }}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {/* conversation */}
        <div
          style={{
            marginTop: 4,
            borderRadius: 16,
            border: "1px solid #E5E7EB",
            backgroundColor: "#F9FAFB",
            padding: "10px 12px",
            minHeight: 140,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {loadingReplies ? (
            <div
              style={{
                fontSize: 13,
                color: "#6B7280",
              }}
            >
              Loading conversation…
            </div>
          ) : replies.length === 0 ? (
            <div
              style={{
                fontSize: 13,
                color: "#6B7280",
              }}
            >
              No messages yet.
            </div>
          ) : (
            replies.map((r) => {
              const isOperator =
                (r.sender_role || "operator").toLowerCase() === "operator";

              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: isOperator ? "flex-end" : "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      borderRadius: 12,
                      padding: 8,
                      fontSize: 13,
                      lineHeight: 1.5,
                      backgroundColor: isOperator ? "#DCFCE7" : "#FFFFFF",
                      border: isOperator
                        ? "1px solid #A7F3D0"
                        : "1px solid #E5E7EB",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#6B7280",
                        marginBottom: 2,
                      }}
                    >
                      {isOperator ? "You" : quote?.guest_name || "Traveller"}
                    </div>
                    <div>{r.message}</div>
                    {r.created_at && (
                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 10,
                          color: "#9CA3AF",
                          textAlign: "right",
                        }}
                      >
                        {formatDateShort(r.created_at)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* info if closed */}
        {closed && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#B91C1C",
            }}
          >
            This conversation has been closed by the traveller. You can still
            read previous messages but cannot send new replies.
          </div>
        )}

        {/* composer */}
        <div
          style={{
            marginTop: 14,
            borderTop: "1px solid #E5E7EB",
            paddingTop: 10,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              color: "#111827",
            }}
          >
            Your reply
          </div>
          <textarea
            value={newMessage}
            disabled={disableInput}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              closed
                ? "Conversation closed by traveller."
                : "Write your reply to the traveller here…"
            }
            style={{
              width: "100%",
              minHeight: 80,
              borderRadius: 14,
              border: "1px solid #D1D5DB",
              padding: "8px 10px",
              fontSize: 13,
              resize: "vertical",
              outline: "none",
              backgroundColor: disableInput ? "#F9FAFB" : "#FFFFFF",
            }}
          />
          <div
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <button
              type="button"
              onClick={handleSend}
              disabled={
                disableInput || newMessage.trim().length === 0
              }
              style={{
                borderRadius: 999,
                padding: "8px 18px",
                backgroundColor:
                  disableInput || newMessage.trim().length === 0
                    ? "#9CA3AF"
                    : "#14532D",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                cursor:
                  disableInput || newMessage.trim().length === 0
                    ? "default"
                    : "pointer",
              }}
            >
              {closed
                ? "Conversation closed"
                : sending
                ? "Sending…"
                : "Send reply"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
