"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";

const BRAND = {
  ink: "#0E2430",
  primary: "#1B4D3E",
  sand: "#F4F3ED",
  border: "#E1E5ED",
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

type OperatorRow = {
  id: string;
};

type TripRow = {
  id: string;
};

type QuoteRow = {
  id: string;
  status: string | null;
  replied_at: string | null;
};

type BookingRow = {
  id: string;
  status: string | null;
  total_amount: number | null;
};

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [operatorsCount, setOperatorsCount] = useState(0);
  const [tripsCount, setTripsCount] = useState(0);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [openQuotes, setOpenQuotes] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [completedBookings, setCompletedBookings] = useState(0);
  const [totalBookingValue, setTotalBookingValue] = useState(0);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        // ===== Operators =====
        try {
          const {
            data: opRows,
            count: opCount,
            error: opErr,
          } = await supabase
            .from("operators_view")
            .select("id", { count: "exact" });

          if (opErr) {
            console.warn("analytics operators error:", opErr);
            setOperatorsCount(0);
          } else {
            const ops = (opRows || []) as OperatorRow[];
            setOperatorsCount(
              typeof opCount === "number" ? opCount : ops.length
            );
          }
        } catch (inner) {
          console.warn("analytics operators inner error:", inner);
          setOperatorsCount(0);
        }

        // ===== Trips =====
        try {
          const {
            data: tripRows,
            count: tripCount,
            error: tripErr,
          } = await supabase.from("trips").select("id", { count: "exact" });

          if (tripErr) {
            console.warn("analytics trips error:", tripErr);
            setTripsCount(0);
          } else {
            const trips = (tripRows || []) as TripRow[];
            setTripsCount(
              typeof tripCount === "number" ? tripCount : trips.length
            );
          }
        } catch (inner) {
          console.warn("analytics trips inner error:", inner);
          setTripsCount(0);
        }

        // ===== Quotes =====
        try {
          const {
            data: quoteRows,
            count: quoteCount,
            error: quoteErr,
          } = await supabase
            .from("operator_quotes")
            .select("id, status, replied_at", { count: "exact" });

          if (quoteErr) {
            console.warn("analytics quotes error:", quoteErr);
            setTotalQuotes(0);
            setOpenQuotes(0);
          } else {
            const quotes = (quoteRows || []) as QuoteRow[];
            const tq =
              typeof quoteCount === "number" ? quoteCount : quotes.length;

            const openQ = quotes.filter((q) => {
              const status = (q.status || "").toLowerCase();
              const hasReply = !!q.replied_at;
              if (hasReply) return false;
              if (
                ["answered", "closed", "completed", "cancelled"].includes(
                  status
                )
              )
                return false;
              return true;
            }).length;

            setTotalQuotes(tq);
            setOpenQuotes(openQ);
          }
        } catch (inner) {
          console.warn("analytics quotes inner error:", inner);
          setTotalQuotes(0);
          setOpenQuotes(0);
        }

        // ===== Bookings =====
        try {
          const {
            data: bookingRows,
            count: bookingCount,
            error: bkErr,
          } = await supabase
            .from("bookings")
            .select("id, status, total_amount", { count: "exact" });

          if (bkErr) {
            console.warn("analytics bookings error:", bkErr);
            setTotalBookings(0);
            setCompletedBookings(0);
            setTotalBookingValue(0);
          } else {
            const bookings = (bookingRows || []) as BookingRow[];
            const tb =
              typeof bookingCount === "number"
                ? bookingCount
                : bookings.length;
            const completed = bookings.filter(
              (b) => (b.status || "").toLowerCase() === "completed"
            ).length;
            const totalValue = bookings.reduce((sum, b) => {
              if (!b.total_amount) return sum;
              return sum + Number(b.total_amount);
            }, 0);

            setTotalBookings(tb);
            setCompletedBookings(completed);
            setTotalBookingValue(totalValue);
          }
        } catch (inner) {
          console.warn("analytics bookings inner error:", inner);
          setTotalBookings(0);
          setCompletedBookings(0);
          setTotalBookingValue(0);
        }
      } catch (err: any) {
        // Hii itakua rare sana sasa
        console.error("unexpected admin analytics error:", err);
        setError(
          err?.message || "Failed to load analytics. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

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
                fontSize: "2.1rem",
                lineHeight: 1.1,
                fontWeight: 600,
                color: BRAND.primary,
                marginBottom: 8,
              }}
            >
              Platform analytics
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "#4b5563",
                maxWidth: 520,
              }}
            >
              High-level view of Safari Connector performance – operators,
              supply, quotes and bookings. Numbers will show as 0 if a data
              source is unavailable.
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <Link
              href="/"
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
              ← Back to admin
            </Link>
            <div style={{ marginTop: 6 }}>
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

        {loading ? (
          <p
            style={{
              fontSize: 14,
              color: "#9ca3af",
              textAlign: "center",
              padding: "16px 0",
            }}
          >
            Loading analytics…
          </p>
        ) : (
          <>
            {/* TOP CARDS */}
            <section style={{ ...grid3Style, marginBottom: 24 }}>
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
                    fontSize: 28,
                    fontWeight: 600,
                    color: BRAND.primary,
                    marginBottom: 2,
                  }}
                >
                  {operatorsCount.toLocaleString("en-US")}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  Suppliers currently registered on Safari Connector.
                </p>
              </div>

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
                    fontSize: 28,
                    fontWeight: 600,
                    color: BRAND.primary,
                    marginBottom: 2,
                  }}
                >
                  {tripsCount.toLocaleString("en-US")}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  Itineraries available for travellers to book.
                </p>
              </div>

              <div style={cardStyle}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: BRAND.ink,
                    marginBottom: 4,
                  }}
                >
                  Quotes overview
                </p>
                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: BRAND.primary,
                    marginBottom: 2,
                  }}
                >
                  {totalQuotes.toLocaleString("en-US")}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  {openQuotes.toLocaleString("en-US")} open quotes with no
                  recorded answer.
                </p>
              </div>
            </section>

            {/* BOOKINGS CARDS */}
            <section style={{ ...grid3Style }}>
              <div style={cardStyle}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: BRAND.ink,
                    marginBottom: 4,
                  }}
                >
                  Total bookings
                </p>
                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: BRAND.primary,
                    marginBottom: 2,
                  }}
                >
                  {totalBookings.toLocaleString("en-US")}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  Completed:{" "}
                  {completedBookings.toLocaleString("en-US")} bookings (all
                  currencies).
                </p>
              </div>

              <div style={cardStyle}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: BRAND.ink,
                    marginBottom: 4,
                  }}
                >
                  Booking value (rough)
                </p>
                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: BRAND.primary,
                    marginBottom: 2,
                  }}
                >
                  {totalBookingValue.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  Sum of <code>total_amount</code> across all bookings.
                </p>
              </div>

              <div style={cardStyle}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: BRAND.ink,
                    marginBottom: 4,
                  }}
                >
                  Health check
                </p>
                <ul
                  style={{
                    paddingLeft: 18,
                    margin: 0,
                    fontSize: 13,
                    color: "#374151",
                  }}
                >
                  <li>
                    If operators &gt; 0 and trips &gt; 0 → supply is live.
                  </li>
                  <li>
                    Quotes &gt; 0 → travellers are sending requests.
                  </li>
                  <li>
                    Bookings &gt; 0 → marketplace is monetizable.
                  </li>
                </ul>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
