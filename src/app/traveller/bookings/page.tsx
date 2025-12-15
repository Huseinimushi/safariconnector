// src/app/traveller/bookings/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useBookingsLive } from "@/hooks/useBookingsLive";

/* ---------- Types ---------- */

type BookingRow = {
  id: string;
  trip_id: string | null;
  traveller_id: string | null;
  operator_id: string | null;
  quote_id: string | null;
  status: string | null; // pending_payment / confirmed / cancelled
  date_from: string | null;
  date_to: string | null;
  pax: number | null;
  total_amount: number | null;
  currency: string | null;
  payment_status: string | null; // unpaid / deposit_paid / paid_in_full
  created_at: string | null;
  meta?: any | null; // JSONB – tunaitegemea kwa traveller_email, trip_title, operator_name, etc.
};

/* ---------- Helpers ---------- */

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

const formatDateRange = (from: string | null, to: string | null) => {
  if (!from && !to) return "-";
  if (from && !to) return formatDateShort(from);
  if (!from && to) return formatDateShort(to);
  if (from === to) return formatDateShort(from);
  return `${formatDateShort(from)} – ${formatDateShort(to)}`;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const bookingStatusLabel = (status?: string | null) => {
  const s = (status || "pending_payment").toLowerCase();
  switch (s) {
    case "pending_payment":
      return "Awaiting confirmation";
    case "confirmed":
      return "Confirmed booking";
    case "cancelled":
      return "Cancelled";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

const bookingStatusColors = (status?: string | null) => {
  const s = (status || "pending_payment").toLowerCase();
  if (s === "confirmed") {
    return {
      bg: "#ECFDF5",
      border: "1px solid #BBF7D0",
      color: "#166534",
    };
  }
  if (s === "cancelled") {
    return {
      bg: "#FEF2F2",
      border: "1px solid #FECACA",
      color: "#B91C1C",
    };
  }
  return {
    bg: "#EFF6FF",
    border: "1px solid #BFDBFE",
    color: "#1D4ED8",
  };
};

const paymentStatusLabel = (status?: string | null) => {
  const s = (status || "unpaid").toLowerCase();
  switch (s) {
    case "unpaid":
      return "Unpaid";
    case "deposit_paid":
      return "Deposit paid";
    case "paid_in_full":
      return "Payment received";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

const paymentStatusColors = (status?: string | null) => {
  const s = (status || "unpaid").toLowerCase();
  if (s === "paid_in_full") {
    return {
      bg: "#ECFDF5",
      border: "1px solid #BBF7D0",
      color: "#166534",
    };
  }
  if (s === "deposit_paid") {
    return {
      bg: "#FEF9C3",
      border: "1px solid #FEF08A",
      color: "#854D0E",
    };
  }
  return {
    bg: "#F3F4F6",
    border: "1px solid #E5E7EB",
    color: "#4B5563",
  };
};

/* ---------- Component ---------- */

export default function TravellerBookingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  );

  const [travellerId, setTravellerId] = useState<string | null>(null);
  const [travellerEmail, setTravellerEmail] = useState<string | null>(null);

  /* ---------- Load bookings for current traveller (by email in meta) ---------- */

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userResp?.user) {
        console.error("traveller bookings auth error:", userErr);
        setErrorMsg("Please log in to see your bookings.");
        setLoading(false);
        return;
      }

      const user = userResp.user;
      const email =
        (user.email as string) ||
        ((user.user_metadata?.email as string) ?? null);

      setTravellerId(user.id || null);
      setTravellerEmail(email || null);

      if (!email) {
        setErrorMsg("We couldn't find an email on your account.");
        setLoading(false);
        return;
      }

      // Tunatumia meta->traveller_email kama ulivyokuwa unahifadhi kwenye booking
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, trip_id, traveller_id, operator_id, quote_id, status, date_from, date_to, pax, total_amount, currency, payment_status, created_at, meta"
        )
        .contains("meta", { traveller_email: email })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("traveller bookings load error:", error);
        setBookings([]);
        setErrorMsg("Could not load your bookings.");
        setLoading(false);
        return;
      }

      const list = (data || []) as BookingRow[];

      setBookings(list);

      if (list.length > 0) {
        setSelectedBookingId((prev) => prev ?? list[0].id);
      } else {
        setSelectedBookingId(null);
      }
    } catch (err) {
      console.error("traveller bookings exception:", err);
      setErrorMsg("Unexpected error while loading your bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!isMounted) return;
      await load();
    };

    run();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Realtime + polling auto-refresh (traveller scope)
  // Prefer travellerId for realtime filter; also pass travellerEmail to help payload matching if needed.
  useBookingsLive({
    travellerId: travellerId || undefined,
    travellerEmail: travellerEmail || undefined,
    enabled: !!travellerId || !!travellerEmail,
    onChange: () => {
      load();
    },
  });

  const selectedBooking = useMemo(
    () =>
      selectedBookingId == null
        ? null
        : bookings.find((b) => b.id === selectedBookingId) || null,
    [bookings, selectedBookingId]
  );

  const handleOpenDetails = (id: string) => {
    router.push(`/traveller/bookings/${id}`);
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
      {/* Top bar */}
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
            Your bookings
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            See all the safaris you&apos;ve confirmed, check your payment
            status, and review trip details before you travel.
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

      {/* Main layout: list + summary */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 2fr)",
          gap: 20,
        }}
      >
        {/* LEFT – bookings list */}
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
            Bookings
          </div>
          <p
            style={{
              margin: 0,
              marginBottom: 10,
              fontSize: 13,
              color: "#6B7280",
            }}
          >
            Select a booking to see the full details and next steps.
          </p>

          {loading ? (
            <div
              style={{
                marginTop: 20,
                fontSize: 13,
                color: "#6B7280",
              }}
            >
              Loading your bookings...
            </div>
          ) : bookings.length === 0 ? (
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
              You don&apos;t have any bookings yet. Once you accept a quote and
              your safari expert creates your booking, it will appear here.
            </div>
          ) : (
            <div
              style={{
                marginTop: 6,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 440,
                overflowY: "auto",
              }}
            >
              {bookings.map((b) => {
                const isActive =
                  selectedBookingId != null && b.id === selectedBookingId;

                const tripTitle =
                  b.meta?.trip_title || b.meta?.trip_name || "Safari booking";

                const operatorName =
                  b.meta?.operator_name ||
                  b.meta?.company_name ||
                  "Your safari expert";

                const statusStyles = bookingStatusColors(b.status);
                const payStyles = paymentStatusColors(b.payment_status);

                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBookingId(b.id)}
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
                          {tripTitle}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6B7280",
                          }}
                        >
                          with {operatorName}
                        </div>
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            color: "#6B7280",
                          }}
                        >
                          {formatDateRange(b.date_from, b.date_to)} · Travellers{" "}
                          {b.pax ?? "-"}
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
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 4,
                            justifyContent: "flex-end",
                          }}
                        >
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: 999,
                              backgroundColor: statusStyles.bg,
                              color: statusStyles.color,
                              border: statusStyles.border,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {bookingStatusLabel(b.status)}
                          </span>
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: 999,
                              backgroundColor: payStyles.bg,
                              color: payStyles.color,
                              border: payStyles.border,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {paymentStatusLabel(b.payment_status)}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6B7280",
                            marginBottom: 2,
                          }}
                        >
                          Ref{" "}
                          <span style={{ fontFamily: "monospace" }}>
                            {b.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#4B5563",
                          }}
                        >
                          {b.currency || "USD"} {b.total_amount ?? "-"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT – selected booking summary */}
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
          {!selectedBooking || bookings.length === 0 ? (
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
              Select a booking on the left to see more details.
            </div>
          ) : (
            <>
              {/* Header */}
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
                    {selectedBooking.meta?.trip_title ||
                      selectedBooking.meta?.trip_name ||
                      "Safari booking"}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      marginBottom: 6,
                    }}
                  >
                    Booked on{" "}
                    {selectedBooking.created_at
                      ? formatDateTime(selectedBooking.created_at)
                      : "-"}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 32,
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
                        {formatDateRange(
                          selectedBooking.date_from,
                          selectedBooking.date_to
                        )}
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
                        Travellers
                      </div>
                      <div>{selectedBooking.pax ?? "-"}</div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 6,
                    maxWidth: 260,
                  }}
                >
                  {/* Booking status & payment status badges */}
                  {(() => {
                    const statusStyles = bookingStatusColors(
                      selectedBooking.status
                    );
                    const payStyles = paymentStatusColors(
                      selectedBooking.payment_status
                    );
                    return (
                      <>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            backgroundColor: statusStyles.bg,
                            border: statusStyles.border,
                            fontSize: 11,
                            color: statusStyles.color,
                            fontWeight: 600,
                            marginBottom: 2,
                          }}
                        >
                          {bookingStatusLabel(selectedBooking.status)}
                        </span>
                        <span
                          style={{
                            padding: "3px 9px",
                            borderRadius: 999,
                            backgroundColor: payStyles.bg,
                            border: payStyles.border,
                            fontSize: 11,
                            color: payStyles.color,
                            fontWeight: 600,
                          }}
                        >
                          {paymentStatusLabel(selectedBooking.payment_status)}
                        </span>
                      </>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => handleOpenDetails(selectedBooking.id)}
                    style={{
                      marginTop: 8,
                      borderRadius: 999,
                      padding: "6px 12px",
                      border: "1px solid #D1D5DB",
                      backgroundColor: "#FFFFFF",
                      color: "#14532D",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    View full booking details
                  </button>
                </div>
              </div>

              {/* Body – basic breakdown */}
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#F9FAFB",
                  padding: 12,
                  fontSize: 13,
                  color: "#374151",
                }}
              >
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Total amount</span>
                  <strong>
                    {selectedBooking.currency || "USD"}{" "}
                    {selectedBooking.total_amount ?? "-"}
                  </strong>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  Your safari expert will share detailed travel documents,
                  vouchers and final timings once your booking is confirmed and
                  payment has been received.
                </div>
              </div>

              {/* What happens next */}
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  border: "1px dashed #E5E7EB",
                  padding: 10,
                  fontSize: 12,
                  color: "#4B5563",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <div
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginBottom: 4,
                  }}
                >
                  What happens next?
                </div>
                {selectedBooking.payment_status === "paid_in_full" ? (
                  <>
                    Your payment has been received. Your safari expert will now
                    finalise all arrangements and share your final itinerary,
                    pick-up details and on-the-ground contact information.
                  </>
                ) : selectedBooking.payment_status === "deposit_paid" ? (
                  <>
                    Your deposit has been received. Please follow the payment
                    instructions shared in your quote chat to settle the
                    remaining balance by the due date.
                  </>
                ) : (
                  <>
                    Your booking is awaiting payment. Please follow the bank /
                    mobile payment instructions that your safari expert shared
                    in the chat to confirm your trip.
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
