// src/app/traveller/quotes/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ---------- Types (quote_requests + quote_request_messages + quotes + bookings) ---------- */

type EnquiryRow = {
  id: number;
  trip_id: string | null;
  trip_title: string | null;
  date: string | null; // preferred date
  pax: number | null;
  name: string;
  email: string;
  phone: string | null;
  note: string | null;
  created_at: string | null;
};

type MessageRow = {
  id: number;
  quote_request_id: number;
  sender_role: string | null; // 'operator' | 'traveller'
  message: string | null;
  created_at: string | null;
};

type QuoteRow = {
  id: string;
  quote_request_id?: number | null;
  total_price: number | null;
  currency: string | null;
  notes: string | null;
  created_at: string | null;
};

type BookingRow = {
  id: string;
  trip_id: string | null;
  traveller_id: string | null;
  operator_id: string | null;
  quote_id: string | null;

  // UPDATED lifecycle statuses
  status: string | null; // pending_payment / payment_submitted / payment_verified / confirmed / cancelled

  date_from: string | null;
  date_to: string | null;
  pax: number | null;
  total_amount: number | null;
  currency: string | null;

  // UPDATED payment statuses
  payment_status: string | null; // unpaid / proof_submitted / deposit_paid / paid_in_full

  created_at: string | null;
};

/* ---------- Traveller list status type (UI only) ---------- */
type TravellerStatus = "pending" | "answered" | "confirmed" | "cancelled" | "archived";

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

const markEnquirySeen = (enquiryId: number | string) => {
  if (!enquiryId) return;
  const key = String(enquiryId);
  const map = getUnreadMap();
  map[key] = Date.now();
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

const markEnquiryClosedLocal = (enquiryId: number | string) => {
  if (!enquiryId) return;
  const key = String(enquiryId);
  const map = getClosedMap();
  map[key] = true;
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

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

/* Traveller-facing status label (left list only) */
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

/* ✅ Status pill style helper (prevents TS narrowing errors) */
const statusPill = (status: TravellerStatus) => {
  switch (status) {
    case "answered":
      return { bg: "#ECFDF5", color: "#166534", border: "1px solid #BBF7D0" };
    case "cancelled":
    case "archived":
      return { bg: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5" };
    case "confirmed":
      return { bg: "#EEF2FF", color: "#3730A3", border: "1px solid #C7D2FE" };
    case "pending":
    default:
      return { bg: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" };
  }
};

/* Booking / payment labels (right top bubble) */
const bookingStatusLabel = (status?: string | null) => {
  const s = (status || "pending_payment").toLowerCase();
  switch (s) {
    case "pending_payment":
      return "Pending payment";
    case "payment_submitted":
      return "Payment submitted (unverified)";
    case "payment_verified":
      return "Payment verified";
    case "confirmed":
      return "Confirmed booking";
    case "cancelled":
      return "Cancelled";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

const paymentStatusLabel = (status?: string | null) => {
  const s = (status || "unpaid").toLowerCase();
  switch (s) {
    case "unpaid":
      return "Unpaid";
    case "proof_submitted":
      return "Proof submitted";
    case "deposit_paid":
      return "Deposit paid";
    case "paid_in_full":
      return "Paid in full";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

const bookingTone = (statusRaw: string) => {
  switch (statusRaw) {
    case "confirmed":
      return { bg: "#ECFDF5", border: "1px solid #BBF7D0", color: "#166534" };
    case "cancelled":
      return { bg: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" };
    case "payment_verified":
      return { bg: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8" };
    case "payment_submitted":
      return { bg: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" };
    case "pending_payment":
    default:
      return { bg: "#F3F4F6", border: "1px solid #E5E7EB", color: "#4B5563" };
  }
};

/* ---------- API response safe reader ---------- */

async function safeReadResponse(res: Response): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  contentType: string | null;
  json: any | null;
  text: string | null;
}> {
  const contentType = res.headers.get("content-type");
  const status = res.status;
  const statusText = res.statusText;

  // JSON if looks like JSON
  if (contentType && contentType.toLowerCase().includes("application/json")) {
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status, statusText, contentType, json, text: null };
  }

  // Otherwise text
  const text = await res.text().catch(() => null);

  // Try parse JSON even if wrong header
  let json: any | null = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  return { ok: res.ok, status, statusText, contentType, json, text };
}

/* ---------- AUTH/Fetch helpers (FIX) ---------- */

// ✅ get token; if missing, refreshSession
const getFreshAccessToken = async (): Promise<string | null> => {
  const s1 = await supabase.auth.getSession();
  const t1 = s1.data.session?.access_token;
  if (t1) return t1;

  const s2 = await supabase.auth.refreshSession();
  const t2 = s2.data.session?.access_token;
  if (t2) return t2;

  return null;
};

// ✅ fetch wrapper: Bearer + include cookies + safeReadResponse
const fetchWithBearer = async (url: string, body: any) => {
  const token = await getFreshAccessToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      statusText: "No session",
      contentType: "application/json",
      json: { ok: false, error: "Session expired" },
      text: null,
    } as const;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    // IMPORTANT: helps if you have middleware / cookie-based checks too
    credentials: "include",
    body: JSON.stringify(body),
  });

  return safeReadResponse(res);
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

  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<number | null>(null);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const [quote, setQuote] = useState<QuoteRow | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const [booking, setBooking] = useState<BookingRow | null>(null);

  const [closedMapState, setClosedMapState] = useState<Record<string, boolean>>({});

  // Accept & Book UI state
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"card" | "mobile" | "bank" | null>(null);

  // Payment notify (I have paid) state
  const [paymentNotifySending, setPaymentNotifySending] = useState(false);
  const [paymentNotifyError, setPaymentNotifyError] = useState<string | null>(null);
  const [paymentNotifySuccess, setPaymentNotifySuccess] = useState<string | null>(null);

  // Load local closed map once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    setClosedMapState(getClosedMap());
  }, []);

  /* ---------- Load enquiries ---------- */
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userResp?.user) {
          console.error("traveller enquiries auth error:", userErr);
          if (!isMounted) return;
          setErrorMsg("Please log in as a traveller.");
          setLoading(false);
          return;
        }

        const user = userResp.user;
        const emailFromUser = (user.email as string) || ((user.user_metadata?.email as string) ?? null);

        if (!emailFromUser) {
          if (!isMounted) return;
          setErrorMsg("We couldn't find an email on your account.");
          setLoading(false);
          return;
        }

        if (!isMounted) return;
        setTravellerEmail(emailFromUser);

        const { data: rows, error: qErr } = await supabase
          .from("quote_requests")
          .select("id, trip_id, trip_title, date, pax, name, email, phone, note, created_at")
          .eq("email", emailFromUser)
          .order("created_at", { ascending: false });

        if (qErr) {
          console.error("traveller enquiries load error:", qErr);
          if (!isMounted) return;
          setEnquiries([]);
          setErrorMsg("Could not load your enquiries.");
          setLoading(false);
          return;
        }

        const list = (rows || []) as EnquiryRow[];

        if (!isMounted) return;
        setEnquiries(list);

        // Select initial enquiry
        let initialId: number | null = null;
        const paramEnquiry = searchParams?.get("enquiry_id");
        if (paramEnquiry) {
          const found = list.find((e) => String(e.id) === paramEnquiry);
          if (found) initialId = found.id;
        }
        if (!initialId && list.length > 0) initialId = list[0].id;

        if (initialId != null && isMounted) setSelectedEnquiryId(initialId);
      } catch (err: any) {
        console.error("traveller enquiries exception:", err);
        if (isMounted) setErrorMsg("Unexpected error while loading your enquiries.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const selectedEnquiry = useMemo(
    () => (selectedEnquiryId == null ? null : enquiries.find((e) => e.id === selectedEnquiryId) || null),
    [enquiries, selectedEnquiryId]
  );

  const selectedKey = selectedEnquiryId != null ? String(selectedEnquiryId) : null;
  const selectedIsClosed = !!selectedKey && closedMapState[selectedKey] === true;

  // Reset per-enquiry transient messages when changing enquiry
  useEffect(() => {
    setAcceptError(null);
    setAcceptSuccess(null);
    setPaymentNotifyError(null);
    setPaymentNotifySuccess(null);
    setShowPaymentModal(false);
    setSelectedPaymentMethod(null);
  }, [selectedEnquiryId]);

  /* ---------- Load messages ---------- */
  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      if (!selectedEnquiryId) {
        setMessages([]);
        return;
      }

      setLoadingMessages(true);

      try {
        const { data: rows, error } = await supabase
          .from("quote_request_messages")
          .select("id, quote_request_id, sender_role, message, created_at")
          .eq("quote_request_id", selectedEnquiryId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("traveller enquiries messages error:", error);
          if (!isMounted) return;
          setMessages([]);
        } else {
          if (!isMounted) return;
          setMessages((rows || []) as MessageRow[]);
          markEnquirySeen(selectedEnquiryId);
        }
      } catch (err: any) {
        console.error("traveller enquiries messages exception:", err);
        if (isMounted) setMessages([]);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedEnquiryId]);

  /* ---------- Load quote ---------- */
  useEffect(() => {
    let isMounted = true;

    const loadQuote = async () => {
      if (!selectedEnquiryId) {
        setQuote(null);
        return;
      }

      setLoadingQuote(true);
      setQuote(null);
      setBooking(null);

      try {
        const { data, error } = await supabase
          .from("quotes")
          .select("id, quote_request_id, total_price, currency, notes, created_at")
          .eq("quote_request_id", selectedEnquiryId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("traveller load quote error:", error);
          if (!isMounted) return;
          setQuote(null);
        } else if (isMounted) {
          setQuote((data || null) as QuoteRow | null);
        }
      } catch (err) {
        console.error("traveller load quote exception:", err);
        if (isMounted) setQuote(null);
      } finally {
        if (isMounted) setLoadingQuote(false);
      }
    };

    loadQuote();

    return () => {
      isMounted = false;
    };
  }, [selectedEnquiryId]);

  /* ---------- If quote exists, try load booking for it ---------- */
  useEffect(() => {
    let isMounted = true;

    const loadBooking = async () => {
      if (!quote) {
        setBooking(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(
            "id, trip_id, traveller_id, operator_id, quote_id, status, date_from, date_to, pax, total_amount, currency, payment_status, created_at"
          )
          .eq("quote_id", quote.id)
          .maybeSingle();

        if (error) {
          console.error("traveller load booking error:", error);
          if (!isMounted) return;
          setBooking(null);
        } else if (isMounted) {
          setBooking((data || null) as BookingRow | null);
        }
      } catch (err) {
        console.error("traveller load booking exception:", err);
        if (isMounted) setBooking(null);
      }
    };

    loadBooking();

    return () => {
      isMounted = false;
    };
  }, [quote]);

  /* ---------- Handlers ---------- */

  const handleSelectEnquiry = (id: number) => {
    setSelectedEnquiryId(id);

    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("enquiry_id", String(id));
    router.replace(`/traveller/quotes?${params.toString()}`);
  };

  const handleSend = async () => {
    if (!selectedEnquiryId || !newMessage.trim() || selectedIsClosed) return;
    const text = newMessage.trim();
    setNewMessage("");

    try {
      const { data, error } = await supabase
        .from("quote_request_messages")
        .insert({
          quote_request_id: selectedEnquiryId,
          sender_role: "traveller",
          message: text,
        })
        .select("id, quote_request_id, sender_role, message, created_at")
        .single();

      if (error) {
        console.error("traveller send message error:", error);
        return;
      }

      if (data) setMessages((prev) => [...prev, data as MessageRow]);
    } catch (err: any) {
      console.error("traveller send message exception:", err);
    }
  };

  const handleCloseChat = async () => {
    if (!selectedEnquiryId || !selectedEnquiry || selectedIsClosed) return;

    setClosing(true);
    setErrorMsg(null);

    try {
      markEnquiryClosedLocal(selectedEnquiryId);
      setClosedMapState((prev) => ({
        ...prev,
        [String(selectedEnquiryId)]: true,
      }));

      markEnquirySeen(selectedEnquiryId);
    } catch (err: any) {
      console.error("traveller close chat local exception:", err);
      setErrorMsg("Unexpected error while closing this chat.");
    } finally {
      setClosing(false);
    }
  };

  // ✅ FIXED: Bearer + refresh + include cookies + safe parsing
  const handleAcceptAndBook = async () => {
    if (!quote || !selectedEnquiryId || accepting || selectedIsClosed) return;

    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Are you happy with this quote and ready to proceed with booking?");
      if (!confirmed) return;
    }

    setAcceptError(null);
    setAcceptSuccess(null);
    setAccepting(true);

    try {
      // 1) Send acceptance message into the chat
      const messageText = `I’m happy with this quote (${quote.currency || "USD"} ${quote.total_price ?? ""}). Please proceed with booking and share the payment instructions.`;

      const { data: msgRow, error: msgErr } = await supabase
        .from("quote_request_messages")
        .insert({
          quote_request_id: selectedEnquiryId,
          sender_role: "traveller",
          message: messageText,
        })
        .select("id, quote_request_id, sender_role, message, created_at")
        .single();

      if (msgErr) {
        console.error("traveller accept & book message error:", {
          message: (msgErr as any)?.message,
          details: (msgErr as any)?.details,
          hint: (msgErr as any)?.hint,
          code: (msgErr as any)?.code,
        });
        setAcceptError("Could not send your acceptance message. Please try again.");
        return;
      }

      if (msgRow) setMessages((prev) => [...prev, msgRow as MessageRow]);

      // 2) Call API
      const parsed = await fetchWithBearer("/api/traveller/quotes/accept-and-book", {
        quote_id: quote.id,
        enquiry_id: selectedEnquiryId,
      });

      const json = parsed.json;

      if (!parsed.ok || !json?.ok) {
        const bodyPreview =
          (parsed.text || "")
            .replace(/\s+/g, " ")
            .slice(0, 260) || null;

        console.error("traveller accept & book booking API error:", {
          status: parsed.status,
          statusText: parsed.statusText,
          contentType: parsed.contentType,
          json,
          bodyPreview,
        });

        if (parsed.status === 404) {
          setAcceptError("Booking endpoint is missing (404). API route is not available on server.");
        } else if (parsed.status === 401 || parsed.status === 403) {
          setAcceptError("Session expired / access denied. Please log out and log back in, then try again.");
        } else {
          setAcceptError(
            json?.error ||
              "We sent your acceptance, but could not create the booking record automatically. Our team will still see your acceptance."
          );
        }
        return;
      }

      if (json.booking) setBooking(json.booking as BookingRow);

      setAcceptSuccess(
        "Booking initiated. Please wait for payment instructions in the chat, then make payment to Safari Connector and share your proof of payment here."
      );
    } catch (err) {
      console.error("traveller accept & book booking exception:", err);
      setAcceptError("We sent your acceptance, but there was an unexpected error creating the booking automatically.");
    } finally {
      setAccepting(false);
    }
  };

  /**
   * Sends a traveller message "I've paid" and updates the booking server-side:
   *  - status -> payment_submitted
   *  - payment_status -> proof_submitted
   */
  // ✅ FIXED: Bearer + refresh + include cookies + safe parsing
  const handleSendPaymentDoneMessage = async () => {
    if (!selectedEnquiryId || !booking || selectedIsClosed || paymentNotifySending) return;

    setPaymentNotifyError(null);
    setPaymentNotifySuccess(null);
    setPaymentNotifySending(true);

    const refShort = booking.id.slice(0, 8).toUpperCase();
    const amountText = `${booking.currency || quote?.currency || "USD"} ${
      booking.total_amount ?? quote?.total_price ?? ""
    }`;

    const messageText = [
      `Payment sent for booking ${refShort}.`,
      `Amount: ${amountText}.`,
      ``,
      `I have attached / will attach the proof of payment here (screenshot/bank slip). Please confirm once verified.`,
    ].join("\n");

    try {
      // 1) Insert chat message
      const { data, error } = await supabase
        .from("quote_request_messages")
        .insert({
          quote_request_id: selectedEnquiryId,
          sender_role: "traveller",
          message: messageText,
        })
        .select("id, quote_request_id, sender_role, message, created_at")
        .single();

      if (error) {
        console.error("traveller payment done message error:", error);
        setPaymentNotifyError("Could not send your payment message. Please try again.");
        return;
      }
      if (data) setMessages((prev) => [...prev, data as MessageRow]);

      // 2) Update booking statuses server-side
      const parsed = await fetchWithBearer("/api/bookings/mark-payment-submitted", {
        booking_id: booking.id,
      });

      const json = parsed.json;

      if (!parsed.ok || !json?.ok) {
        const bodyPreview =
          (parsed.text || "")
            .replace(/\s+/g, " ")
            .slice(0, 260) || null;

        console.error("mark-payment-submitted API error:", {
          status: parsed.status,
          statusText: parsed.statusText,
          contentType: parsed.contentType,
          json,
          bodyPreview,
        });

        setPaymentNotifySuccess("Payment message sent. Our team will verify the payment and update your booking.");
        return;
      }

      if (json.booking) setBooking(json.booking as BookingRow);
      setPaymentNotifySuccess("Payment marked as submitted. Safari Connector will verify and confirm shortly.");
    } catch (err) {
      console.error("traveller payment done message exception:", err);
      setPaymentNotifySuccess("Payment message sent. Our team will verify the payment and update your booking.");
    } finally {
      setPaymentNotifySending(false);
    }
  };

  /* ---------- Derived booking/payment flags for UI ---------- */

  const bookingStatusRaw = (booking?.status || "pending_payment").toLowerCase();
  const paymentStatusRaw = (booking?.payment_status || "unpaid").toLowerCase();

  const isCancelled = bookingStatusRaw === "cancelled";
  const isConfirmed = bookingStatusRaw === "confirmed";

  const isPaymentSubmitted = bookingStatusRaw === "payment_submitted" || paymentStatusRaw === "proof_submitted";
  const isPaymentVerified = bookingStatusRaw === "payment_verified";
  const isPaidInFull = paymentStatusRaw === "paid_in_full";

  const tone = bookingTone(bookingStatusRaw);

  /* ---------- Render ---------- */

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 16px 64px" }}>
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
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#14532D" }}>Your safari enquiries</h1>
          <p style={{ margin: 0, marginTop: 4, fontSize: 14, color: "#4B5563" }}>
            View the trips you&apos;ve enquired about, chat with our safari experts, and proceed to booking once you&apos;re
            happy with the quote.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
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

      {/* Main layout */}
      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 2fr)", gap: 20 }}>
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
          <p style={{ margin: 0, marginBottom: 10, fontSize: 13, color: "#6B7280" }}>
            Choose a safari enquiry to open the chat.
          </p>

          {loading ? (
            <div style={{ marginTop: 20, fontSize: 13, color: "#6B7280" }}>Loading enquiries...</div>
          ) : enquiries.length === 0 ? (
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
              You haven&apos;t requested any quotes yet. When you send a request from a trip page, it will appear here.
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
              {enquiries.map((q) => {
                const isActive = selectedEnquiryId != null && q.id === selectedEnquiryId;

                const key = String(q.id);
                const unreadMap = getUnreadMap();
                const lastSeen = unreadMap[key] || 0;

                const isClosedLocal = closedMapState[key] === true;

                const hasUnread =
                  !isClosedLocal && isActive
                    ? messages.some((m) => {
                        if ((m.sender_role || "").toLowerCase() !== "operator") return false;
                        const t = m.created_at ? new Date(m.created_at).getTime() : 0;
                        return t > lastSeen;
                      })
                    : false;

                const statusRaw: TravellerStatus = isClosedLocal ? "archived" : hasUnread ? "answered" : "pending";
                const pill = statusPill(statusRaw);

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleSelectEnquiry(q.id)}
                    style={{
                      textAlign: "left",
                      borderRadius: 18,
                      border: isActive ? "2px solid #065F46" : "1px solid #E5E7EB",
                      padding: "10px 12px",
                      backgroundColor: isActive ? "#ECFDF5" : "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                          {q.trip_title || "Safari enquiry"}
                        </div>
                        <div style={{ fontSize: 12, color: "#6B7280" }}>
                          {q.date ? `Preferred date: ${formatDate(q.date)}` : "Dates flexible"}
                        </div>
                        <div style={{ marginTop: 3, fontSize: 11, color: "#6B7280" }}>
                          Travellers {q.pax ? q.pax : "not specified"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ marginBottom: 4 }}>
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: 999,
                              backgroundColor: pill.bg,
                              color: pill.color,
                              border: pill.border,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {getTravellerStatusLabel(statusRaw)}
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

                        <div style={{ fontSize: 11, color: "#6B7280" }}>
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
            position: "relative",
            borderRadius: 22,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            padding: "18px 18px 16px",
            minHeight: 420,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!selectedEnquiry ? (
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
              Select an enquiry on the left to see the chat with our safari experts.
            </div>
          ) : (
            <>
              {/* Quote + Booking bubble (top-right) */}
              <div style={{ position: "absolute", top: 16, right: 16, zIndex: 1 }}>
                {loadingQuote ? (
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      backgroundColor: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                      fontSize: 11,
                      color: "#1D4ED8",
                      fontWeight: 600,
                      display: "inline-block",
                    }}
                  >
                    Checking for quote...
                  </span>
                ) : quote ? (
                  <div
                    style={{
                      borderRadius: 16,
                      padding: "10px 12px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      maxWidth: 420,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#065F46" }}>
                          Quote: {quote.currency || "USD"} {quote.total_price ?? "-"}
                        </div>
                        {quote.notes && (
                          <div style={{ marginTop: 2, fontSize: 11, color: "#4B5563", whiteSpace: "pre-line" }}>
                            {quote.notes}
                          </div>
                        )}
                      </div>

                      {booking ? (
                        isConfirmed && isPaidInFull ? (
                          <span
                            style={{
                              borderRadius: 999,
                              padding: "6px 12px",
                              backgroundColor: "#ECFDF5",
                              border: "1px solid #BBF7D0",
                              color: "#065F46",
                              fontSize: 11,
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Paid & confirmed
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPaymentMethod(null);
                              setShowPaymentModal(true);
                            }}
                            disabled={isCancelled}
                            style={{
                              border: "none",
                              borderRadius: 999,
                              padding: "6px 12px",
                              backgroundColor: isCancelled ? "#9CA3AF" : "#0F766E",
                              color: "#FFFFFF",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: isCancelled ? "not-allowed" : "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Make payment
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={handleAcceptAndBook}
                          disabled={accepting}
                          style={{
                            border: "none",
                            borderRadius: 999,
                            padding: "6px 12px",
                            backgroundColor: accepting ? "#9CA3AF" : "#14532D",
                            color: "#FFFFFF",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: accepting ? "wait" : "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {accepting ? "Processing..." : "Accept & book"}
                        </button>
                      )}
                    </div>

                    {booking ? (
                      <div
                        style={{
                          marginTop: 10,
                          borderRadius: 14,
                          padding: "10px 10px",
                          backgroundColor: tone.bg,
                          border: tone.border,
                          color: tone.color,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 4 }}>
                          {bookingStatusLabel(booking.status)}
                        </div>

                        <div style={{ fontSize: 11, color: "#374151", marginBottom: 2 }}>
                          Booking ref:{" "}
                          <span style={{ fontFamily: "monospace" }}>{booking.id.slice(0, 8).toUpperCase()}</span>
                        </div>

                        <div style={{ fontSize: 11, color: "#374151", marginBottom: 2 }}>
                          Amount: {booking.currency || quote.currency || "USD"}{" "}
                          {booking.total_amount ?? quote.total_price ?? "-"}
                        </div>

                        <div style={{ fontSize: 11, color: "#4B5563" }}>
                          Payment status: <strong>{paymentStatusLabel(booking.payment_status)}</strong>
                        </div>

                        {!isConfirmed && !isCancelled && (
                          <div
                            style={{
                              marginTop: 8,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              justifyContent: "flex-end",
                            }}
                          >
                            <button
                              type="button"
                              onClick={handleSendPaymentDoneMessage}
                              disabled={paymentNotifySending}
                              style={{
                                borderRadius: 999,
                                padding: "6px 12px",
                                border: "1px solid #D1D5DB",
                                backgroundColor: paymentNotifySending ? "#F3F4F6" : "#FFFFFF",
                                color: "#374151",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: paymentNotifySending ? "wait" : "pointer",
                              }}
                            >
                              {paymentNotifySending ? "Sending..." : "I have paid (notify)"}
                            </button>
                          </div>
                        )}

                        {paymentNotifyError && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "#B91C1C" }}>{paymentNotifyError}</div>
                        )}
                        {paymentNotifySuccess && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "#065F46" }}>{paymentNotifySuccess}</div>
                        )}

                        {isPaymentSubmitted && !isPaymentVerified && !isConfirmed && !isCancelled && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "#92400E" }}>
                            Proof received / payment submitted. Waiting for Safari Connector to verify.
                          </div>
                        )}

                        {isPaymentVerified && !isConfirmed && !isCancelled && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "#1D4ED8" }}>
                            Payment verified. Your safari expert will confirm the booking shortly.
                          </div>
                        )}

                        {isCancelled && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "#B91C1C" }}>
                            This booking is cancelled. Please contact your safari expert for next steps.
                          </div>
                        )}

                        {isConfirmed && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "#166534" }}>
                            Booking confirmed. You will receive final travel documents in the chat/email.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: 10, fontSize: 11, color: "#065F46" }}>
                        Happy with this quote? Click <strong>Accept &amp; book</strong> to create your booking. Then you
                        will receive payment instructions in the chat.
                      </div>
                    )}

                    {acceptError && <div style={{ marginTop: 6, fontSize: 11, color: "#B91C1C" }}>{acceptError}</div>}
                    {acceptSuccess && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#065F46" }}>{acceptSuccess}</div>
                    )}
                  </div>
                ) : (
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      backgroundColor: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                      fontSize: 11,
                      color: "#1D4ED8",
                      fontWeight: 600,
                      display: "inline-block",
                    }}
                  >
                    Waiting for your expert to send a detailed quote.
                  </span>
                )}
              </div>

              {/* Header + Close chat */}
              <div
                style={{
                  marginBottom: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  paddingRight: 260,
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 2 }}>
                    Safari Connector expert
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
                    Enquiry sent on {selectedEnquiry.created_at ? formatDateTime(selectedEnquiry.created_at) : "-"}
                  </div>

                  <div style={{ display: "flex", gap: 40, fontSize: 12, color: "#4B5563" }}>
                    <div>
                      <div
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontSize: 11,
                          color: "#9CA3AF",
                        }}
                      >
                        Preferred date
                      </div>
                      <div>{selectedEnquiry.date ? formatDate(selectedEnquiry.date) : "Flexible"}</div>
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
                      <div>{selectedEnquiry.pax ? selectedEnquiry.pax : "Not specified"}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
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
                {selectedEnquiry.note && (
                  <div style={{ marginBottom: 10, alignSelf: "stretch" }}>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 3 }}>Your original request</div>
                    <div
                      style={{
                        backgroundColor: "#DCFCE7",
                        borderRadius: 12,
                        padding: 10,
                        fontSize: 13,
                        lineHeight: 1.5,
                        border: "1px solid #A7F3D0",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {selectedEnquiry.note}
                    </div>
                  </div>
                )}

                {loadingMessages ? (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#6B7280" }}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={{ marginTop: 10, fontSize: 13, color: "#6B7280" }}>
                    No messages yet. When our safari experts reply, the chat will appear here.
                  </div>
                ) : (
                  messages.map((r) => {
                    const isTraveller = (r.sender_role || "traveller").toLowerCase() === "traveller";
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: "flex",
                          justifyContent: isTraveller ? "flex-end" : "flex-start",
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
                            backgroundColor: isTraveller ? "#DCFCE7" : "#FFFFFF",
                            border: isTraveller ? "1px solid #A7F3D0" : "1px solid #E5E7EB",
                            whiteSpace: "pre-line",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, color: "#6B7280" }}>
                            {isTraveller ? "You" : "Safari Connector expert"}
                          </div>
                          <div>{r.message}</div>
                          {r.created_at && (
                            <div style={{ marginTop: 3, fontSize: 10, color: "#9CA3AF", textAlign: "right" }}>
                              {formatDateTime(r.created_at)}
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
                <div style={{ marginTop: 10, fontSize: 12, color: "#6B7280" }}>
                  This conversation is closed. You can still read past messages, but you can&apos;t send new ones.
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
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
                    disabled={!newMessage.trim()}
                    style={{
                      borderRadius: 999,
                      padding: "8px 16px",
                      backgroundColor: newMessage.trim() ? "#14532D" : "#9CA3AF",
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: 600,
                      border: "none",
                      cursor: newMessage.trim() ? "pointer" : "not-allowed",
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

      {/* Payment method modal */}
      {showPaymentModal && booking && (
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
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              boxShadow: "0 20px 40px rgba(15,23,42,0.45)",
              padding: "18px 20px 16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
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
                  Confirm your booking
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Choose a payment method</div>
                <div style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>
                  Amount due: {booking.currency || quote?.currency || "USD"}{" "}
                  {booking.total_amount ?? quote?.total_price ?? "-"}
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>
                  Booking reference:{" "}
                  <span style={{ fontFamily: "monospace" }}>{booking.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("card")}
                style={{
                  textAlign: "left",
                  borderRadius: 14,
                  border: selectedPaymentMethod === "card" ? "2px solid #0F766E" : "1px solid #E5E7EB",
                  padding: "10px 12px",
                  backgroundColor: selectedPaymentMethod === "card" ? "#ECFEFF" : "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Card payment</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  Pay securely with Visa/Mastercard (coming soon – for now please use bank transfer or mobile payment).
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("mobile")}
                style={{
                  textAlign: "left",
                  borderRadius: 14,
                  border: selectedPaymentMethod === "mobile" ? "2px solid #0F766E" : "1px solid #E5E7EB",
                  padding: "10px 12px",
                  backgroundColor: selectedPaymentMethod === "mobile" ? "#ECFEFF" : "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Mobile payment</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  Send payment via M-Pesa, Tigopesa or Airtel Money using the details shared in the chat.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("bank")}
                style={{
                  textAlign: "left",
                  borderRadius: 14,
                  border: selectedPaymentMethod === "bank" ? "2px solid #0F766E" : "1px solid #E5E7EB",
                  padding: "10px 12px",
                  backgroundColor: selectedPaymentMethod === "bank" ? "#ECFEFF" : "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Bank transfer</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  Make a bank transfer using the bank account details shared in the chat.
                </div>
              </button>
            </div>

            <div
              style={{
                marginTop: 10,
                borderRadius: 12,
                border: "1px dashed #E5E7EB",
                padding: 10,
                fontSize: 12,
                color: "#4B5563",
                backgroundColor: "#F9FAFB",
                minHeight: 70,
              }}
            >
              {selectedPaymentMethod === null && (
                <>Select a payment method above to see the next steps. Payment details will be shared by your safari expert in the chat.</>
              )}
              {selectedPaymentMethod === "mobile" && (
                <>
                  Open your mobile money app and send the amount using the details shared in the chat. Include the booking reference{" "}
                  <span style={{ fontFamily: "monospace" }}>{booking.id.slice(0, 8).toUpperCase()}</span> as the payment reference, then send your payment screenshot/slip in the chat.
                </>
              )}
              {selectedPaymentMethod === "bank" && (
                <>
                  Make a bank transfer to the bank account shared in the chat. Use the booking reference{" "}
                  <span style={{ fontFamily: "monospace" }}>{booking.id.slice(0, 8).toUpperCase()}</span>, then send your bank slip/screenshot in the chat.
                </>
              )}
              {selectedPaymentMethod === "card" && (
                <>Online card payments are not yet enabled. Please use mobile payment or bank transfer using the details shared in the chat.</>
              )}
            </div>

            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{
                  borderRadius: 999,
                  padding: "7px 14px",
                  border: "1px solid #D1D5DB",
                  backgroundColor: "#FFFFFF",
                  color: "#374151",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleSendPaymentDoneMessage();
                  setShowPaymentModal(false);
                }}
                disabled={paymentNotifySending}
                style={{
                  borderRadius: 999,
                  padding: "7px 14px",
                  border: "none",
                  backgroundColor: paymentNotifySending ? "#9CA3AF" : "#14532D",
                  color: "#FFFFFF",
                  fontWeight: 800,
                  cursor: paymentNotifySending ? "wait" : "pointer",
                }}
              >
                {paymentNotifySending ? "Sending..." : "I've paid (send message)"}
              </button>
            </div>

            {/* Keep this hidden but ensures travellerEmail isn't “unused” if your TS config is strict */}
            <div style={{ display: "none" }}>{travellerEmail || ""}</div>
          </div>
        </div>
      )}
    </main>
  );
}
