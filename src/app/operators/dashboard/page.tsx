// src/app/operators/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

type TripRow = {
  id: string;
  operator_id: string;
  status?: string | null;
  is_published?: boolean | null;
};

type QuoteRow = {
  id: string;
  operator_id: string;
  status?: string | null; // pending / answered / archived
};

type ReplySummaryRow = {
  quote_id: string;
  created_at: string | null;
  sender_role?: string | null; // operator | traveller | null
};

type MessageThreadRow = {
  quote_id: string;
  travel_start_date: string | null;
  created_at: string | null;
  last_message_at: string | null;
  last_from: "operator" | "traveller";
  status?: string | null;
};

/* ---------- UNREAD helpers (Operator) ---------- */

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

const pickOperatorId = (op: OperatorRow | null): string | null => {
  if (!op) return null;
  if (typeof op.id === "string") return op.id;
  if (typeof op.operator_id === "string") return op.operator_id;
  if (typeof op.user_id === "string") return op.user_id;
  return null;
};

const formatLocation = (op: OperatorRow | null) => {
  if (!op) return "";
  const city =
    (op.city as string) || (op.location as string) || (op.operator_city as string);
  const country =
    (op.country as string) ||
    (op.operator_country as string) ||
    "Tanzania";
  return city ? `${city}, ${country}` : country;
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

const formatStatus = (status?: string | null) => {
  const s = status || "pending";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* ---------- Component ---------- */

export default function OperatorDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [activeTripsCount, setActiveTripsCount] = useState<number>(0);
  const [pendingQuotesCount, setPendingQuotesCount] = useState<number>(0);
  const [totalQuotesCount, setTotalQuotesCount] = useState<number>(0);

  const [messageThreadsCount, setMessageThreadsCount] = useState<number>(0);
  const [messageNewCount, setMessageNewCount] = useState<number>(0);
  const [messageThreads, setMessageThreads] = useState<MessageThreadRow[]>([]);
  const [showMessagesPopup, setShowMessagesPopup] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("operator logout error:", err);
    } finally {
      router.replace("/operators/login");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1) Current user
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userResp?.user) {
          console.error("operator dashboard auth error:", userErr);
          if (!isMounted) return;
          setErrorMsg("Please log in as a tour operator.");
          setLoading(false);
          return;
        }

        const user = userResp.user;

        // 2) Operator profile: operators_view then operators fallback
        let operatorRow: OperatorRow | null = null;

        const { data: opViewRows, error: opViewErr } = await supabase
          .from("operators_view")
          .select("*")
          .eq("user_id", user.id)
          .limit(1);

        if (opViewErr) {
          console.warn("operator dashboard operators_view error:", opViewErr);
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
            console.warn("operator dashboard operators fallback error:", opErr);
          }
          if (opRows && opRows.length > 0) {
            operatorRow = opRows[0] as OperatorRow;
          }
        }

        const operatorId = pickOperatorId(operatorRow);

        if (!operatorRow || !operatorId) {
          if (!isMounted) return;
          setOperator(null);
          setErrorMsg(
            "We couldn’t find your operator profile. Please contact support."
          );
          setLoading(false);
          return;
        }

        if (!isMounted) return;
        setOperator(operatorRow);

        // 3) Load trips, quotes & message summary in parallel
        const [tripsRes, quotesRes] = await Promise.all([
          supabase
            .from("trips")
            .select("id, status, is_published")
            .eq("operator_id", operatorId),
          supabase
            .from("operator_quotes")
            .select("id, status, travel_start_date, created_at")
            .eq("operator_id", operatorId),
        ]);

        /* Trips */
        if (tripsRes.error) {
          console.warn("operator dashboard trips error:", tripsRes.error);
        } else {
          const trips = (tripsRes.data || []) as TripRow[];
          const activeCount = trips.length;
          if (isMounted) setActiveTripsCount(activeCount);
        }

        /* Quotes summary + messages */
        if (quotesRes.error) {
          console.warn("operator dashboard quotes error:", quotesRes.error);
          if (isMounted) {
            setPendingQuotesCount(0);
            setTotalQuotesCount(0);
            setMessageThreads([]);
            setMessageThreadsCount(0);
            setMessageNewCount(0);
          }
        } else {
          const quotes = (quotesRes.data || []) as (QuoteRow & {
            travel_start_date?: string | null;
            created_at?: string | null;
          })[];

          const pending = quotes.filter(
            (q) => !q.status || q.status === "pending"
          ).length;
          const total = quotes.length;

          if (isMounted) {
            setPendingQuotesCount(pending);
            setTotalQuotesCount(total);
          }

          // 4) Messages summary: latest reply per quote, check who sent last
          const quoteIds = quotes.map((q) => q.id);
          if (quoteIds.length > 0) {
            const { data: repliesRows, error: repliesErr } = await supabase
              .from("operator_quote_replies")
              .select("quote_id, created_at, sender_role")
              .in("quote_id", quoteIds);

            if (repliesErr) {
              console.warn(
                "operator dashboard replies summary error:",
                repliesErr
              );
              if (isMounted) {
                setMessageThreads([]);
                setMessageThreadsCount(0);
                setMessageNewCount(0);
              }
            } else {
              const replies = (repliesRows || []) as ReplySummaryRow[];
              const latestByQuote: Record<string, ReplySummaryRow> = {};

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

              const threads: MessageThreadRow[] = [];
              quotes.forEach((q) => {
                const last = latestByQuote[q.id];
                if (!last) return;

                const rawRole = (last.sender_role || "traveller").toLowerCase();
                const last_from: "operator" | "traveller" =
                  rawRole === "operator" ? "operator" : "traveller";

                threads.push({
                  quote_id: q.id,
                  travel_start_date: (q as any).travel_start_date ?? null,
                  created_at: (q as any).created_at ?? null,
                  last_message_at: last.created_at,
                  last_from,
                  status: q.status ?? null,
                });
              });

              const unreadMap = getUnreadMap();
              const unreadThreads = threads.filter((t) => {
                if (t.last_from !== "traveller") return false;
                const lastTime = t.last_message_at
                  ? new Date(t.last_message_at).getTime()
                  : 0;
                const seenTime = unreadMap[t.quote_id] || 0;
                return lastTime > seenTime;
              });

              if (isMounted) {
                setMessageThreads(unreadThreads);
                setMessageThreadsCount(unreadThreads.length);
                setMessageNewCount(unreadThreads.length);
              }
            }
          } else if (isMounted) {
            setMessageThreads([]);
            setMessageThreadsCount(0);
            setMessageNewCount(0);
          }
        }
      } catch (err: any) {
        console.error("operator dashboard exception:", err);
        if (isMounted) {
          setErrorMsg("Unexpected error while loading your dashboard.");
          setMessageThreads([]);
          setMessageThreadsCount(0);
          setMessageNewCount(0);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  /* ---------- Derived text ---------- */

  const companyName =
    (operator?.company_name as string) ||
    (operator?.name as string) ||
    "Safari operator";

  const locationLabel = formatLocation(operator);

  const profileEmail =
    (operator?.email as string) ||
    (operator?.contact_email as string) ||
    (operator?.operator_email as string) ||
    "";

  const profileStatusLabel = "Live";

  /* ---------- Render ---------- */

  return (
    <main
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "32px 16px 64px",
      }}
    >
      {/* Top heading + logout */}
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
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 900,
              color: "#14532D",
            }}
          >
            Welcome, {companyName}
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 6,
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            Manage your profile, review enquiries and keep track of your trips on
            Safari Connector.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
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
          Log out
        </button>
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

      {/* Top summary cards: Trips / Quotes / Messages / Profile */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {/* Trips */}
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
            Trips
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            Trips currently visible to travellers.
          </p>
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              fontWeight: 600,
              color: "#111827",
            }}
          >
            {activeTripsCount} active trip
            {activeTripsCount === 1 ? "" : "s"}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
            }}
          >
            <Link
              href="/operators/trips"
              style={{
                color: "#14532D",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Manage trips →
            </Link>
          </div>
        </div>

        {/* Quote Requests */}
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
            Quote Requests
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            New enquiries waiting for your reply.
          </p>
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "#111827",
            }}
          >
            <strong>{pendingQuotesCount}</strong> new /{" "}
            <strong>{totalQuotesCount}</strong> total
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
            }}
          >
            <Link
              href="/operators/quotes"
              style={{
                color: "#14532D",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              View requests →
            </Link>
          </div>
        </div>

        {/* Messages TAB */}
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Messages
            </div>
            {messageNewCount > 0 && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 999,
                  backgroundColor: "#F97316",
                  color: "#FFFFFF",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {messageNewCount} new
              </span>
            )}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            Ongoing chats with travellers for your quotes.
          </p>
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "#111827",
            }}
          >
            <strong>{messageThreadsCount}</strong> conversation
            {messageThreadsCount === 1 ? "" : "s"} with unread messages
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
            }}
          >
            <button
              type="button"
              onClick={() => setShowMessagesPopup(true)}
              style={{
                padding: 0,
                border: "none",
                background: "none",
                color: "#14532D",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Open messages →
            </button>
          </div>
        </div>

        {/* Profile */}
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
            Profile
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            Your public Safari Connector company profile.
          </p>
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "#166534",
              fontWeight: 600,
            }}
          >
            {profileStatusLabel}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
            }}
          >
            <Link
              href="/operators/profile"
              style={{
                color: "#14532D",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Edit profile →
            </Link>
          </div>
        </div>
      </section>

      {/* Company snapshot + next steps */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)",
          gap: 18,
        }}
      >
        {/* Company snapshot */}
        <div
          style={{
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
              marginBottom: 8,
            }}
          >
            Company snapshot
          </h2>
          <div
            style={{
              fontSize: 13,
              color: "#111827",
            }}
          >
            <div
              style={{
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                Company name
              </div>
              <div>{companyName}</div>
            </div>

            {profileEmail && (
              <div
                style={{
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  Email
                </div>
                <div>{profileEmail}</div>
              </div>
            )}

            {locationLabel && (
              <div
                style={{
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  Location
                </div>
                <div>{locationLabel}</div>
              </div>
            )}
          </div>

          <p
            style={{
              marginTop: 12,
              marginBottom: 0,
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            Tip: keep your response time low and your trip descriptions
            detailed. High quality content and fast replies lead to more
            confirmed bookings.
          </p>
        </div>

        {/* Next steps */}
        <div
          style={{
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
              marginBottom: 8,
            }}
          >
            Next steps
          </h2>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 13,
              color: "#4B5563",
            }}
          >
            <li>Complete your company profile fully.</li>
            <li>Add your top trips (5–8 day safaris).</li>
            <li>Reply quickly to new quote requests and messages.</li>
            <li>Share your unique story and values.</li>
          </ul>

          <div
            style={{
              marginTop: 14,
            }}
          >
            <Link
              href="/operators/trips/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "9px 18px",
                borderRadius: 999,
                backgroundColor: "#0B6B3A",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              Add a new trip →
            </Link>
          </div>
        </div>
      </section>

      {/* Messages popup (unread only) */}
      {showMessagesPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setShowMessagesPopup(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 500,
              maxHeight: "80vh",
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              boxShadow: "0 20px 40px rgba(15,23,42,0.45)",
              padding: "16px 18px 14px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
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
                  Messages inbox
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  Unread messages from travellers
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  {messageThreadsCount === 0
                    ? "No unread conversations right now."
                    : `${messageThreadsCount} unread conversation${
                        messageThreadsCount === 1 ? "" : "s"
                      }`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMessagesPopup(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 4,
                  color: "#6B7280",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginTop: 10,
                borderRadius: 16,
                border: "1px solid #E5E7EB",
                padding: 8,
                maxHeight: "52vh",
                overflowY: "auto",
                backgroundColor: "#F9FAFB",
              }}
            >
              {messageThreads.length === 0 ? (
                <div
                  style={{
                    padding: 10,
                    fontSize: 13,
                    color: "#4B5563",
                  }}
                >
                  When travellers send new messages on your quotes, the
                  conversations with unread messages will appear here.
                </div>
              ) : (
                messageThreads.map((t) => (
                  <Link
                    key={t.quote_id}
                    href={`/operators/quotes?quote_id=${encodeURIComponent(
                      t.quote_id
                    )}`}
                    onClick={() => {
                      markQuoteSeen(t.quote_id);
                      setShowMessagesPopup(false);
                    }}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      color: "inherit",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 14,
                        border: "1px solid #E5E7EB",
                        padding: "8px 9px",
                        backgroundColor: "#EFF6FF",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
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
                            Safari enquiry (
                            {t.travel_start_date
                              ? formatDateShort(t.travel_start_date)
                              : "Dates not set"}
                            )
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6B7280",
                            }}
                          >
                            Last message from traveller
                          </div>
                        </div>
                        <div
                          style={{
                            textAlign: "right",
                          }}
                        >
                          {t.status && (
                            <div
                              style={{
                                fontSize: 11,
                                padding: "2px 7px",
                                borderRadius: 999,
                                backgroundColor:
                                  (t.status || "pending") === "answered"
                                    ? "#ECFDF5"
                                    : "#FEF3C7",
                                color:
                                  (t.status || "pending") === "answered"
                                    ? "#166534"
                                    : "#92400E",
                                border:
                                  (t.status || "pending") === "answered"
                                    ? "1px solid #BBF7D0"
                                    : "1px solid #FDE68A",
                                fontWeight: 600,
                                marginBottom: 2,
                              }}
                            >
                              {formatStatus(t.status)}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 11,
                              color: "#6B7280",
                            }}
                          >
                            {formatDateShort(t.last_message_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  color: "#6B7280",
                }}
              >
                Tap a conversation to go directly to that enquiry chat.
              </span>
              <Link
                href="/operators/quotes"
                onClick={() => setShowMessagesPopup(false)}
                style={{
                  textDecoration: "none",
                  fontWeight: 600,
                  color: "#14532D",
                }}
              >
                View all quotes →
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
