// src/app/traveller/bookings/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
  meta?: any | null;
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

export default function TravellerBookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingRow | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(
            "id, trip_id, traveller_id, operator_id, quote_id, status, date_from, date_to, pax, total_amount, currency, payment_status, created_at, meta"
          )
          .eq("id", bookingId)
          .maybeSingle();

        if (error) {
          console.error("traveller booking details load error:", error);
          if (!isMounted) {
            return;
          }
          setErrorMsg("Could not load this booking.");
          setBooking(null);
          setLoading(false);
          return;
        }

        if (!data) {
          if (!isMounted) return;
          setErrorMsg("We couldn’t find this booking.");
          setBooking(null);
          setLoading(false);
          return;
        }

        if (!isMounted) return;
        setBooking(data as BookingRow);
      } catch (err) {
        console.error("traveller booking details exception:", err);
        if (isMounted) {
          setErrorMsg("Unexpected error while loading this booking.");
          setBooking(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (bookingId) {
      load();
    }

    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  const tripTitle =
    booking?.meta?.trip_title ||
    booking?.meta?.trip_name ||
    "Safari booking";

  const operatorName =
    booking?.meta?.operator_name ||
    booking?.meta?.company_name ||
    "Your safari expert";

  const operatorEmail =
    booking?.meta?.operator_email || booking?.meta?.contact_email || null;

  const operatorPhone =
    booking?.meta?.operator_phone || booking?.meta?.contact_phone || null;

  const statusStyles = bookingStatusColors(booking?.status);
  const payStyles = paymentStatusColors(booking?.payment_status);

  return (
    <main
      style={{
        maxWidth: 960,
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
              fontSize: 26,
              fontWeight: 900,
              color: "#14532D",
            }}
          >
            Booking details
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            Review the full details of your safari booking, including dates,
            traveller information and payment status.
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
            href="/traveller/bookings"
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
            Back to bookings
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

      {loading ? (
        <div
          style={{
            marginTop: 20,
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          Loading booking details...
        </div>
      ) : !booking ? (
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
          We couldn&apos;t find this booking. Please go back to your bookings
          list and select another booking.
        </div>
      ) : (
        <>
          {/* Header card */}
          <section
            style={{
              borderRadius: 22,
              border: "1px solid #E5E7EB",
              backgroundColor: "#FFFFFF",
              padding: "18px 18px 16px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#111827",
                    marginBottom: 4,
                  }}
                >
                  {tripTitle}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#4B5563",
                    marginBottom: 6,
                  }}
                >
                  with {operatorName}
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
                      Booking reference
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    >
                      {booking.id.slice(0, 8).toUpperCase()}
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
                      Travel dates
                    </div>
                    <div>
                      {formatDateRange(booking.date_from, booking.date_to)}
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
                    <div>{booking.pax ?? "-"}</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 6,
                  minWidth: 180,
                }}
              >
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    backgroundColor: statusStyles.bg,
                    border: statusStyles.border,
                    fontSize: 11,
                    color: statusStyles.color,
                    fontWeight: 600,
                  }}
                >
                  {bookingStatusLabel(booking.status)}
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
                  {paymentStatusLabel(booking.payment_status)}
                </span>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "#6B7280",
                    textAlign: "right",
                  }}
                >
                  Booked on{" "}
                  {booking.created_at
                    ? formatDateTime(booking.created_at)
                    : "-"}
                </div>
              </div>
            </div>
          </section>

          {/* Body: columns */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.2fr)",
              gap: 16,
            }}
          >
            {/* Left – itinerary & travellers */}
            <div
              style={{
                borderRadius: 18,
                border: "1px solid #E5E7EB",
                backgroundColor: "#FFFFFF",
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                Trip overview
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#4B5563",
                }}
              >
                <p
                  style={{
                    marginTop: 0,
                    marginBottom: 6,
                  }}
                >
                  This booking covers your full safari itinerary for the dates
                  shown, including all arrangements agreed with your safari
                  expert.
                </p>

                {booking.meta?.itinerary_summary && (
                  <p
                    style={{
                      marginTop: 0,
                      marginBottom: 6,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {booking.meta.itinerary_summary}
                  </p>
                )}

                <p
                  style={{
                    marginTop: 0,
                    marginBottom: 0,
                  }}
                >
                  If any of the details here don&apos;t match what was agreed
                  in your quote, please reply in the quote chat so your safari
                  expert can review and update the booking.
                </p>
              </div>

              <hr
                style={{
                  margin: "12px 0",
                  border: "none",
                  borderTop: "1px solid #E5E7EB",
                }}
              />

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                Travellers
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#4B5563",
                }}
              >
                {booking.meta?.lead_traveller_name ||
                booking.meta?.lead_guest_name ? (
                  <>
                    Lead traveller:{" "}
                    <strong>
                      {booking.meta.lead_traveller_name ||
                        booking.meta.lead_guest_name}
                    </strong>
                    {booking.meta.lead_traveller_email && (
                      <>
                        {" "}
                        · {booking.meta.lead_traveller_email}
                      </>
                    )}
                    {booking.meta.lead_traveller_phone && (
                      <>
                        {" "}
                        · {booking.meta.lead_traveller_phone}
                      </>
                    )}
                    <br />
                  </>
                ) : (
                  <>
                    Lead traveller:{" "}
                    <strong>
                      {booking.meta?.traveller_name ||
                        booking.meta?.guest_name ||
                        "Yourself"}
                    </strong>
                    <br />
                  </>
                )}
                Total travellers: <strong>{booking.pax ?? "-"}</strong>
              </div>
            </div>

            {/* Right – payment & contact */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* Payment summary */}
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#FFFFFF",
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: 6,
                  }}
                >
                  Payment summary
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    marginBottom: 4,
                    color: "#374151",
                  }}
                >
                  <span>Total amount</span>
                  <strong>
                    {booking.currency || "USD"}{" "}
                    {booking.total_amount ?? "-"}
                  </strong>
                </div>

                {booking.meta?.deposit_amount && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 2,
                      color: "#4B5563",
                    }}
                  >
                    <span>Deposit</span>
                    <span>
                      {booking.currency || "USD"}{" "}
                      {booking.meta.deposit_amount}
                    </span>
                  </div>
                )}

                {booking.meta?.balance_amount && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 2,
                      color: "#4B5563",
                    }}
                  >
                    <span>Remaining balance</span>
                    <span>
                      {booking.currency || "USD"}{" "}
                      {booking.meta.balance_amount}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  {booking.payment_status === "paid_in_full" ? (
                    <>
                      We&apos;ve marked your booking as fully paid. Please keep
                      your payment proof until after your trip has finished.
                    </>
                  ) : booking.payment_status === "deposit_paid" ? (
                    <>
                      Your deposit has been received. Please follow the payment
                      instructions from your safari expert to pay the remaining
                      balance before the agreed deadline.
                    </>
                  ) : (
                    <>
                      Your booking is not yet fully paid. Please follow the bank
                      or mobile payment instructions shared in your quote chat
                      to complete payment.
                    </>
                  )}
                </div>
              </div>

              {/* Operator contact */}
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#FFFFFF",
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: 6,
                  }}
                >
                  Your safari expert
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#4B5563",
                  }}
                >
                  <p
                    style={{
                      marginTop: 0,
                      marginBottom: 4,
                    }}
                  >
                    {operatorName}
                  </p>
                  {operatorEmail && (
                    <p
                      style={{
                        marginTop: 0,
                        marginBottom: 2,
                      }}
                    >
                      Email: <strong>{operatorEmail}</strong>
                    </p>
                  )}
                  {operatorPhone && (
                    <p
                      style={{
                        marginTop: 0,
                        marginBottom: 2,
                      }}
                    >
                      Phone / WhatsApp: <strong>{operatorPhone}</strong>
                    </p>
                  )}

                  <p
                    style={{
                      marginTop: 6,
                      marginBottom: 0,
                    }}
                  >
                    If you need to change your dates, update traveller details
                    or discuss special requests, please reply in your quote chat
                    or contact your safari expert directly using the details
                    above.
                  </p>
                </div>
              </div>

              {/* Link back to chat */}
              {booking.quote_id && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/traveller/quotes?enquiry_id=${
                        booking.meta?.quote_request_id || ""
                      }`
                    )
                  }
                  style={{
                    borderRadius: 999,
                    padding: "8px 14px",
                    border: "1px solid #14532D",
                    backgroundColor: "#14532D",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    alignSelf: "flex-start",
                  }}
                >
                  Open chat with safari expert
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
