"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ---------- Types ---------- */

type QuoteRow = {
  id: string;
  operator_id: string;
  email: string | null;
  travel_start_date: string | null;
  travel_end_date: string | null;
  group_size: number | null;
  message: string | null;
  status?: string | null;
  created_at: string | null;
};

type OperatorRow = {
  id: string;
  name?: string | null;
  company_name?: string | null;
};

type ReplyRow = {
  id: string;
  quote_id: string;
  sender_role: string | null;
  message: string | null;
  created_at: string | null;
};

/* ---------- UNREAD helpers ---------- */

const TRAVELLER_UNREAD_KEY = "sc_unread_traveller";

const getUnreadMap = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TRAVELLER_UNREAD_KEY);
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
    window.localStorage.setItem(TRAVELLER_UNREAD_KEY, JSON.stringify(map));
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

/* ---------- CLOSED helpers (local only) ---------- */

const TRAVELLER_CLOSED_KEY = "sc_traveller_closed";

const getClosedMap = (): Record<string, boolean> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TRAVELLER_CLOSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
};

const setClosedMap = (map: Record<string, boolean>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRAVELLER_CLOSED_KEY, JSON.stringify(map));
  } catch {
    //
  }
};

const markQuoteClosedLocal = (quoteId: string) => {
  if (!quoteId) return;
  const map = getClosedMap();
  map[quoteId] = true;
  setClosedMap(map);
};

/* ---------- Helpers ---------- */

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
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

/** Traveller-facing status label */
const getTravellerStatusLabel = (status?: string | null) => {
  const s = (status || "pending").toLowerCase();

  switch (s) {
    case "pending":
      return "Waiting for operator";
    case "answered":
      return "Operator replied";
    case "confirmed":
      return "Confirmed";
    case "cancelled":
      return "Cancelled";
    case "archived":
      return "Closed";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

/* ---------- Component ---------- */

export default function TravellerQuotesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [closing, setClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [travellerEmail, setTravellerEmail] = useState<string | null>(null);

  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [operators, setOperators] = useState<Record<string, string>>({});
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const [closedMapState, setClosedMapState] = useState<Record<string, boolean>>(
    {}
  );

  // Load local closed map once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    setClosedMapState(getClosedMap());
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userResp?.user) {
          console.error("traveller quotes auth error:", userErr);
          if (!isMounted) return;
          setErrorMsg("Please log in as a traveller.");
          setLoading(false);
          return;
        }

        const user = userResp.user;
        const emailFromUser =
          (user.email as string) ||
          ((user.user_metadata?.email as string) ?? null);

        if (!emailFromUser) {
          if (!isMounted) return;
          setErrorMsg("We couldn't find an email on your account.");
          setLoading(false);
          return;
        }

        if (!isMounted) return;

        setTravellerEmail(emailFromUser);

        // load quotes
        const { data: quoteRows, error: quoteErr } = await supabase
          .from("operator_quotes")
          .select("*")
          .eq("email", emailFromUser)
          .order("created_at", { ascending: false });

        if (quoteErr) {
          console.error("traveller quotes load error:", quoteErr);
          if (!isMounted) return;
          setQuotes([]);
          setErrorMsg("Could not load your enquiries.");
          setLoading(false);
          return;
        }

        const qRows = (quoteRows || []) as QuoteRow[];

        if (!isMounted) return;

        setQuotes(qRows);

        // operators
        const operatorIds = Array.from(
          new Set(qRows.map((q) => q.operator_id).filter(Boolean))
        );
        if (operatorIds.length > 0) {
          const { data: opRows, error: opErr } = await supabase
            .from("operators")
            .select("id, name, company_name")
            .in("id", operatorIds);

          if (opErr) {
            console.warn("traveller quotes operators error:", opErr);
          } else {
            const map: Record<string, string> = {};
            (opRows || []).forEach((op) => {
              const row = op as OperatorRow;
              map[row.id] =
                (row.company_name as string) ||
                (row.name as string) ||
                "Safari operator";
            });
            if (isMounted) setOperators(map);
          }
        }

        // pick initial selected
        let initialId: string | null =
          (searchParams && searchParams.get("quote_id")) || null;

        if (!initialId && qRows.length > 0) {
          initialId = qRows[0].id;
        }

        if (initialId && isMounted) {
          setSelectedQuoteId(initialId);
        }
      } catch (err: any) {
        console.error("traveller quotes exception:", err);
        if (isMounted) {
          setErrorMsg("Unexpected error while loading your enquiries.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // load messages when quote changes
  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      if (!selectedQuoteId) {
        setReplies([]);
        return;
      }

      setLoadingMessages(true);

      try {
        const { data: rows, error } = await supabase
          .from("operator_quote_replies")
          .select("*")
          .eq("quote_id", selectedQuoteId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("traveller quotes replies error:", error);
          if (!isMounted) return;
          setReplies([]);
        } else {
          if (!isMounted) return;
          setReplies((rows || []) as ReplyRow[]);
          // mark as read once we’ve opened this thread
          markQuoteSeen(selectedQuoteId);
        }
      } catch (err: any) {
        console.error("traveller quotes replies exception:", err);
        if (isMounted) setReplies([]);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedQuoteId]);

  const selectedQuote = useMemo(
    () => quotes.find((q) => q.id === selectedQuoteId) || null,
    [quotes, selectedQuoteId]
  );

  const selectedOperatorName =
    (selectedQuote && operators[selectedQuote.operator_id]) ||
    "Safari operator";

  const selectedStatusRaw = (selectedQuote?.status || "pending").toLowerCase();
  const selectedIsClosed =
    selectedStatusRaw === "archived" ||
    selectedStatusRaw === "cancelled" ||
    (!!selectedQuoteId && closedMapState[selectedQuoteId] === true);

  const handleSelectQuote = (id: string) => {
    setSelectedQuoteId(id);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("quote_id", id);
    router.replace(`/traveller/quotes?${params.toString()}`);
  };

  const handleSend = async () => {
    if (!selectedQuoteId || !newMessage.trim() || selectedIsClosed) return;
    const text = newMessage.trim();
    setNewMessage("");

    try {
      const { data, error } = await supabase
        .from("operator_quote_replies")
        .insert({
          quote_id: selectedQuoteId,
          sender_role: "traveller",
          message: text,
        })
        .select("*")
        .single();

      if (error) {
        console.error("traveller quotes send error:", error);
        return;
      }

      if (data) {
        setReplies((prev) => [...prev, data as ReplyRow]);
      }
    } catch (err: any) {
      console.error("traveller quotes send exception:", err);
    }
  };

  const handleCloseChat = async () => {
    if (!selectedQuoteId || !selectedQuote || selectedIsClosed) return;

    setClosing(true);
    setErrorMsg(null);

    try {
      // Local-only close: mark in localStorage + state
      markQuoteClosedLocal(selectedQuoteId);
      setClosedMapState((prev) => ({ ...prev, [selectedQuoteId]: true }));

      // Optionally, we also reflect it in local quotes state as "archived"
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === selectedQuoteId ? { ...q, status: "archived" } : q
        )
      );

      // Mark as seen so NEW badge ipotee
      markQuoteSeen(selectedQuoteId);
    } catch (err: any) {
      console.error("traveller close chat local exception:", err);
      setErrorMsg("Unexpected error while closing this chat.");
    } finally {
      setClosing(false);
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
      {/* Top bar: title + Back to my account */}
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
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#9CA3AF",
              marginBottom: 6,
            }}
          >
            Safari Connector
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
              color: "#14532D",
            }}
          >
            Your safari enquiries
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            View the quotes you&apos;ve requested and chat with local operators
            like WhatsApp, directly inside Safari Connector.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <Link
            href="/traveller/dashboard"
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
            Back to my account
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

      {/* Main layout: enquiries list + chat */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 2fr)",
          gap: 20,
        }}
      >
        {/* Left: enquiries list */}
        <div
          style={{
            borderRadius: 22,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            padding: "18px 18px 16px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#6B7280",
              marginBottom: 4,
            }}
          >
            Enquiries
          </div>
          <p
            style={{
              margin: 0,
              marginBottom: 10,
              fontSize: 13,
              color: "#6B7280",
            }}
          >
            Choose a safari enquiry to open the chat.
          </p>

          {loading ? (
            <div
              style={{
                marginTop: 20,
                fontSize: 13,
                color: "#6B7280",
              }}
            >
              Loading enquiries...
            </div>
          ) : quotes.length === 0 ? (
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
              You haven&apos;t requested any quotes yet. When you send a
              request, it will appear here.
            </div>
          ) : (
            <div
              style={{
                marginTop: 6,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 430,
                overflowY: "auto",
              }}
            >
              {quotes.map((q) => {
                const isActive = q.id === selectedQuoteId;
                const opName = operators[q.operator_id] || "Safari operator";

                const unreadMap = getUnreadMap();
                const lastSeen = unreadMap[q.id] || 0;
                const hasUnread =
                  selectedQuoteId === q.id &&
                  replies.some((r) => {
                    if ((r.sender_role || "operator") !== "operator") return false;
                    const t = r.created_at
                      ? new Date(r.created_at).getTime()
                      : 0;
                    return t > lastSeen;
                  });

                const statusRaw = (q.status || "pending").toLowerCase();
                const statusBg =
                  statusRaw === "answered" || statusRaw === "confirmed"
                    ? "#ECFDF5"
                    : statusRaw === "cancelled" || statusRaw === "archived"
                    ? "#FEE2E2"
                    : "#FEF3C7";
                const statusColor =
                  statusRaw === "answered" || statusRaw === "confirmed"
                    ? "#166534"
                    : statusRaw === "cancelled" || statusRaw === "archived"
                    ? "#B91C1C"
                    : "#92400E";
                const statusBorder =
                  statusRaw === "answered" || statusRaw === "confirmed"
                    ? "1px solid #BBF7D0"
                    : statusRaw === "cancelled" || statusRaw === "archived"
                    ? "1px solid #FCA5A5"
                    : "1px solid #FDE68A";

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleSelectQuote(q.id)}
                    style={{
                      textAlign: "left",
                      borderRadius: 18,
                      border: isActive
                        ? "2px solid #065F46"
                        : "1px solid #E5E7EB",
                      padding: "10px 12px",
                      backgroundColor: isActive ? "#ECFDF5" : "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          {opName}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6B7280",
                          }}
                        >
                          {q.travel_start_date && q.travel_end_date
                            ? `${formatDate(q.travel_start_date)} – ${formatDate(
                                q.travel_end_date
                              )}`
                            : "Travel dates not set"}
                        </div>
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            color: "#6B7280",
                          }}
                        >
                          Group size{" "}
                          {q.group_size ? q.group_size : "not specified"}
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                        }}
                      >
                        <div
                          style={{
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: 999,
                              backgroundColor: statusBg,
                              color: statusColor,
                              border: statusBorder,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {getTravellerStatusLabel(q.status)}
                          </span>
                          {hasUnread && (
                            <span
                              style={{
                                marginLeft: 6,
                                padding: "2px 7px",
                                borderRadius: 999,
                                backgroundColor: "#F97316",
                                color: "#FFFFFF",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              New
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6B7280",
                          }}
                        >
                          {q.created_at ? formatDateShort(q.created_at) : ""}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: chat area */}
        <div
          style={{
            borderRadius: 22,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            padding: "18px 18px 16px",
            minHeight: 420,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!selectedQuote ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                color: "#6B7280",
              }}
            >
              Select an enquiry on the left to see the chat with the operator.
            </div>
          ) : (
            <>
              {/* Header info + Close chat */}
              <div
                style={{
                  marginBottom: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: 2,
                    }}
                  >
                    {selectedOperatorName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      marginBottom: 8,
                    }}
                  >
                    Enquiry sent on{" "}
                    {selectedQuote.created_at
                      ? formatDateShort(selectedQuote.created_at)
                      : "-"}
                    {selectedQuote.status && (
                      <>
                        {" "}
                        — status{" "}
                        <span
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          {getTravellerStatusLabel(selectedQuote.status)}
                        </span>
                      </>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 40,
                      fontSize: 12,
                      color: "#4B5563",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontSize: 11,
                          color: "#9CA3AF",
                        }}
                      >
                        Travel dates
                      </div>
                      <div>
                        {selectedQuote.travel_start_date &&
                        selectedQuote.travel_end_date
                          ? `${formatDate(
                              selectedQuote.travel_start_date
                            )} – ${formatDate(selectedQuote.travel_end_date)}`
                          : "Not specified"}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontSize: 11,
                          color: "#9CA3AF",
                        }}
                      >
                        Group size
                      </div>
                      <div>
                        {selectedQuote.group_size
                          ? selectedQuote.group_size
                          : "Not specified"}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 6,
                  }}
                >
                  {selectedIsClosed ? (
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        backgroundColor: "#F3F4F6",
                        border: "1px solid #E5E7EB",
                        fontSize: 11,
                        color: "#6B7280",
                        fontWeight: 600,
                      }}
                    >
                      Chat closed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCloseChat}
                      disabled={closing}
                      style={{
                        borderRadius: 999,
                        padding: "6px 12px",
                        border: "1px solid #FCA5A5",
                        backgroundColor: "#FEF2F2",
                        color: "#B91C1C",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: closing ? "default" : "pointer",
                      }}
                    >
                      {closing ? "Closing..." : "Close chat"}
                    </button>
                  )}
                </div>
              </div>

              {/* Messages area */}
              <div
                style={{
                  flex: 1,
                  marginTop: 10,
                  borderRadius: 18,
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#F9FAFB",
                  padding: 12,
                  overflowY: "auto",
                  maxHeight: 380,
                }}
              >
                {/* Original request block */}
                {selectedQuote.message && (
                  <div
                    style={{
                      marginBottom: 10,
                      alignSelf: "stretch",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        marginBottom: 3,
                      }}
                    >
                      Your original request
                    </div>
                    <div
                      style={{
                        backgroundColor: "#DCFCE7",
                        borderRadius: 12,
                        padding: 10,
                        fontSize: 13,
                        lineHeight: 1.5,
                        border: "1px solid #A7F3D0",
                      }}
                    >
                      {selectedQuote.message}
                    </div>
                  </div>
                )}

                {loadingMessages ? (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: "#6B7280",
                    }}
                  >
                    Loading messages...
                  </div>
                ) : replies.length === 0 ? (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color: "#6B7280",
                    }}
                  >
                    No messages yet. When the operator replies, the chat will
                    appear here.
                  </div>
                ) : (
                  replies.map((r) => {
                    const isTraveller =
                      (r.sender_role || "traveller") === "traveller";

                    return (
                      <div
                        key={r.id}
                        style={{
                          display: "flex",
                          justifyContent: isTraveller
                            ? "flex-end"
                            : "flex-start",
                          marginTop: 8,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "78%",
                            borderRadius: 12,
                            padding: 8,
                            fontSize: 13,
                            lineHeight: 1.5,
                            backgroundColor: isTraveller
                              ? "#DCFCE7"
                              : "#FFFFFF",
                            border: isTraveller
                              ? "1px solid #A7F3D0"
                              : "1px solid #E5E7EB",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              marginBottom: 2,
                              color: "#6B7280",
                            }}
                          >
                            {isTraveller ? "You" : selectedOperatorName}
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

              {/* Composer */}
              {selectedIsClosed ? (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  This conversation is closed. You can still read past messages,
                  but you can&apos;t send new ones.
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Write a message..."
                    style={{
                      flex: 1,
                      borderRadius: 999,
                      border: "1px solid #D1D5DB",
                      padding: "8px 12px",
                      fontSize: 13,
                      outline: "none",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    style={{
                      borderRadius: 999,
                      padding: "8px 16px",
                      backgroundColor: "#14532D",
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Send
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
