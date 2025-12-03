"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AdminLogoutButton from "@/components/AdminLogoutButton";

const BRAND = {
  ink: "#0E2430",
  primary: "#1B4D3E",
  sand: "#F4F3ED",
  border: "#E1E5ED",
};

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

const pageWrapper: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: BRAND.sand,
};

const containerStyle: CSSProperties = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "48px 16px 40px",
};

const cardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 24,
  padding: "20px 24px",
  boxShadow: "0 8px 30px rgba(15, 23, 42, 0.06)",
  border: `1px solid ${BRAND.border}`,
};

const grid3Style: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

const grid2Style: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [operatorsCount, setOperatorsCount] = useState(0);

  const [trips, setTrips] = useState<TripRow[]>([]);
  const [tripsCount, setTripsCount] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        // ================== OPERATORS ==================
        const {
          data: opRows,
          count: opCount,
          error: opError,
        } = await supabase
          .from("operators_view")
          .select("id, name, country, created_at, status", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(5);

        if (opError) throw opError;

        const opData = (opRows || []) as OperatorRow[];
        setOperators(opData);
        setOperatorsCount(
          typeof opCount === "number" ? opCount : opData.length
        );

        // ================== TRIPS (PUBLIC MARKETPLACE) ==================
        const {
          data: tripRows,
          count: tripCount,
          error: tripError,
        } = await supabase
          .from("trips")
          .select("id, title, created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(5);

        if (tripError) throw tripError;

        const tripsData = (tripRows || []) as TripRow[];
        setTrips(tripsData);
        setTripsCount(
          typeof tripCount === "number" ? tripCount : tripsData.length
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

  const marketplaceStatus =
    tripsCount > 0 ? "Live & growing" : "Warming up";

  return (
    <div style={pageWrapper}>
      <div style={containerStyle}>
        {/* HEADER */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "2.4rem",
                lineHeight: 1.1,
                fontWeight: 600,
                color: BRAND.primary,
                marginBottom: 8,
              }}
            >
              Admin control center
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "#4b5563",
                maxWidth: 540,
              }}
            >
              Monitor operators, trips, bookings, quotes and support activity
              across Safari Connector. Use this panel as your starting point,
              then drill down into detailed dashboards.
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#6b7280",
                marginBottom: 4,
              }}
            >
              Quick links
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Link
                href="/admin/operators-overview"
                style={{
                  fontSize: 13,
                  color: "#065f46",
                  textDecoration: "none",
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${BRAND.border}`,
                  backgroundColor: "#ffffff",
                }}
              >
                Operators overview →
              </Link>
              <Link
                href="/admin/operators"
                style={{
                  fontSize: 13,
                  color: "#065f46",
                  textDecoration: "none",
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${BRAND.border}`,
                  backgroundColor: "#ffffff",
                }}
              >
                Operators list →
              </Link>
              <Link
                href="/admin/support"
                style={{
                  fontSize: 13,
                  color: "#065f46",
                  textDecoration: "none",
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${BRAND.border}`,
                  backgroundColor: "#ffffff",
                }}
              >
                Support inbox →
              </Link>
              <Link
                href="/admin/bookings"
                style={{
                  fontSize: 13,
                  color: "#065f46",
                  textDecoration: "none",
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${BRAND.border}`,
                  backgroundColor: "#ffffff",
                }}
              >
                Bookings →
              </Link>
              <Link
                href="/admin/analytics"
                style={{
                  fontSize: 13,
                  color: "#065f46",
                  textDecoration: "none",
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${BRAND.border}`,
                  backgroundColor: "#ffffff",
                }}
              >
                Analytics →
              </Link>
            </div>

            <div style={{ marginTop: 10 }}>
              <AdminLogoutButton />
            </div>
          </div>
        </header>

        {error && (
          <div
            style={{
              ...cardStyle,
              borderColor: "#fecaca",
              backgroundColor: "#fef2f2",
              color: "#b91c1c",
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 14 }}>{error}</p>
          </div>
        )}

        {/* TOP STATS CARDS */}
        <section style={{ ...grid3Style, marginBottom: 24 }}>
          {/* Operators card */}
          <div style={cardStyle}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 4,
              }}
            >
              Operators
            </p>
            <p
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: BRAND.primary,
                marginBottom: 2,
              }}
            >
              {operatorsCount.toLocaleString("en-US")}
            </p>
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
              Companies currently registered on Safari Connector.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Link
                href="/admin/operators-overview"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#065f46",
                  textDecoration: "none",
                }}
              >
                Go to operators overview →
              </Link>
              <Link
                href="/admin/operators"
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  textDecoration: "none",
                }}
              >
                Open operators list →
              </Link>
            </div>
          </div>

          {/* Trips card (metric only) */}
          <div style={cardStyle}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 4,
              }}
            >
              Trips in marketplace
            </p>
            <p
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: BRAND.primary,
                marginBottom: 2,
              }}
            >
              {tripsCount.toLocaleString("en-US")}
            </p>
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              Trips from the main <code>trips</code> table powering the public
              marketplace.
            </p>
          </div>

          {/* Admin tools card */}
          <div style={cardStyle}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 4,
              }}
            >
              Admin tools
            </p>
            <p
              style={{
                fontSize: 12,
                color: "#4b5563",
                marginBottom: 12,
              }}
            >
              Use these admin flows to keep the platform trusted, neutral and
              responsive.
            </p>
            <ul
              style={{
                paddingLeft: 18,
                margin: 0,
                fontSize: 13,
                color: "#374151",
                listStyle: "disc",
              }}
            >
              <li>Approve or reject new operator applications.</li>
              <li>Monitor operator trip supply and responsiveness.</li>
              <li>Moderate support tickets and bookings as needed.</li>
            </ul>
          </div>
        </section>

        {/* SECOND ROW: snapshot + navigation */}
        <section style={{ ...grid2Style, marginBottom: 24 }}>
          {/* Platform snapshot */}
          <div style={cardStyle}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 12,
              }}
            >
              Platform snapshot
            </p>
            <div style={{ fontSize: 14 }}>
              <SnapshotRow
                label="Total operators"
                value={operatorsCount.toLocaleString("en-US")}
              />
              <SnapshotRow
                label="Total trips"
                value={tripsCount.toLocaleString("en-US")}
              />
              <SnapshotRow label="Marketplace status" value={marketplaceStatus} />
            </div>
          </div>

          {/* Admin navigation */}
          <div style={cardStyle}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 12,
              }}
            >
              Admin navigation
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#4b5563",
                marginBottom: 12,
              }}
            >
              Start from here, then move into operator-level dashboards, support
              inbox, bookings and analytics as needed.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 13,
              }}
            >
              <NavLink
                href="/admin/operators-overview"
                label="Operators overview"
                description="See all operators, their trips and application status."
              />
              <NavLink
                href="/admin/operators"
                label="Operators list"
                description="Table view of all operators (CRUD, approvals, edits)."
              />
              <NavLink
                href="/admin/support"
                label="Support inbox"
                description="See and triage support tickets from travellers and operators."
              />
              <NavLink
                href="/admin/bookings"
                label="Bookings"
                description="Monitor bookings and update their status."
              />
              <NavLink
                href="/admin/analytics"
                label="Platform analytics"
                description="High-level KPIs across operators, trips, quotes and bookings."
              />
            </div>
          </div>
        </section>

        {/* THIRD ROW: latest activity */}
        <section style={grid2Style}>
          {/* Latest operators */}
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: BRAND.ink,
                  }}
                >
                  Latest operators
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  Recently created or updated suppliers.
                </p>
              </div>
              <Link
                href="/admin/operators-overview"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#065f46",
                  textDecoration: "none",
                }}
              >
                View overview →
              </Link>
            </div>

            {loading ? (
              <p
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                Loading operators…
              </p>
            ) : operators.length === 0 ? (
              <p
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                No operators have been registered yet.
              </p>
            ) : (
              operators.map((op) => (
                <div
                  key={op.id}
                  style={{
                    padding: "10px 0",
                    borderTop: `1px solid ${BRAND.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: BRAND.ink,
                      }}
                    >
                      {op.name || "Unnamed operator"}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      {op.country || "Country not set"}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                      }}
                    >
                      {op.created_at
                        ? `Joined ${new Date(
                            op.created_at
                          ).toLocaleDateString()}`
                        : "Joined date unknown"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Link
                      href={`/admin/operators/${op.id}`}
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#065f46",
                        textDecoration: "none",
                      }}
                    >
                      View operator dashboard →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Latest trips (read-only overview from `trips`) */}
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: BRAND.ink,
                  }}
                >
                  Latest trips
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  New itineraries being added to the public marketplace.
                </p>
              </div>
            </div>

            {loading ? (
              <p
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                Loading trips…
              </p>
            ) : trips.length === 0 ? (
              <p
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                No trips have been listed yet.
              </p>
            ) : (
              trips.map((trip) => (
                <div
                  key={trip.id}
                  style={{
                    padding: "10px 0",
                    borderTop: `1px solid ${BRAND.border}`,
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: BRAND.ink,
                    }}
                  >
                    {trip.title || "Untitled trip"}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                    }}
                  >
                    {trip.created_at
                      ? `Created ${new Date(
                          trip.created_at
                        ).toLocaleDateString()}`
                      : "Created date not available"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ========= SMALL COMPONENTS ========= */

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 6,
        fontSize: 14,
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 600, color: BRAND.ink }}>{value}</span>
    </div>
  );
}

function NavLink(props: {
  href: string;
  label: string;
  description: string;
}) {
  const { href, label, description } = props;
  return (
    <Link
      href={href}
      style={{
        display: "block",
        textDecoration: "none",
        padding: "8px 10px",
        borderRadius: 16,
        border: `1px solid ${BRAND.border}`,
        backgroundColor: "#f9fafb",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: BRAND.ink,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{description}</div>
    </Link>
  );
}
