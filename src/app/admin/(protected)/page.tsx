// src/app/admin/(protected)/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminLogoutButton from "@/components/AdminLogoutButton";

/* ================== THEME ================== */

const BRAND = {
  ink: "#0E2430",
  primary: "#1B4D3E",
  sand: "#F4F3ED",
  border: "#E1E5ED",
  muted: "#6b7280",
  panel: "#ffffff",
  soft: "#f9fafb",
};

/* ================== TYPES ================== */

type OperatorRow = {
  id: string;
  name: string | null;
  country: string | null;
  created_at: string | null;
  status?: string | null;
};

type TripRow = {
  id: string;
  title: string | null;
  created_at: string | null;
};

type BookingRow = {
  id: string;
  traveller_name: string | null;
  operator_company_name: string | null;
  total_price: number | null;
  currency: string | null;
  status: string | null;
  created_at: string | null;
};

type PaymentRow = {
  id: string;
  booking_code: string | null;
  operator_company_name: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  payment_method: string | null;
  created_at: string | null;
};

type QuoteRequestRow = {
  id: string;
  trip_title: string | null;
  traveller_name: string | null;
  pax: number | null;
  created_at: string | null;
};

/* ================== HELPERS ================== */

function formatCurrency(amount: number | null | undefined, currency = "USD") {
  const value = amount ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ================== PAGE ================== */

export default function AdminDashboardPage() {
  return <AdminDashboardContent />;
}

function AdminDashboardContent() {
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [operatorsCount, setOperatorsCount] = useState(0);

  const [trips, setTrips] = useState<TripRow[]>([]);
  const [tripsCount, setTripsCount] = useState(0);

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [bookingsCount, setBookingsCount] = useState(0);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  const [quotes, setQuotes] = useState<QuoteRequestRow[]>([]);
  const [quotesLast24hCount, setQuotesLast24hCount] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const now = new Date();
        const last24h = new Date(
          now.getTime() - 24 * 60 * 60 * 1000
        ).toISOString();

        const [
          operatorsRes,
          tripsRes,
          bookingsRes,
          paymentsRes,
          quotesRes,
        ] = await Promise.all([
          supabase
            .from("operators_view")
            .select("id, name, country, created_at, status", {
              count: "exact",
            })
            .order("created_at", { ascending: false })
            .limit(5),

          supabase
            .from("trips")
            .select("id, title, created_at", { count: "exact" })
            .order("created_at", { ascending: false })
            .limit(5),

          // BOOKINGS: no booking_code here, only existing columns
          supabase
            .from("bookings")
            .select(
              "id, traveller_name, operator_company_name, total_price, currency, status, created_at",
              { count: "exact" }
            )
            .order("created_at", { ascending: false })
            .limit(5),

          supabase
            .from("payments")
            .select(
              "id, booking_code, operator_company_name, amount, currency, status, payment_method, created_at",
              { count: "exact" }
            )
            .in("status", ["submitted", "pending"])
            .order("created_at", { ascending: false })
            .limit(5),

          supabase
            .from("quote_requests")
            .select("id, trip_title, traveller_name, pax, created_at", {
              count: "exact",
            })
            .gte("created_at", last24h)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        if (operatorsRes.error) throw operatorsRes.error;
        if (tripsRes.error) throw tripsRes.error;
        if (bookingsRes.error) throw bookingsRes.error;
        if (paymentsRes.error) throw paymentsRes.error;
        if (quotesRes.error) throw quotesRes.error;

        const opData = (operatorsRes.data || []) as OperatorRow[];
        setOperators(opData);
        setOperatorsCount(
          typeof operatorsRes.count === "number"
            ? operatorsRes.count
            : opData.length
        );

        const tripsData = (tripsRes.data || []) as TripRow[];
        setTrips(tripsData);
        setTripsCount(
          typeof tripsRes.count === "number"
            ? tripsRes.count
            : tripsData.length
        );

        const bookingsData = (bookingsRes.data || []) as BookingRow[];
        setBookings(bookingsData);
        setBookingsCount(
          typeof bookingsRes.count === "number"
            ? bookingsRes.count
            : bookingsData.length
        );

        const paymentsData = (paymentsRes.data || []) as PaymentRow[];
        setPayments(paymentsData);
        setPendingPaymentsCount(
          typeof paymentsRes.count === "number"
            ? paymentsRes.count
            : paymentsData.length
        );

        const quotesData = (quotesRes.data || []) as QuoteRequestRow[];
        setQuotes(quotesData);
        setQuotesLast24hCount(
          typeof quotesRes.count === "number"
            ? quotesRes.count
            : quotesData.length
        );
      } catch (err: any) {
        console.error("admin dashboard load error:", err);
        setError(
          err?.message ||
            "Failed to load admin dashboard data. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const marketplaceStatus = useMemo(() => {
    if (bookingsCount > 0 && tripsCount > 0) return "Live & booking";
    if (tripsCount > 0) return "Live & growing";
    return "Warming up";
  }, [tripsCount, bookingsCount]);

  const NAV = useMemo(
    () => [
      {
        href: "/",
        label: "Dashboard",
        desc: "Overview & latest activity",
      },
      {
        href: "/operators-overview",
        label: "Operators overview",
        desc: "Status, trips, approvals",
      },
      {
        href: "/operators",
        label: "Operators list",
        desc: "Table view & actions",
      },
      {
        href: "/bookings",
        label: "Bookings",
        desc: "Monitor booking flow",
      },
      {
        href: "/payments",
        label: "Payments",
        desc: "Verification & payouts",
      },
      {
        href: "/support",
        label: "Support",
        desc: "Inbox & ticket triage",
      },
      {
        href: "/analytics",
        label: "Analytics",
        desc: "KPIs & trends",
      },
    ],
    []
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: BRAND.sand,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "26px 16px 40px",
        }}
      >
        {/* ======== TOP BAR ======== */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                backgroundColor: BRAND.primary,
                boxShadow: "0 0 0 6px rgba(27, 77, 62, 0.12)",
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: BRAND.muted,
                }}
              >
                Admin panel
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: BRAND.ink,
                  marginTop: 2,
                }}
              >
                Control center
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Quick links */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <QuickLink href="/operators">Operators</QuickLink>
              <QuickLink href="/support">Support</QuickLink>
              <QuickLink href="/bookings">Bookings</QuickLink>
              <QuickLink href="/payments">Payments</QuickLink>
              <QuickLink href="/analytics">Analytics</QuickLink>
            </div>

            <div style={{ marginLeft: 6 }}>
              <AdminLogoutButton />
            </div>
          </div>
        </div>

        {/* ======== LAYOUT: SIDEBAR + CONTENT ======== */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* SIDEBAR */}
          <aside
            style={{
              backgroundColor: BRAND.panel,
              border: `1px solid ${BRAND.border}`,
              borderRadius: 20,
              padding: 14,
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
              position: "sticky",
              top: 16,
            }}
          >
            <div
              style={{
                padding: "12px 12px 14px",
                borderRadius: 16,
                background:
                  "linear-gradient(135deg, #1B4D3E 0%, #2E7D5E 100%)",
                color: "#fff",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                Safari Connector
              </div>
              <div
                style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}
              >
                Admin access only. Use the links below to manage
                platform operations.
              </div>
            </div>

            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: BRAND.muted,
                padding: "6px 10px",
                marginBottom: 6,
              }}
            >
              Navigation
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: "none",
                      padding: "10px 10px",
                      borderRadius: 14,
                      border: `1px solid ${
                        active ? "rgba(27, 77, 62, 0.35)" : BRAND.border
                      }`,
                      backgroundColor: active
                        ? "rgba(27, 77, 62, 0.08)"
                        : BRAND.soft,
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        marginTop: 4,
                        backgroundColor: active
                          ? BRAND.primary
                          : "#CBD5E1",
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: BRAND.ink,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: BRAND.muted,
                          marginTop: 2,
                        }}
                      >
                        {item.desc}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 12,
                borderTop: `1px solid ${BRAND.border}`,
                paddingTop: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: BRAND.muted,
                  padding: "0 10px",
                  marginBottom: 8,
                }}
              >
                Snapshot
              </div>

              <div
                style={{
                  backgroundColor: "#fff",
                  border: `1px solid ${BRAND.border}`,
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <SnapshotRow
                  label="Total operators"
                  value={operatorsCount.toLocaleString("en-US")}
                />
                <SnapshotRow
                  label="Total trips"
                  value={tripsCount.toLocaleString("en-US")}
                />
                <SnapshotRow
                  label="Total bookings"
                  value={bookingsCount.toLocaleString("en-US")}
                />
                <SnapshotRow
                  label="Payments pending"
                  value={pendingPaymentsCount.toLocaleString("en-US")}
                />
                <SnapshotRow
                  label="Quotes (last 24h)"
                  value={quotesLast24hCount.toLocaleString("en-US")}
                />
                <SnapshotRow
                  label="Marketplace status"
                  value={marketplaceStatus}
                />
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main>
            {/* HERO */}
            <section
              style={{
                backgroundColor: BRAND.panel,
                border: `1px solid ${BRAND.border}`,
                borderRadius: 20,
                padding: "18px 18px",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ maxWidth: 620 }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 30,
                      lineHeight: 1.15,
                      fontWeight: 800,
                      color: BRAND.primary,
                    }}
                  >
                    Admin control center
                  </h1>
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "#4b5563",
                    }}
                  >
                    Monitor operators, trips, bookings, quotes, payments
                    and support activity across Safari Connector. Use this
                    dashboard for high-level visibility, then drill down
                    into detailed pages.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <PrimaryAction href="/operators-overview">
                    Operators overview
                  </PrimaryAction>
                  <SecondaryAction href="/payments">
                    Payments
                  </SecondaryAction>
                  <SecondaryAction href="/bookings">
                    Bookings
                  </SecondaryAction>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    borderRadius: 14,
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}
            </section>

            {/* METRICS */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <MetricCard
                title="Operators"
                value={operatorsCount.toLocaleString("en-US")}
                note="Registered companies"
                href="/operators"
                linkLabel="Open operators →"
              />
              <MetricCard
                title="Trips in marketplace"
                value={tripsCount.toLocaleString("en-US")}
                note="Trips powering the public marketplace"
                href="/analytics"
                linkLabel="View analytics →"
              />
              <MetricCard
                title="Total bookings"
                value={bookingsCount.toLocaleString("en-US")}
                note="All bookings recorded in the system"
                href="/bookings"
                linkLabel="Open bookings →"
              />
              <MetricCard
                title="Payments pending"
                value={pendingPaymentsCount.toLocaleString("en-US")}
                note="Payments awaiting verification or processing"
                href="/payments"
                linkLabel="Review payments →"
                variant="primary"
              />
            </section>

            {/* LATEST LISTS / QUEUES */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(360px, 1fr))",
                gap: 12,
              }}
            >
              {/* Latest operators */}
              <PanelCard
                title="Latest operators"
                subtitle="Recently created or updated suppliers."
                href="/operators-overview"
                hrefLabel="View overview →"
              >
                {loading ? (
                  <EmptyState>Loading operators…</EmptyState>
                ) : operators.length === 0 ? (
                  <EmptyState>
                    No operators have been registered yet.
                  </EmptyState>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {operators.map((op) => (
                      <Row key={op.id}>
                        <div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: BRAND.ink,
                            }}
                          >
                            {op.name || "Unnamed operator"}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: BRAND.muted,
                              marginTop: 2,
                            }}
                          >
                            {op.country || "Country not set"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#9ca3af",
                              marginTop: 2,
                            }}
                          >
                            {op.created_at
                              ? `Joined ${new Date(
                                  op.created_at
                                ).toLocaleDateString()}`
                              : "Joined date unknown"}
                          </div>
                        </div>

                        <Link
                          href={`/admin/operators/${op.id}`}
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#065f46",
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          View →
                        </Link>
                      </Row>
                    ))}
                  </div>
                )}
              </PanelCard>

              {/* Latest trips */}
              <PanelCard
                title="Latest trips"
                subtitle="New itineraries in the public marketplace."
              >
                {loading ? (
                  <EmptyState>Loading trips…</EmptyState>
                ) : trips.length === 0 ? (
                  <EmptyState>
                    No trips have been listed yet.
                  </EmptyState>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {trips.map((trip) => (
                      <Row key={trip.id}>
                        <div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: BRAND.ink,
                            }}
                          >
                            {trip.title || "Untitled trip"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#9ca3af",
                              marginTop: 2,
                            }}
                          >
                            {trip.created_at
                              ? `Created ${new Date(
                                  trip.created_at
                                ).toLocaleDateString()}`
                              : "Created date not available"}
                          </div>
                        </div>

                        <Link
                          href={`/trips/${trip.id}`}
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#065f46",
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          View →
                        </Link>
                      </Row>
                    ))}
                  </div>
                )}
              </PanelCard>

              {/* Recent bookings + payments / quotes */}
              <PanelCard
                title="Recent bookings & payments"
                subtitle="Latest traveller activity and payment queue."
                href="/bookings"
                hrefLabel="Go to bookings →"
              >
                {/* Bookings */}
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: BRAND.muted,
                    marginBottom: 4,
                  }}
                >
                  Bookings
                </div>
                {loading ? (
                  <EmptyState>Loading bookings…</EmptyState>
                ) : bookings.length === 0 ? (
                  <EmptyState>No bookings yet.</EmptyState>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {bookings.map((b) => (
                      <Row key={b.id}>
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: BRAND.ink,
                            }}
                          >
                            {b.id
                              ? `Booking ${b.id.slice(0, 8)}`
                              : "Booking"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: BRAND.muted,
                              marginTop: 2,
                            }}
                          >
                            {b.traveller_name || "Traveller n/a"} ·{" "}
                            {b.operator_company_name ||
                              "Operator n/a"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#9ca3af",
                              marginTop: 2,
                            }}
                          >
                            {b.status || "Status n/a"} ·{" "}
                            {b.created_at
                              ? formatDateTime(b.created_at)
                              : "Time n/a"}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: BRAND.primary,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatCurrency(
                            b.total_price,
                            b.currency || "USD"
                          )}
                        </div>
                      </Row>
                    ))}
                  </div>
                )}

                {/* Payments */}
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: BRAND.muted,
                    marginTop: 10,
                    marginBottom: 4,
                  }}
                >
                  Payment verification
                </div>
                {loading ? (
                  <EmptyState>Loading payments…</EmptyState>
                ) : payments.length === 0 ? (
                  <EmptyState>
                    No payments waiting for verification.
                  </EmptyState>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {payments.map((p) => (
                      <Row key={p.id}>
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: BRAND.ink,
                            }}
                          >
                            {p.booking_code || "Booking"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: BRAND.muted,
                              marginTop: 2,
                            }}
                          >
                            {p.operator_company_name ||
                              "Operator n/a"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#9ca3af",
                              marginTop: 2,
                            }}
                          >
                            {p.payment_method || "Method n/a"} ·{" "}
                            {p.created_at
                              ? formatDateTime(p.created_at)
                              : "Time n/a"}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: BRAND.primary,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatCurrency(
                            p.amount,
                            p.currency || "USD"
                          )}
                        </div>
                      </Row>
                    ))}
                  </div>
                )}

                {/* Quotes */}
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: BRAND.muted,
                    marginTop: 10,
                    marginBottom: 4,
                  }}
                >
                  Quote requests (24h)
                </div>
                {loading ? (
                  <EmptyState>Loading quotes…</EmptyState>
                ) : quotes.length === 0 ? (
                  <EmptyState>
                    No new quotes in the last 24 hours.
                  </EmptyState>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {quotes.map((q) => (
                      <Row key={q.id}>
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: BRAND.ink,
                            }}
                          >
                            {q.trip_title || "Trip enquiry"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: BRAND.muted,
                              marginTop: 2,
                            }}
                          >
                            {q.traveller_name || "Traveller n/a"} ·{" "}
                            {q.pax ? `${q.pax} pax` : "pax n/a"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#9ca3af",
                              marginTop: 2,
                            }}
                          >
                            {q.created_at
                              ? formatDateTime(q.created_at)
                              : "Time n/a"}
                          </div>
                        </div>
                      </Row>
                    ))}
                  </div>
                )}
              </PanelCard>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ================== UI PRIMITIVES ================== */

function QuickLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "#065f46",
        textDecoration: "none",
        padding: "8px 10px",
        borderRadius: 999,
        border: `1px solid ${BRAND.border}`,
        backgroundColor: "#fff",
      }}
    >
      {children}
    </Link>
  );
}

function PrimaryAction({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        padding: "10px 14px",
        borderRadius: 999,
        backgroundColor: BRAND.primary,
        color: "#fff",
        fontSize: 13,
        fontWeight: 800,
        border: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      {children}
    </Link>
  );
}

function SecondaryAction({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        padding: "10px 14px",
        borderRadius: 999,
        backgroundColor: "#fff",
        color: BRAND.ink,
        fontSize: 13,
        fontWeight: 800,
        border: `1px solid ${BRAND.border}`,
      }}
    >
      {children}
    </Link>
  );
}

function MetricCard(props: {
  title: string;
  value: string;
  note: string;
  href: string;
  linkLabel: string;
  variant?: "primary" | "default";
}) {
  const { title, value, note, href, linkLabel, variant = "default" } =
    props;
  const isPrimary = variant === "primary";

  return (
    <div
      style={{
        backgroundColor: isPrimary ? "rgba(27, 77, 62, 0.10)" : BRAND.panel,
        border: `1px solid ${
          isPrimary ? "rgba(27, 77, 62, 0.25)" : BRAND.border
        }`,
        borderRadius: 20,
        padding: "16px 16px",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: BRAND.muted,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 28,
          fontWeight: 900,
          color: isPrimary ? BRAND.primary : BRAND.ink,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>

      <div style={{ marginTop: 6, fontSize: 12, color: BRAND.muted }}>
        {note}
      </div>

      <div style={{ marginTop: 12 }}>
        <Link
          href={href}
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#065f46",
            textDecoration: "none",
          }}
        >
          {linkLabel}
        </Link>
      </div>
    </div>
  );
}

function PanelCard(props: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  href?: string;
  hrefLabel?: string;
}) {
  const { title, subtitle, children, href, hrefLabel } = props;

  return (
    <div
      style={{
        backgroundColor: BRAND.panel,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 20,
        padding: "14px 14px",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{ fontSize: 14, fontWeight: 900, color: BRAND.ink }}
          >
            {title}
          </div>
          <div
            style={{ fontSize: 12, color: BRAND.muted, marginTop: 2 }}
          >
            {subtitle}
          </div>
        </div>

        {href && hrefLabel ? (
          <Link
            href={href}
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#065f46",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {hrefLabel}
          </Link>
        ) : null}
      </div>

      <div
        style={{
          borderTop: `1px solid ${BRAND.border}`,
          paddingTop: 10,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "10px 4px",
        borderBottom: `1px solid ${BRAND.border}`,
      }}
    >
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        color: "#9ca3af",
        textAlign: "center",
        padding: "18px 0",
      }}
    >
      {children}
    </div>
  );
}

function SnapshotRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 8,
        fontSize: 13,
      }}
    >
      <span style={{ color: BRAND.muted }}>{label}</span>
      <span style={{ fontWeight: 900, color: BRAND.ink }}>{value}</span>
    </div>
  );
}
