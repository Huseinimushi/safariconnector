"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

type ReplySummaryRow = {
  quote_id: string;
  created_at: string | null;
  sender_role?: string | null;
};

type OperatorRow = {
  id: string;
  name?: string | null;
  company_name?: string | null;
};

type MessageThreadRow = {
  quote_id: string;
  operator_id: string;
  travel_start_date: string | null;
  last_message_at: string | null;
  last_from: "operator" | "traveller";
  status?: string | null;
};

/* ---------- LocalStorage helpers for UNREAD ---------- */

const TRAVELLER_UNREAD_KEY = "sc_unread_traveller";

const getUnreadMap = (storageKey: string): Record<string, number> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
};

const setUnreadMap = (storageKey: string, map: Record<string, number>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    // ignore
  }
};

const markQuoteSeen = (storageKey: string, quoteId: string) => {
  if (!quoteId) return;
  const map = getUnreadMap(storageKey);
  map[quoteId] = Date.now();
  setUnreadMap(storageKey, map);
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

const formatStatus = (status?: string | null) => {
  const s = status || "pending";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* ---------- Component ---------- */

export default function TravellerDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [travellerName, setTravellerName] = useState<string>("Traveller");
  const [travellerEmail, setTravellerEmail] = useState<string | null>(null);

  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [operatorNames, setOperatorNames] = useState<Record<string, string>>({});

  const [totalEnquiries, setTotalEnquiries] = useState<number>(0);
  const [lastEnquiryDate, setLastEnquiryDate] = useState<string | null>(null);

  const [messageThreadsCount, setMessageThreadsCount] = useState<number>(0);
  const [messageNewCount, setMessageNewCount] = useState<number>(0);
  const [messageThreads, setMessageThreads] = useState<MessageThreadRow[]>([]);
  const [showMessagesPopup, setShowMessagesPopup] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("traveller logout error:", err);
    } finally {
      router.replace("/login/traveller");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1) User
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userResp?.user) {
          console.error("traveller dashboard auth error:", userErr);
          if (!isMounted) return;
          setErrorMsg("Please log in as a traveller.");
          setLoading(false);
          return;
        }

        const user = userResp.user;
        const emailFromUser =
          (user.email as string) ||
          ((user.user_metadata?.email as string) ?? null);

        if (!isMounted) return;

        const nameFromUser =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          (user.email as string) ||
          "Traveller";

        setTravellerName(nameFromUser);
        setTravellerEmail(emailFromUser);

        if (!emailFromUser) {
          setErrorMsg(
            "We couldn't find an email on your account, so we can't match your enquiries."
          );
          setLoading(false);
          return;
        }

        // 2) Load quotes for this traveller
        const { data: quoteRows, error: quoteErr } = await supabase
          .from("operator_quotes")
          .select("*")
          .eq("email", emailFromUser)
          .order("created_at", { ascending: false });

        if (quoteErr) {
          console.error("traveller dashboard quotes error:", quoteErr);
          if (!isMounted) return;
          setQuotes([]);
          setTotalEnquiries(0);
          setLastEnquiryDate(null);
          setLoading(false);
          setErrorMsg("Could not load your enquiries.");
          return;
        }

        const qRows = (quoteRows || []) as QuoteRow[];

        if (!isMounted) return;

        setQuotes(qRows);
        setTotalEnquiries(qRows.length);
        setLastEnquiryDate(qRows[0]?.created_at || null);

        // 3) Operator names
        const operatorIds = Array.from(
          new Set(qRows.map((q) => q.operator_id).filter(Boolean))
        );
        if (operatorIds.length > 0) {
          const { data: opRows, error: opErr } = await supabase
            .from("operators")
            .select("id, name, company_name")
            .in("id", operatorIds);

          if (opErr) {
            console.warn("traveller dashboard operators error:", opErr);
          } else {
            const map: Record<string, string> = {};
            (opRows || []).forEach((op) => {
              const row = op as OperatorRow;
              map[row.id] =
                (row.company_name as string) ||
                (row.name as string) ||
                "Safari operator";
            });
            if (isMounted) setOperatorNames(map);
          }
        }

        // 4) Messages summary
        const quoteIds = qRows.map((q) => q.id);
        if (quoteIds.length > 0) {
          const { data: repliesRows, error: repliesErr } = await supabase
            .from("operator_quote_replies")
            .select("quote_id, created_at, sender_role")
            .in("quote_id", quoteIds);

          if (repliesErr) {
            console.warn(
              "traveller dashboard replies summary error:",
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

            const allThreads: MessageThreadRow[] = [];

            qRows.forEach((q) => {
              const last = latestByQuote[q.id];
              if (!last) return;

              const rawRole = (last.sender_role || "operator").toLowerCase();
              const last_from: "operator" | "traveller" =
                rawRole === "traveller" ? "traveller" : "operator";

              allThreads.push({
                quote_id: q.id,
                operator_id: q.operator_id,
                travel_start_date: q.travel_start_date,
                last_message_at: last.created_at,
                last_from,
                status: q.status ?? null,
              });
            });

            // UNREAD: last msg from operator AND time > lastSeen
            const unreadMap = getUnreadMap(TRAVELLER_UNREAD_KEY);
            const newThreads = allThreads.filter((t) => {
              if (t.last_from !== "operator") return false;
              const lastTime = t.last_message_at
                ? new Date(t.last_message_at).getTime()
                : 0;
              const seenTime = unreadMap[t.quote_id] || 0;
              return lastTime > seenTime;
            });

            const newCount = newThreads.length;

            if (isMounted) {
              setMessageThreads(newThreads);
              setMessageThreadsCount(newCount);
              setMessageNewCount(newCount);
            }
          }
        } else if (isMounted) {
          setMessageThreads([]);
          setMessageThreadsCount(0);
          setMessageNewCount(0);
        }
      } catch (err: any) {
        console.error("traveller dashboard exception:", err);
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

  /* ---------- Derived heading text ---------- */

  const headingName =
    travellerName && travellerName.includes("@")
      ? travellerName.split("@")[0]
      : travellerName || "Traveller";

  /* ---------- Render ---------- */

  return (
    <main
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "32px 16px 64px",
      }}
    >
      {/* Top heading row + buttons */}
      <section
        style={{
          marginBottom: 22,
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
            Traveller dashboard
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
              color: "#14532D",
            }}
          >
            Welcome back, {headingName}
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            See your safari enquiries, follow operator replies and keep your
            traveller profile up to date.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "flex-end",
          }}
        >
          {/* CTA – open inbox popup */}
          <Link
            href="/traveller/quotes"
            onClick={(e) => {
              e.preventDefault();
              setShowMessagesPopup(true);
            }}
            style={{
              borderRadius: 999,
              padding: "8px 14px",
              backgroundColor: "#B45309",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              cursor: "pointer",
            }}
          >
            View my enquiries
          </Link>

          {/* Logout */}
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

      {/* Main two columns */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.1fr) minmax(0, 2.6fr)",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        {/* Traveller profile card (left) */}
        <div
          style={{
            borderRadius: 20,
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
              marginBottom: 10,
            }}
          >
            Your traveller profile
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                backgroundColor: "#14532D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: 20,
              }}
            >
              {travellerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {travellerName}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                Tanzania
              </div>
            </div>
          </div>

          {/* Totals row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                borderRadius: 14,
                border: "1px solid #E5E7EB",
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                  marginBottom: 2,
                }}
              >
                Total enquiries
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {totalEnquiries}
              </div>
            </div>
            <div
              style={{
                borderRadius: 14,
                border: "1px solid #E5E7EB",
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                  marginBottom: 2,
                }}
              >
                Last enquiry
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#111827",
                }}
              >
                {lastEnquiryDate ? formatDateShort(lastEnquiryDate) : "--"}
              </div>
            </div>
          </div>

          {/* Email / phone */}
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "#4B5563",
            }}
          >
            {travellerEmail && (
              <div>
                <strong>Email:</strong> {travellerEmail}
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              <strong>Phone:</strong> +255759098999
            </div>
          </div>
        </div>

        {/* Recent enquiries + Messages tab (right) */}
        <div
          style={{
            borderRadius: 20,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            padding: "18px 18px 16px",
          }}
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
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "#6B7280",
                  marginBottom: 4,
                }}
              >
                Recent safari enquiries
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#4B5563",
                }}
              >
                See the latest quote requests you sent to tour operators.
              </p>
            </div>

            {/* Messages button with new count */}
            <Link
              href="/traveller/quotes"
              onClick={(e) => {
                e.preventDefault();
                setShowMessagesPopup(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 999,
                border: "1px solid #D1D5DB",
                backgroundColor: "#FFFFFF",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              {messageNewCount > 0 && (
                <span
                  style={{
                    padding: "2px 7px",
                    borderRadius: 999,
                    backgroundColor: "#F97316",
                    color: "#FFFFFF",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {messageNewCount} new
                </span>
              )}
              <span>Open inbox</span>
            </Link>
          </div>

          {/* Small summary of all messages */}
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: "#6B7280",
              marginBottom: 8,
            }}
          >
            {messageThreadsCount === 0
              ? "No unread replies from operators at the moment."
              : `${messageThreadsCount} unread conversation${
                  messageThreadsCount === 1 ? "" : "s"
                }.`}
          </div>

          {/* List of recent enquiries */}
          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 340,
              overflowY: "auto",
            }}
          >
            {quotes.length === 0 ? (
              <div
                style={{
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
              quotes.slice(0, 5).map((q) => {
                const opsName =
                  operatorNames[q.operator_id] || "Safari operator";

                return (
                  <Link
                    key={q.id}
                    href={`/traveller/quotes?quote_id=${encodeURIComponent(
                      q.id
                    )}`}
                    onClick={() => {
                      markQuoteSeen(TRAVELLER_UNREAD_KEY, q.id);
                    }}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 16,
                        border: "1px solid #E5E7EB",
                        padding: "9px 10px",
                        backgroundColor: "#FFFFFF",
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
                            Safari enquiry (
                            {formatDate(q.travel_start_date)})
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6B7280",
                            }}
                          >
                            {opsName}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6B7280",
                          }}
                        >
                          {q.created_at
                            ? formatDateShort(q.created_at)
                            : ""}
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 11,
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 7px",
                            borderRadius: 999,
                            backgroundColor:
                              (q.status || "pending") === "answered"
                                ? "#ECFDF5"
                                : "#FEF3C7",
                            color:
                              (q.status || "pending") === "answered"
                                ? "#166534"
                                : "#92400E",
                            border:
                              (q.status || "pending") === "answered"
                                ? "1px solid #BBF7D0"
                                : "1px solid #FDE68A",
                            fontWeight: 600,
                          }}
                        >
                          {formatStatus(q.status)}
                        </span>
                        <span
                          style={{
                            color: "#6B7280",
                          }}
                        >
                          Group size{" "}
                          {q.group_size ? q.group_size : "not set"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ---------- Messages popup: unread only ---------- */}
      {showMessagesPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
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
                  Unread replies from operators
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  {messageThreadsCount === 0
                    ? "No unread replies right now."
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
                  When operators reply to your enquiries, the conversations with
                  unread messages will appear here.
                </div>
              ) : (
                messageThreads.map((t) => {
                  const opName =
                    operatorNames[t.operator_id] || "Safari operator";

                  return (
                    <Link
                      key={t.quote_id}
                      href={`/traveller/quotes?quote_id=${encodeURIComponent(
                        t.quote_id
                      )}`}
                      onClick={() => {
                        markQuoteSeen(TRAVELLER_UNREAD_KEY, t.quote_id);
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
                          backgroundColor: "#ECFEFF",
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
                              Safari enquiry (
                              {formatDate(t.travel_start_date)})
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#6B7280",
                              }}
                            >
                              {opName} · Last message from operator
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
                  );
                })
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
                Tap a conversation to go directly to that chat.
              </span>
              <Link
                href="/traveller/quotes"
                onClick={() => setShowMessagesPopup(false)}
                style={{
                  textDecoration: "none",
                  fontWeight: 600,
                  color: "#14532D",
                }}
              >
                View all enquiries →
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
