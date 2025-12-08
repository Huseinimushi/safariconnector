// src/app/operators/quotes/page.tsx
"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabaseBrowser } from "@/lib/supabaseClient";

/* ---------- Types ---------- */

type OperatorRow = {
  id: number | string;
  name: string | null;
};

type QuoteRequestRow = {
  id: number;
  trip_id: number | null;
  trip_title: string | null;
  date: string | null;
  pax: number | null;
  name: string;
  email: string;
  phone: string | null;
  note: string | null;
  created_at: string | null;
};

type ChatMessage = {
  id: number;
  quote_request_id: number;
  sender_role: "operator" | "traveller" | null;
  message: string;
  created_at: string | null;
};

/* ---------- Helpers ---------- */

const wrapStyle: CSSProperties = {
  maxWidth: 1040,
  margin: "0 auto",
  padding: "32px 16px 40px",
};

const headingRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 20,
};

const backBtnStyle: CSSProperties = {
  borderRadius: 999,
  border: "1px solid #d1e0da",
  padding: "6px 14px",
  fontSize: 13,
  background: "#f4f7f5",
  color: "#14532d",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const listCardStyle: CSSProperties = {
  borderRadius: 18,
  border: "1px solid #e5ebe7",
  backgroundColor: "#fff",
  padding: 0,
  overflow: "hidden",
  marginBottom: 18,
};

const detailCardStyle: CSSProperties = {
  borderRadius: 18,
  border: "1px solid #e5ebe7",
  backgroundColor: "#fff",
  padding: "16px 18px 18px",
};

const headerRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr) 1fr 1fr 1fr",
  columnGap: 12,
  padding: "10px 18px",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: ".14em",
  color: "#6b7280",
  backgroundColor: "#f7faf9",
  borderBottom: "1px solid #e5ebe7",
};

const itemRowBase: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr) 1fr 1fr 1fr",
  columnGap: 12,
  padding: "12px 18px",
  fontSize: 13,
  alignItems: "center",
  borderBottom: "1px solid #edf2ef",
  cursor: "pointer",
};

const pillStatus: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  backgroundColor: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fde68a",
};

const formatDisplayDate = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

/* ---------- Page ---------- */

export default function OperatorQuotesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [requests, setRequests] = useState<QuoteRequestRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CHAT state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fromEnquiryParam = searchParams.get("from_enquiry");
  const quoteIdParam = searchParams.get("quote_id");

  // ---------- Load operator + enquiries (AI + manual) ----------
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) pata operator
        const { data: opData, error: opErr } = await supabaseBrowser
          .from("operators")
          .select("id, name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (opErr) {
          console.error("quotes page operator load error:", opErr);
          setError(opErr.message || "Failed to load operator profile.");
          setLoading(false);
          return;
        }

        if (!opData) {
          setError(
            "No operator profile found for this account. Please complete your operator onboarding."
          );
          setLoading(false);
          return;
        }

        setOperator(opData as OperatorRow);

        // 2) pata enquiries za operator kutoka API (AI + manual)
        const res = await fetch(
          `/api/quote-requests/by-operator?operator_id=${opData.id}`
        );
        const json = await res.json();

        if (!res.ok) {
          console.error("quotes page quote-requests error:", json);
          setError(json?.error || "Failed to load enquiries.");
          setLoading(false);
          return;
        }

        const list = (json.requests || []) as QuoteRequestRow[];
        setRequests(list);

        // 3) chagua enquiry ya kuonyesha:
        //    - kipaumbele ?quote_id
        //    - kisha ?from_enquiry
        //    - kisha ya kwanza kwenye list
        if (list.length > 0) {
          const byQuote =
            quoteIdParam &&
            list.find((r) => String(r.id) === String(quoteIdParam));
          const byFromEnquiry =
            fromEnquiryParam &&
            list.find((r) => String(r.id) === String(fromEnquiryParam));
          const first = list[0];

          const chosen = byQuote || byFromEnquiry || first;
          setSelectedId(Number(chosen.id));
        } else {
          setSelectedId(null);
        }
      } catch (e: any) {
        console.error("quotes page unexpected error:", e);
        setError(e?.message || "Unexpected error.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, fromEnquiryParam, quoteIdParam]);

  const selected = useMemo(
    () =>
      selectedId == null
        ? null
        : requests.find((r) => Number(r.id) === Number(selectedId)) || null,
    [requests, selectedId]
  );

  // ---------- Load chat messages for selected enquiry ----------
  useEffect(() => {
    if (!selectedId || !user) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setChatLoading(true);
      setChatError(null);
      try {
        const { data, error } = await supabaseBrowser
          .from("quote_request_messages")
          .select("id, quote_request_id, sender_role, message, created_at")
          .eq("quote_request_id", selectedId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("load messages error:", error);
          setChatError(error.message || "Failed to load messages.");
          setMessages([]);
        } else {
          setMessages((data || []) as ChatMessage[]);
        }
      } catch (e: any) {
        console.error("load messages exception:", e);
        setChatError(e?.message || "Unexpected error loading messages.");
        setMessages([]);
      } finally {
        setChatLoading(false);
      }
    };

    loadMessages();
  }, [selectedId, user]);

  // ---------- Send a new chat message (operator) ----------
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !newMessage.trim() || !user) return;

    const text = newMessage.trim();
    setSending(true);
    setChatError(null);

    try {
      // 1) save to DB
      const { data, error } = await supabaseBrowser
        .from("quote_request_messages")
        .insert({
          quote_request_id: selectedId, // BIGINT FK → quote_requests.id
          sender_role: "operator",
          message: text,
        })
        .select("id, quote_request_id, sender_role, message, created_at")
        .single();

      if (error) {
        console.error("send message error:", error);
        setChatError(error.message || "Failed to send message.");
      } else if (data) {
        setMessages((prev) => [...prev, data as ChatMessage]);
        setNewMessage("");

        // 2) optional: tumia API kutuma email notification kwa traveller
        try {
          await fetch("/api/quote-requests/reply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quote_request_id: selectedId,
              message: text,
            }),
          });
        } catch (notifyErr) {
          console.warn("reply email notify error:", notifyErr);
        }
      }
    } catch (e: any) {
      console.error("send message exception:", e);
      setChatError(e?.message || "Unexpected error while sending.");
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <main style={wrapStyle}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
          Safari enquiries
        </h1>
        <p>You need to log in as a tour operator to view your enquiries.</p>
      </main>
    );
  }

  return (
    <main style={wrapStyle}>
      {/* Header */}
      <div style={headingRowStyle}>
        <div>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              margin: 0,
              color: "#14532d",
            }}
          >
            Safari enquiries
          </h1>
          <p
            style={{
              marginTop: 6,
              marginBottom: 0,
              fontSize: 14,
              color: "#4b5563",
              maxWidth: 580,
            }}
          >
            All quote requests and conversations from travellers appear here.
            Reply inside Safari Connector; we’ll send email notifications to
            travellers automatically.
          </p>
        </div>

        <Link href="/operators/dashboard" style={backBtnStyle}>
          ← Back to dashboard
        </Link>
      </div>

      {loading && (
        <p style={{ fontSize: 14, color: "#6b7280" }}>Loading enquiries…</p>
      )}

      {!loading && error && (
        <div
          style={{
            marginBottom: 16,
            borderRadius: 14,
            border: "1px solid #fecaca",
            backgroundColor: "#fef2f2",
            padding: "10px 12px",
            fontSize: 13,
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <p style={{ fontSize: 14, color: "#6b7280", marginTop: 12 }}>
          No enquiries yet. Once travellers send quote requests, they will
          appear here.
        </p>
      )}

      {!loading && !error && requests.length > 0 && (
        <>
          {/* List card */}
          <section style={listCardStyle}>
            <div style={headerRowStyle}>
              <div>Guest</div>
              <div>Travel dates</div>
              <div>Group</div>
              <div>Status</div>
              <div style={{ textAlign: "right" }}>Received</div>
            </div>

            {requests.map((r) => {
              const isActive = selectedId != null && Number(r.id) === selectedId;
              const rowStyle: CSSProperties = {
                ...itemRowBase,
                backgroundColor: isActive ? "#ecfdf3" : "#ffffff",
              };

              const travelLabel = r.date
                ? formatDisplayDate(r.date)
                : "Flexible";

              return (
                <div
                  key={r.id}
                  style={rowStyle}
                  onClick={() => setSelectedId(Number(r.id))}
                >
                  {/* Guest */}
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {r.name || "Safari Connector traveller"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      {r.email}
                    </div>
                  </div>

                  {/* Travel dates */}
                  <div style={{ fontSize: 13, color: "#111827" }}>
                    {travelLabel}
                  </div>

                  {/* Group */}
                  <div style={{ fontSize: 13, color: "#111827" }}>
                    {r.pax != null ? `${r.pax} traveller(s)` : "-"}
                  </div>

                  {/* Status – kwa sasa Pending tu */}
                  <div>
                    <span style={pillStatus}>Pending</span>
                  </div>

                  {/* Received */}
                  <div
                    style={{
                      textAlign: "right",
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    {formatDisplayDate(r.created_at)}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Detail + Chat */}
          {selected && (
            <section style={detailCardStyle}>
              {/* Top meta */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  marginBottom: 10,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    {selected.name || "Safari Connector traveller"}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      marginTop: 2,
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    Enquiry received{" "}
                    {formatDateTime(selected.created_at)} – status Pending.
                  </p>
                  {selected.trip_title && (
                    <p
                      style={{
                        margin: 0,
                        marginTop: 4,
                        fontSize: 13,
                        color: "#374151",
                      }}
                    >
                      Trip:{" "}
                      <span style={{ fontWeight: 600 }}>
                        {selected.trip_title}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Two columns: meta + original message */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
                  gap: 18,
                  marginTop: 10,
                }}
              >
                {/* Left: basic meta */}
                <div
                  style={{
                    fontSize: 13,
                    color: "#111827",
                  }}
                >
                  <div style={{ marginBottom: 4 }}>
                    <span
                      style={{ fontSize: 12, color: "#6b7280", display: "block" }}
                    >
                      Travel dates
                    </span>
                    <span>
                      {selected.date
                        ? formatDisplayDate(selected.date)
                        : "Flexible / not specified"}
                    </span>
                  </div>

                  <div style={{ marginBottom: 4 }}>
                    <span
                      style={{ fontSize: 12, color: "#6b7280", display: "block" }}
                    >
                      Group size
                    </span>
                    <span>
                      {selected.pax != null
                        ? `${selected.pax} traveller(s)`
                        : "Not specified"}
                    </span>
                  </div>

                  <div style={{ marginBottom: 4 }}>
                    <span
                      style={{ fontSize: 12, color: "#6b7280", display: "block" }}
                    >
                      Email
                    </span>
                    <span>{selected.email}</span>
                  </div>

                  {selected.phone && (
                    <div style={{ marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          display: "block",
                        }}
                      >
                        Phone / WhatsApp
                      </span>
                      <span>{selected.phone}</span>
                    </div>
                  )}
                </div>

                {/* Right: original message */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: ".14em",
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    Original message
                  </div>
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb",
                      padding: "10px 12px",
                      fontSize: 13,
                      color: "#111827",
                      whiteSpace: "pre-line",
                      maxHeight: 260,
                      overflowY: "auto",
                    }}
                  >
                    {selected.note || "No additional notes from the traveller."}
                  </div>
                </div>
              </div>

              {/* CHAT AREA */}
              <div
                style={{
                  marginTop: 18,
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#111827",
                    marginBottom: 6,
                  }}
                >
                  Conversation
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 8,
                  }}
                >
                  Chat with this traveller directly inside Safari Connector.
                  We'll notify them by email when you send a new message.
                </div>

                {/* Messages box */}
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid #e5e7eb",
                    backgroundColor: "#f9fafb",
                    padding: "10px 10px 6px",
                    maxHeight: 260,
                    overflowY: "auto",
                    marginBottom: 8,
                  }}
                >
                  {chatLoading && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                        padding: 4,
                      }}
                    >
                      Loading messages…
                    </div>
                  )}

                  {!chatLoading && messages.length === 0 && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                        padding: 4,
                      }}
                    >
                      No messages yet. Send the first reply to start the
                      conversation.
                    </div>
                  )}

                  {!chatLoading &&
                    messages.map((m) => {
                      const isOperator =
                        (m.sender_role || "").toLowerCase() === "operator";
                      return (
                        <div
                          key={m.id}
                          style={{
                            display: "flex",
                            justifyContent: isOperator
                              ? "flex-end"
                              : "flex-start",
                            marginBottom: 6,
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "80%",
                              borderRadius: 16,
                              padding: "6px 10px",
                              fontSize: 13,
                              lineHeight: 1.4,
                              backgroundColor: isOperator
                                ? "#14532d"
                                : "#e5e7eb",
                              color: isOperator ? "#ffffff" : "#111827",
                            }}
                          >
                            <div>{m.message}</div>
                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 10,
                                opacity: 0.8,
                                textAlign: "right",
                              }}
                            >
                              {formatDateTime(m.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {chatError && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#b91c1c",
                      marginBottom: 4,
                    }}
                  >
                    {chatError}
                  </div>
                )}

                {/* Compose form */}
                <form
                  onSubmit={handleSend}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-end",
                    marginTop: 4,
                  }}
                >
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={2}
                    placeholder="Type your message to the traveller…"
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      border: "1px solid #d1d5db",
                      padding: "8px 10px",
                      fontSize: 13,
                      resize: "vertical",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    style={{
                      borderRadius: 999,
                      border: "none",
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      backgroundColor:
                        sending || !newMessage.trim() ? "#9ca3af" : "#14532d",
                      color: "#ffffff",
                      cursor:
                        sending || !newMessage.trim()
                          ? "not-allowed"
                          : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </form>

                <p
                  style={{
                    marginTop: 8,
                    marginBottom: 0,
                    fontSize: 11,
                    color: "#6b7280",
                  }}
                >
                  Tip: keep replies short and friendly. Once you agree on dates
                  and price, you can confirm the booking in your own system for
                  now – we’ll add booking status here next.
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
