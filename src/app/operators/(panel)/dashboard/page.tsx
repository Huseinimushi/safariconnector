// src/app/operators/(panel)/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import styles from "./dashboard.module.css";

type OperatorRow = {
  id: string;
  user_id?: string | null;
  operator_id?: string | null;
  name?: string | null;
  company_name?: string | null;
  email?: string | null;
  contact_email?: string | null;
  operator_email?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  status?: string | null;
  [key: string]: any;
};

type TripRow = { id: string; operator_id: string; status?: string | null; is_published?: boolean | null };
type QuoteRow = { id: string; operator_id: string; status?: string | null };
type ManualQuoteRequestRow = { id: string; operator_id?: string | null; status?: string | null };
type ReplySummaryRow = { quote_id: string; created_at: string | null; sender_role?: string | null };
type MessageThreadRow = {
  quote_id: string;
  travel_start_date: string | null;
  created_at: string | null;
  last_message_at: string | null;
  last_from: "operator" | "traveller";
  status?: string | null;
};
type BookingSummaryRow = { id: string; status: string | null };

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

const pickOperatorId = (op: OperatorRow | null): string | null => {
  if (!op) return null;
  if (typeof op.id === "string") return op.id;
  if (typeof op.operator_id === "string") return op.operator_id;
  if (typeof op.user_id === "string") return op.user_id;
  return null;
};

const formatLocation = (op: OperatorRow | null) => {
  if (!op) return "";
  const city = (op.city as string) || (op.location as string) || (op.operator_city as string);
  const country = (op.country as string) || (op.operator_country as string) || "Tanzania";
  return city ? `${city}, ${country}` : country;
};

const formatDateShort = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const formatStatus = (status?: string | null) => {
  const s = status || "pending";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const normaliseStatus = (status: string | null | undefined) => (status || "pending").toLowerCase();

export default function OperatorDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [activeTripsCount, setActiveTripsCount] = useState(0);
  const [pendingQuotesCount, setPendingQuotesCount] = useState(0);
  const [totalQuotesCount, setTotalQuotesCount] = useState(0);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [messageThreadsCount, setMessageThreadsCount] = useState(0);
  const [messageNewCount, setMessageNewCount] = useState(0);
  const [messageThreads, setMessageThreads] = useState<MessageThreadRow[]>([]);
  const [showMessagesPopup, setShowMessagesPopup] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("operator logout error:", err);
    } finally {
      router.replace("/login");
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userResp?.user) {
          if (!isMounted) return;
          setErrorMsg("Please log in as a tour operator.");
          setLoading(false);
          return;
        }
        const user = userResp.user;

        let operatorRow: OperatorRow | null = null;
        const { data: opViewRows } = await supabase.from("operators_view").select("*").eq("user_id", user.id).limit(1);
        if (opViewRows && opViewRows.length > 0) {
          operatorRow = opViewRows[0] as OperatorRow;
        }
        if (!operatorRow) {
          const { data: opRows } = await supabase.from("operators").select("*").eq("user_id", user.id).limit(1);
          if (opRows && opRows.length > 0) operatorRow = opRows[0] as OperatorRow;
        }

        const operatorId = pickOperatorId(operatorRow);
        if (!operatorRow || !operatorId) {
          if (!isMounted) return;
          setOperator(null);
          setErrorMsg("We couldn't find your operator profile. Please contact support.");
          setLoading(false);
          return;
        }

        if (!isMounted) return;
        setOperator(operatorRow);

        const [tripsRes, quotesRes, manualRes, bookingsRes] = await Promise.all([
          supabase.from("trips").select("id, status, is_published").eq("operator_id", operatorId),
          supabase.from("operator_quotes").select("id, status, travel_start_date, created_at").eq("operator_id", operatorId),
          supabase.from("quote_requests").select("id, operator_id").eq("operator_id", operatorId),
          supabase.from("bookings").select("id, status").eq("operator_id", operatorId),
        ]);

        if (!tripsRes.error) {
          const trips = (tripsRes.data || []) as TripRow[];
          if (isMounted) setActiveTripsCount(trips.length);
        }

        let manualRequestsCount = 0;
        if (!manualRes.error) {
          const manualRows = (manualRes.data || []) as ManualQuoteRequestRow[];
          manualRequestsCount = manualRows.length;
        }

        if (!bookingsRes.error) {
          const bookingRows = (bookingsRes.data || []) as BookingSummaryRow[];
          const total = bookingRows.length;
          const pending = bookingRows.filter((b) => normaliseStatus(b.status) === "pending").length;
          if (isMounted) {
            setBookingsCount(total);
            setPendingBookingsCount(pending);
          }
        }

        if (quotesRes.error) {
          if (isMounted) {
            setPendingQuotesCount(manualRequestsCount);
            setTotalQuotesCount(manualRequestsCount);
            setMessageThreads([]);
            setMessageThreadsCount(0);
            setMessageNewCount(0);
          }
        } else {
          const quotes = (quotesRes.data || []) as (QuoteRow & { travel_start_date?: string | null; created_at?: string | null })[];
          const pendingAI = quotes.filter((q) => !q.status || q.status === "pending").length;
          const totalAI = quotes.length;
          const combinedPending = pendingAI + manualRequestsCount;
          const combinedTotal = totalAI + manualRequestsCount;
          if (isMounted) {
            setPendingQuotesCount(combinedPending);
            setTotalQuotesCount(combinedTotal);
          }

          const quoteIds = quotes.map((q) => q.id);
          if (quoteIds.length > 0) {
            const { data: repliesRows, error: repliesErr } = await supabase
              .from("operator_quote_replies")
              .select("quote_id, created_at, sender_role")
              .in("quote_id", quoteIds);

            if (repliesErr) {
              if (isMounted) {
                setMessageThreads([]);
                setMessageThreadsCount(0);
                setMessageNewCount(0);
              }
            } else {
              const replies = (repliesRows || []) as ReplySummaryRow[];
              const latestByQuote: Record<string, ReplySummaryRow> = {};
              replies.forEach((r) => {
                const prev = latestByQuote[r.quote_id];
                if (!prev || (r.created_at && prev.created_at && new Date(r.created_at).getTime() > new Date(prev.created_at).getTime())) {
                  latestByQuote[r.quote_id] = r;
                }
              });

              const threads: MessageThreadRow[] = [];
              quotes.forEach((q) => {
                const last = latestByQuote[q.id];
                if (!last) return;
                const rawRole = (last.sender_role || "traveller").toLowerCase();
                const last_from: "operator" | "traveller" = rawRole === "operator" ? "operator" : "traveller";
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
                const lastTime = t.last_message_at ? new Date(t.last_message_at).getTime() : 0;
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
      } catch (err) {
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

  const companyName = (operator?.company_name as string) || (operator?.name as string) || "Safari operator";
  const locationLabel = formatLocation(operator);
  const profileEmail =
    (operator?.email as string) ||
    (operator?.contact_email as string) ||
    (operator?.operator_email as string) ||
    "";
  const rawStatus = (operator?.status as string) || "pending";
  const isApproved = rawStatus === "approved" || rawStatus === "live";
  const profileStatusLabel = rawStatus === "approved" || rawStatus === "live" ? "Live" : rawStatus === "pending" ? "Pending approval" : "Not listed";

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.kicker}>Operator workspace</p>
          <h1 className={styles.title}>Welcome, {companyName}</h1>
          <p className={styles.subtitle}>Manage your profile, enquiries, trips, and bookings in one place.</p>
        </div>
        <button type="button" onClick={handleLogout} className={styles.logoutBtn}>
          Log out
        </button>
      </section>

      {errorMsg && <div className={styles.alert}>{errorMsg}</div>}

      <section className={styles.summaryGrid}>
        <div className={styles.card}>
          <div className={styles.cardHead}>Trips</div>
          <p className={styles.cardNote}>Trips currently visible to travellers.</p>
          <div className={styles.cardMetric}>
            {activeTripsCount} active trip{activeTripsCount === 1 ? "" : "s"}
          </div>
          <div className={styles.cardLinkRow}>
            <Link href="/trips" className={styles.cardLink}>
              Manage trips →
            </Link>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>Bookings</div>
          <p className={styles.cardNote}>Confirmed trips generated from accepted quotes.</p>
          <div className={styles.cardMetric}>
            <strong>{pendingBookingsCount}</strong> pending / <strong>{bookingsCount}</strong> total
          </div>
          <div className={styles.cardLinkRow}>
            <Link href="/bookings" className={styles.cardLink}>
              View bookings →
            </Link>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>Quote Requests</div>
          <p className={styles.cardNote}>Enquiries from AI itineraries and manual trip pages.</p>
          <div className={styles.cardMetric}>
            <strong>{pendingQuotesCount}</strong> new / <strong>{totalQuotesCount}</strong> total
          </div>
          <div className={styles.cardLinkRowMulti}>
            <Link href="/enquiries" className={styles.cardLink}>
              Traveller enquiries →
            </Link>
            <Link href="/quotes" className={styles.cardLink}>
              AI quotes & chats →
            </Link>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeadRow}>
            <div className={styles.cardHead}>Messages</div>
            {messageNewCount > 0 && <span className={styles.badge}>{messageNewCount} new</span>}
          </div>
          <p className={styles.cardNote}>Chats with travellers for your quotes.</p>
          <div className={styles.cardMetric}>
            <strong>{messageThreadsCount}</strong> conversation{messageThreadsCount === 1 ? "" : "s"} with unread messages
          </div>
          <div className={styles.cardLinkRow}>
            <button type="button" className={styles.cardButton} onClick={() => setShowMessagesPopup(true)}>
              Open messages →
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>Profile</div>
          <p className={styles.cardNote}>Your public Safari Connector company profile.</p>
          <div
            className={styles.cardMetric}
            style={{
              color:
                profileStatusLabel === "Live"
                  ? "#166534"
                  : profileStatusLabel === "Pending approval"
                  ? "#92400E"
                  : "#B91C1C",
            }}
          >
            {profileStatusLabel}
          </div>
          <div className={styles.cardLinkRow}>
            <Link href="/profile" className={styles.cardLink}>
              Edit profile →
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Company snapshot</div>
          <div className={styles.snapshotGrid}>
            <div className={styles.snapshotLabel}>Company name</div>
            <div>{companyName}</div>
            <div className={styles.snapshotLabel}>Email</div>
            <div>{profileEmail || "-"}</div>
            <div className={styles.snapshotLabel}>Location</div>
            <div>{locationLabel || "-"}</div>
          </div>
          <div className={styles.tipText}>
            Tip: keep your response time low and your trip descriptions detailed. High quality content and fast replies
            lead to more confirmed bookings.
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>Next steps</div>
          <ul className={styles.nextList}>
            <li>Complete your company profile fully.</li>
            <li>Add your top trips (5–8 day safaris).</li>
            <li>Reply quickly to new quote requests and messages.</li>
            <li>Share your unique story and values.</li>
          </ul>
          <div>
            <button
              type="button"
              onClick={() => {
                if (isApproved) router.push("/trips");
              }}
              disabled={!isApproved}
              className={isApproved ? styles.cta : styles.ctaDisabled}
            >
              {isApproved ? "Add a new trip →" : "Awaiting approval"}
            </button>
          </div>
        </div>
      </section>

      {showMessagesPopup && (
        <div className={styles.modalOverlay} onClick={() => setShowMessagesPopup(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div>
                <div className={styles.modalLabel}>Messages inbox</div>
                <h3 className={styles.modalTitle}>Unread messages from travellers</h3>
                <p className={styles.modalSub}>
                  {messageThreadsCount === 0
                    ? "No unread conversations right now."
                    : `${messageThreadsCount} unread conversation${messageThreadsCount === 1 ? "" : "s"}`}
                </p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => setShowMessagesPopup(false)}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {messageThreads.length === 0 ? (
                <div className={styles.threadMeta}>
                  When travellers send new messages on your quotes, the conversations with unread messages will appear here.
                </div>
              ) : (
                messageThreads.map((t) => (
                  <Link
                    key={t.quote_id}
                    href={`/quotes?quote_id=${encodeURIComponent(t.quote_id)}`}
                    onClick={() => {
                      markQuoteSeen(t.quote_id);
                      setShowMessagesPopup(false);
                    }}
                    className={styles.threadCard}
                  >
                    <div className={styles.threadTitle}>
                      Safari enquiry ({t.travel_start_date ? formatDateShort(t.travel_start_date) : "Dates not set"})
                    </div>
                    <p className={styles.threadMeta}>Last message from traveller</p>
                    <div style={{ textAlign: "right" }}>
                      {t.status && (
                        <span
                          className={
                            normaliseStatus(t.status) === "answered"
                              ? `${styles.threadStatus} ${styles.threadStatusAnswered}`
                              : `${styles.threadStatus} ${styles.threadStatusPending}`
                          }
                        >
                          {formatStatus(t.status)}
                        </span>
                      )}
                      <div className={styles.threadMeta}>{formatDateShort(t.last_message_at)}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className={styles.modalFooter}>
              <span>Tap a conversation to go directly to that enquiry chat.</span>
              <Link href="/quotes" onClick={() => setShowMessagesPopup(false)}>
                View all quotes →
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
