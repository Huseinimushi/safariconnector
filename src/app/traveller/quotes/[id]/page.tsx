"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND_GREEN = "#0B6B3A";

type TravellerRow = {
  id: string;
  user_id: string;
  email: string | null;
  [key: string]: any;
};

type MessageRow = {
  id?: number;
  quote_id: string;
  sender: "traveller" | "operator";
  traveller_email?: string | null;
  message: string;
  created_at?: string | null;
};

type BookingRow = {
  id: string;
  quote_id: string | null;
  status: string | null; // pending / confirmed / cancelled / ...
  payment_status: string | null; // unpaid / deposit_paid / paid_in_full / ...
  total_amount: number | null;
  currency: string | null;
};

const bookingStatusLabel = (status?: string | null) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "confirmed":
      return "Booking confirmed";
    case "cancelled":
      return "Booking cancelled";
    case "pending_payment":
    case "pending":
    case "":
      return "Awaiting confirmation";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

const paymentStatusLabel = (status?: string | null) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "unpaid":
      return "Unpaid";
    case "deposit_paid":
      return "Deposit paid";
    case "paid_in_full":
      return "Paid in full";
    case "":
      return "Not set";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function TravellerChatPage() {
  const params = useParams();
  const quoteId = params.id as string;

  const [trav, setTrav] = useState<TravellerRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [message, setMessage] = useState("");
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1) Current user
        const { data: userResp, error: userErr } =
          await supabase.auth.getUser();
        if (userErr || !userResp?.user) {
          if (!mounted) return;
          setErrorMsg("Please log in to view this conversation.");
          setLoading(false);
          return;
        }

        const user = userResp.user;

        // 2) Traveller profile
        const { data: t, error: tErr } = await supabase
          .from("travellers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (tErr) {
          console.error("traveller load error:", tErr);
        }

        if (mounted) {
          setTrav((t || null) as TravellerRow | null);
        }

        // 3) Messages for this quote
        const { data: msgs, error: mErr } = await supabase
          .from("operator_quote_messages")
          .select("*")
          .eq("quote_id", quoteId)
          .order("created_at", { ascending: true });

        if (mErr) {
          console.error("load messages error:", mErr);
        }

        if (mounted) {
          setMessages((msgs || []) as MessageRow[]);
        }

        // 4) Booking for this quote (if any)
        const { data: bookingRow, error: bErr } = await supabase
          .from("bookings")
          .select(
            "id, quote_id, status, payment_status, total_amount, currency"
          )
          .eq("quote_id", quoteId)
          .maybeSingle();

        if (bErr) {
          console.warn("traveller load booking error:", bErr);
        }

        if (mounted) {
          setBooking((bookingRow || null) as BookingRow | null);
        }
      } catch (err) {
        console.error("traveller chat load exception:", err);
        if (mounted) {
          setErrorMsg(
            "Unexpected error while loading this conversation. Please try again."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [quoteId]);

  const sendMessage = async () => {
    if (!message.trim() || !trav) return;

    const text = message.trim();
    setSending(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from("operator_quote_messages")
        .insert({
          quote_id: quoteId,
          sender: "traveller",
          traveller_email: trav.email,
          message: text,
        })
        .select("*")
        .single();

      if (error) {
        console.error("send message error:", error);
        setErrorMsg("Failed to send your message. Please try again.");
        return;
      }

      const newRow = data as MessageRow;
      setMessages((prev) => [...prev, newRow]);
      setMessage("");
    } catch (err) {
      console.error("send message exception:", err);
      setErrorMsg("Unexpected error while sending your message.");
    } finally {
      setSending(false);
    }
  };

  const canSend = !!message.trim() && !sending && !loading;

  // Derived booking banner content
  const bookingStatus = booking?.status || "";
  const paymentStatus = booking?.payment_status || "";

  const isConfirmed = bookingStatus.toLowerCase() === "confirmed";
  const isCancelled = bookingStatus.toLowerCase() === "cancelled";
  const isPaidInFull = paymentStatus.toLowerCase() === "paid_in_full";

  let bookingBannerBg = "#F3F4F6";
  let bookingBannerBorder = "#E5E7EB";
  let bookingBannerColor = "#374151";
  let bookingBannerText = "Awaiting confirmation from your safari operator.";

  if (booking) {
    if (isConfirmed && isPaidInFull) {
      bookingBannerBg = "#ECFDF5";
      bookingBannerBorder = "#BBF7D0";
      bookingBannerColor = "#065F46";
      bookingBannerText =
        "Payment received – your safari booking is fully confirmed.";
    } else if (isConfirmed && !isPaidInFull) {
      bookingBannerBg = "#FEF3C7";
      bookingBannerBorder = "#FDE68A";
      bookingBannerColor = "#92400E";
      bookingBannerText =
        "Your booking is confirmed. Please complete payment as per the instructions sent by your operator.";
    } else if (isCancelled) {
      bookingBannerBg = "#FEF2F2";
      bookingBannerBorder = "#FECACA";
      bookingBannerColor = "#B91C1C";
      bookingBannerText =
        "This booking has been cancelled. You can still read previous messages with your operator.";
    } else {
      bookingBannerBg = "#F3F4F6";
      bookingBannerBorder = "#E5E7EB";
      bookingBannerColor = "#374151";
      bookingBannerText =
        "Awaiting confirmation or payment. Your operator will update you here once your booking status changes.";
    }
  }

  return (
    <div
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "32px 16px 48px",
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: 8,
          fontSize: 24,
          fontWeight: 800,
          color: BRAND_GREEN,
        }}
      >
        Chat with your safari operator
      </h2>
      <p
        style={{
          margin: 0,
          marginBottom: 16,
          fontSize: 14,
          color: "#4B5563",
        }}
      >
        Ask questions, share preferences, and keep all your trip details in one
        place.
      </p>

      {/* Booking banner (changes when operator confirms / payment received) */}
      <div
        style={{
          marginBottom: 16,
          borderRadius: 14,
          padding: "10px 12px",
          backgroundColor: bookingBannerBg,
          border: `1px solid ${bookingBannerBorder}`,
          fontSize: 13,
          color: bookingBannerColor,
        }}
      >
        <strong>{bookingStatusLabel(bookingStatus)}</strong>
        {booking && (
          <>
            {" "}
            · Payment status:{" "}
            <strong>{paymentStatusLabel(paymentStatus)}</strong>
          </>
        )}
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
          }}
        >
          {bookingBannerText}
        </div>
        {booking?.total_amount != null && (
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
            }}
          >
            Amount:{" "}
            <strong>
              {booking.currency || "USD"}{" "}
              {booking.total_amount.toLocaleString()}
            </strong>
          </div>
        )}
      </div>

      {errorMsg && (
        <div
          style={{
            marginBottom: 12,
            borderRadius: 10,
            padding: "8px 10px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            fontSize: 12,
            color: "#B91C1C",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Chat box */}
      <div
        style={{
          background: "#ffffff",
          padding: 15,
          borderRadius: 12,
          border: "1px solid #E5E7EB",
          minHeight: 260,
          maxHeight: 420,
          overflowY: "auto",
        }}
      >
        {loading ? (
          <div
            style={{
              fontSize: 13,
              color: "#6B7280",
            }}
          >
            Loading conversation…
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: "#6B7280",
            }}
          >
            No messages yet. Start the conversation by sending a message to your
            safari operator.
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={m.id ?? i}
              style={{
                textAlign: m.sender === "traveller" ? "right" : "left",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  maxWidth: "80%",
                  padding: 8,
                  borderRadius: 10,
                  background:
                    m.sender === "traveller" ? BRAND_GREEN : "#E5E7EB",
                  color: m.sender === "traveller" ? "#ffffff" : "#111827",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                    marginBottom: 2,
                  }}
                >
                  {m.sender === "traveller" ? "You" : "Operator"}
                  {m.created_at && (
                    <> · {formatDateTime(m.created_at)}</>
                  )}
                </div>
                <div>{m.message}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div
        style={{
          marginTop: 15,
          display: "flex",
          gap: 10,
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) {
                sendMessage();
              }
            }
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!canSend}
          style={{
            background: canSend ? BRAND_GREEN : "#9CA3AF",
            color: "#ffffff",
            borderRadius: 999,
            padding: "8px 18px",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: canSend ? "pointer" : "not-allowed",
          }}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
