// src/app/operators/(panel)/quotes/OperatorsQuotesClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ───────── Types ───────── */

type OperatorRow = {
  id: string;
  user_id?: string | null;
  company_name?: string | null;
  name?: string | null;
  email?: string | null;
};

type EnquiryRow = {
  id: number;
  operator_id: string | null;
  trip_id: string | null;
  trip_title: string | null;
  date: string | null;
  pax: number | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  created_at: string | null;
};

type MessageRow = {
  id: number;
  quote_request_id: number;
  sender_role: string | null; // "operator" | "traveller"
  message: string | null;
  created_at: string | null;
};

type QuoteRow = {
  id: string;
  quote_request_id?: number | null;
  operator_id?: string | null;
  total_price: number | null;
  currency: string | null;
  notes: string | null;
  created_at: string | null;
};

type BookingRow = {
  id: string;
  trip_id: string | null;
  quote_id: string | null;
  operator_id: string | null;
  date_from: string | null;
  date_to: string | null;
  pax: number | null;
  total_amount: number | null;
  currency: string | null;

  // UPDATED lifecycle statuses
  status: string | null; // pending_payment / payment_submitted / payment_verified / confirmed / cancelled

  // UPDATED payment statuses
  payment_status: string | null; // unpaid / proof_submitted / deposit_paid / paid_in_full

  created_at: string | null;
};

/* ───────── Helpers ───────── */

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

const getTravellerStatusLabel = (hasQuote: boolean, hasBooking: boolean) => {
  if (hasBooking) return "Booking created";
  if (hasQuote) return "Quote sent";
  return "New enquiry";
};

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

const bannerToneForBooking = (statusRaw: string) => {
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

/** Client session -> access token (needed for server routes) */
const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
};

/** Robust fetch parsing (avoids "{}" logs) */
async function safeReadResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.toLowerCase().includes("application/json")) {
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json, text: null as string | null, contentType };
  }
  const text = await res.text().catch(() => null);
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  return { ok: res.ok, status: res.status, json, text, contentType };
}

/* ───────── Component ───────── */

export default function OperatorsQuotesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(false);

  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<number | null>(null);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const [quote, setQuote] = useState<QuoteRow | null>(null);
  const [quoteCurrency, setQuoteCurrency] = useState("USD");
  const [quoteTotal, setQuoteTotal] = useState<string>("");
  const [quoteNotes, setQuoteNotes] = useState("");

  const [booking, setBooking] = useState<BookingRow | null>(null);

  const [savingQuote, setSavingQuote] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [paymentMsgSending, setPaymentMsgSending] = useState(false);
  const [paymentMsgError, setPaymentMsgError] = useState<string | null>(null);
  const [paymentMsgSuccess, setPaymentMsgSuccess] = useState<string | null>(null);

  const [confirmingBooking, setConfirmingBooking] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ───────── Load operator + enquiries ───────── */

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

        // Operator profile
        let opRow: OperatorRow | null = null;

        const { data: opView, error: opViewErr } = await supabase
          .from("operators_view")
          .select("id,user_id,company_name,name,email")
          .eq("user_id", user.id)
          .maybeSingle();

        if (opViewErr) console.warn("operators_view error:", opViewErr);

        if (opView) {
          opRow = opView as OperatorRow;
        } else {
          const { data: op, error: opErr } = await supabase
            .from("operators")
            .select("id,user_id,company_name,name,email")
            .eq("user_id", user.id)
            .maybeSingle();

          if (opErr) console.warn("operators fallback error:", opErr);
          if (op) opRow = op as OperatorRow;
        }

        if (!opRow) {
          if (!isMounted) return;
          setErrorMsg("We couldn’t find your operator profile. Please contact support.");
          setLoading(false);
          return;
        }

        if (!isMounted) return;
        setOperator(opRow);

        // Load enquiries for this operator
        const { data: qRows, error: qErr } = await supabase
          .from("quote_requests")
          .select("id, operator_id, trip_id, trip_title, date, pax, name, email, phone, note, created_at")
          .eq("operator_id", opRow.id)
          .order("created_at", { ascending: false });

        if (qErr) {
          console.error("operator enquiries load error:", qErr);
          if (!isMounted) return;
          setEnquiries([]);
          setErrorMsg("Could not load your traveller enquiries.");
          setLoading(false);
          return;
        }

        const list = (qRows || []) as EnquiryRow[];
        if (!isMounted) return;

        setEnquiries(list);

        // initial selection
        let initialId: number | null = null;
        const fromParam = searchParams?.get("enquiry_id");
        if (fromParam) {
          const found = list.find((e) => String(e.id) === fromParam);
          if (found) initialId = found.id;
        }
        if (!initialId && list.length > 0) initialId = list[0].id;

        if (initialId != null) setSelectedEnquiryId(initialId);
      } catch (err) {
        console.error("operator quotes initial load exception:", err);
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

  /* ───────── Load messages for selected enquiry ───────── */

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      if (!selectedEnquiryId) {
        setMessages([]);
        return;
      }

      setLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from("quote_request_messages")
          .select("id,quote_request_id,sender_role,message,created_at")
          .eq("quote_request_id", selectedEnquiryId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("operator messages load error:", error);
          if (!isMounted) return;
          setMessages([]);
        } else if (isMounted) {
          setMessages((data || []) as MessageRow[]);
        }
      } catch (err) {
        console.error("operator messages load exception:", err);
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

  /* ───────── Load quote for selected enquiry ───────── */

  useEffect(() => {
    let isMounted = true;

    const loadQuote = async () => {
      if (!selectedEnquiryId || !operator) {
        setQuote(null);
        setQuoteCurrency("USD");
        setQuoteTotal("");
        setQuoteNotes("");
        return;
      }

      setLoadingQuote(true);
      try {
        const { data, error } = await supabase
          .from("quotes")
          .select("id, quote_request_id, operator_id, total_price, currency, notes, created_at")
          .eq("quote_request_id", selectedEnquiryId)
          .eq("operator_id", operator.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("operator load quote error:", error);
          if (!isMounted) return;
          setQuote(null);
          setQuoteCurrency("USD");
          setQuoteTotal("");
          setQuoteNotes("");
        } else if (isMounted) {
          const q = (data || null) as QuoteRow | null;
          setQuote(q);
          setQuoteCurrency(q?.currency || "USD");
          setQuoteTotal(typeof q?.total_price === "number" ? String(q.total_price) : "");
          setQuoteNotes(q?.notes || "");
        }
      } catch (err) {
        console.error("operator load quote exception:", err);
        if (isMounted) {
          setQuote(null);
          setQuoteCurrency("USD");
          setQuoteTotal("");
          setQuoteNotes("");
        }
      } finally {
        if (isMounted) setLoadingQuote(false);
      }
    };

    loadQuote();

    return () => {
      isMounted = false;
    };
  }, [selectedEnquiryId, operator]);

  /* ───────── Load booking for selected quote ───────── */

  useEffect(() => {
    let isMounted = true;

    const loadBooking = async () => {
      if (!quote || !operator) {
        setBooking(null);
        return;
      }

      setLoadingBooking(true);
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select("id,trip_id,quote_id,operator_id,date_from,date_to,pax,total_amount,currency,status,payment_status,created_at")
          .eq("quote_id", quote.id)
          .eq("operator_id", operator.id)
          .maybeSingle();

        if (error) {
          console.warn("operator load booking error:", error);
          if (!isMounted) return;
          setBooking(null);
        } else if (isMounted) {
          setBooking((data || null) as BookingRow | null);
        }
      } catch (err) {
        console.error("operator load booking exception:", err);
        if (isMounted) setBooking(null);
      } finally {
        if (isMounted) setLoadingBooking(false);
      }
    };

    loadBooking();

    return () => {
      isMounted = false;
    };
  }, [quote, operator]);

  /* ───────── Handlers ───────── */

  const handleSelectEnquiry = (id: number) => {
    setSelectedEnquiryId(id);
    setPaymentMsgError(null);
    setPaymentMsgSuccess(null);
    setErrorMsg(null);

    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("enquiry_id", String(id));
    router.replace(`/operators/quotes?${params.toString()}`);
  };

  const handleSendMessage = async () => {
    if (!selectedEnquiryId || !newMessage.trim() || sendingMessage) return;

    const text = newMessage.trim();
    setNewMessage("");
    setSendingMessage(true);

    try {
      const { data, error } = await supabase
        .from("quote_request_messages")
        .insert({
          quote_request_id: selectedEnquiryId,
          sender_role: "operator",
          message: text,
        })
        .select("id,quote_request_id,sender_role,message,created_at")
        .single();

      if (error) {
        console.error("operator send message error:", error);
        setNewMessage(text);
        return;
      }

      if (data) setMessages((prev) => [...prev, data as MessageRow]);
    } catch (err) {
      console.error("operator send message exception:", err);
      setNewMessage(text);
    } finally {
      setSendingMessage(false);
    }
  };

  /**
   * ✅ Save quote DIRECTLY via Supabase client
   */
  const handleSaveQuote: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!selectedEnquiryId || !operator || savingQuote) return;

    setSavingQuote(true);
    setErrorMsg(null);

    // sanity check: ensure still authed
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) {
      setErrorMsg("Not authenticated. Please log in again as operator.");
      setSavingQuote(false);
      return;
    }

    const totalNum = quoteTotal.trim() ? Number(quoteTotal) : null;
    if (quoteTotal.trim() && (Number.isNaN(totalNum as any) || (totalNum as number) < 0)) {
      setErrorMsg("Please enter a valid total price.");
      setSavingQuote(false);
      return;
    }

    try {
      if (!quote) {
        const { data, error } = await supabase
          .from("quotes")
          .insert({
            quote_request_id: selectedEnquiryId,
            operator_id: operator.id,
            total_price: totalNum,
            currency: quoteCurrency || "USD",
            notes: quoteNotes.trim() || null,
          })
          .select("id, quote_request_id, operator_id, total_price, currency, notes, created_at")
          .single();

        if (error) {
          console.error("operator create quote error:", {
            message: (error as any)?.message,
            details: (error as any)?.details,
            hint: (error as any)?.hint,
            code: (error as any)?.code,
            raw: error,
          });
          setErrorMsg((error as any)?.message || "Could not send quote. Please try again.");
        } else if (data) {
          setQuote(data as QuoteRow);
        }
      } else {
        const { data, error } = await supabase
          .from("quotes")
          .update({
            total_price: totalNum,
            currency: quoteCurrency || "USD",
            notes: quoteNotes.trim() || null,
          })
          .eq("id", quote.id)
          .select("id, quote_request_id, operator_id, total_price, currency, notes, created_at")
          .single();

        if (error) {
          console.error("operator update quote error:", {
            message: (error as any)?.message,
            details: (error as any)?.details,
            hint: (error as any)?.hint,
            code: (error as any)?.code,
            raw: error,
          });
          setErrorMsg((error as any)?.message || "Could not update quote. Please try again.");
        } else if (data) {
          setQuote(data as QuoteRow);
        }
      }
    } catch (err) {
      console.error("operator save quote exception:", err);
      setErrorMsg("Unexpected error while saving your quote.");
    } finally {
      setSavingQuote(false);
    }
  };

  const handleSendPaymentInstructions = async () => {
    if (!selectedEnquiryId || !selectedEnquiry || !booking || paymentMsgSending) return;

    setPaymentMsgError(null);
    setPaymentMsgSuccess(null);
    setPaymentMsgSending(true);

    try {
      const refShort = booking.id.slice(0, 8).toUpperCase();
      const amountText =
        (booking.currency || quote?.currency || "USD") + " " + (booking.total_amount ?? quote?.total_price ?? "");
      const tripTitle = selectedEnquiry.trip_title || "your safari itinerary";

      const messageText = [
        `Thank you for confirming that you're happy with the quote for "${tripTitle}".`,
        ``,
        `To confirm your booking at ${amountText}, please make payment using one of the methods below and send us your proof of payment (payment slip or screenshot):`,
        ``,
        `• Bank transfer: [add your bank name & account details here]`,
        `• Mobile money: [add your mobile money details here]`,
        ``,
        `Please use this reference when making payment: ${refShort}.`,
        ``,
        `Once Safari Connector verifies the payment, the booking will be cleared for confirmation and we will share your final travel documents.`,
      ].join("\n");

      const { data, error } = await supabase
        .from("quote_request_messages")
        .insert({
          quote_request_id: selectedEnquiryId,
          sender_role: "operator",
          message: messageText,
        })
        .select("id,quote_request_id,sender_role,message,created_at")
        .single();

      if (error) {
        console.error("operator send payment instructions error:", error);
        setPaymentMsgError("Could not send payment instructions. Please try again.");
      } else if (data) {
        setMessages((prev) => [...prev, data as MessageRow]);
        setPaymentMsgSuccess("Payment instructions sent to the traveller.");
      }
    } catch (err) {
      console.error("operator payment instructions exception:", err);
      setPaymentMsgError("Unexpected error while sending payment instructions.");
    } finally {
      setPaymentMsgSending(false);
    }
  };

  /**
   * ✅ Confirm booking via server API (with Bearer token)
   */
  const handleConfirmBooking = async () => {
    if (!booking || !selectedEnquiry || confirmingBooking) return;

    const statusRaw = (booking.status || "").toLowerCase();
    if (statusRaw !== "payment_verified") {
      setPaymentMsgError("You can only confirm after Safari Connector verifies payment.");
      setPaymentMsgSuccess(null);
      return;
    }

    setConfirmingBooking(true);
    setPaymentMsgError(null);
    setPaymentMsgSuccess(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setPaymentMsgError("Not authenticated. Please log in again.");
        return;
      }

      const res = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          booking_id: booking.id,
          enquiry_id: selectedEnquiry.id,
        }),
      });

      const parsed = await safeReadResponse(res);
      const json = parsed.json;

      if (!parsed.ok || !json?.ok) {
        console.error("operator confirm booking API error:", {
          status: parsed.status,
          contentType: parsed.contentType,
          json,
          text: parsed.text,
        });

        if (parsed.status === 401) setPaymentMsgError("Not authenticated. Log out/in then try again.");
        else if (parsed.status === 403) setPaymentMsgError("Forbidden. This booking is not assigned to your operator account.");
        else setPaymentMsgError(json?.error || "Failed to confirm booking.");

        setPaymentMsgSuccess(null);
        return;
      }

      if (json.booking) setBooking(json.booking as BookingRow);
      setPaymentMsgSuccess("Booking confirmed. Traveller notified.");
      setPaymentMsgError(null);
    } catch (err) {
      console.error("operator confirm booking exception:", err);
      setPaymentMsgError("Unexpected error while confirming booking.");
      setPaymentMsgSuccess(null);
    } finally {
      setConfirmingBooking(false);
    }
  };

  /* ───────── Derived ───────── */

  const companyName = (operator?.company_name as string) || (operator?.name as string) || "Your safari company";

  const bookingStatusRaw = (booking?.status || "pending_payment").toLowerCase();
  const bookingTone = bannerToneForBooking(bookingStatusRaw);

  const canConfirmBooking = bookingStatusRaw === "payment_verified";

  /* ───────── Render ───────── */

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 16px 64px" }}>
      {/* Heading */}
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
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#6B7280",
              marginBottom: 4,
            }}
          >
            Operator / Traveller enquiries
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#14532D" }}>Enquiries & quotes</h1>
          <p style={{ margin: 0, marginTop: 4, fontSize: 14, color: "#4B5563" }}>
            Chat with travellers, send or update your quotes, and guide them to confirmed bookings.
          </p>
        </div>

        <Link
          href="/operators/dashboard"
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
          Back to dashboard
        </Link>
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

      {/* Layout */}
      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 2fr)", gap: 20 }}>
        {/* LEFT – enquiries list */}
        <div
          style={{
            borderRadius: 22,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            padding: "16px 16px 14px",
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
            Traveller enquiries
          </div>

          <p style={{ margin: 0, marginBottom: 8, fontSize: 13, color: "#6B7280" }}>
            Choose an enquiry to open the quote and chat with that traveller.
          </p>

          {loading ? (
            <div style={{ marginTop: 16, fontSize: 13, color: "#6B7280" }}>Loading enquiries…</div>
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
              You haven&apos;t received any traveller enquiries yet. When a traveller requests a quote from one of your trips,
              it will appear here.
            </div>
          ) : (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8, maxHeight: 460, overflowY: "auto" }}>
              {enquiries.map((q) => {
                const isActive = selectedEnquiryId != null && q.id === selectedEnquiryId;

                const isCurrentSelected = selectedEnquiry?.id === q.id;
                const hasQuote = !!(quote && isCurrentSelected && quote.quote_request_id === q.id);
                const hasBooking = !!(booking && hasQuote && booking.quote_id === quote?.id);

                const statusLabel = getTravellerStatusLabel(hasQuote, hasBooking);

                const statusBg = hasBooking ? "#ECFDF5" : hasQuote ? "#EFF6FF" : "#FEF3C7";
                const statusColor = hasBooking ? "#166534" : hasQuote ? "#1D4ED8" : "#92400E";
                const statusBorder = hasBooking ? "1px solid #BBF7D0" : hasQuote ? "1px solid #BFDBFE" : "1px solid #FDE68A";

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
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{q.trip_title || "Safari enquiry"}</div>
                        <div style={{ fontSize: 12, color: "#6B7280" }}>
                          {q.name || "Traveller"} · {q.date ? `Preferred: ${formatDateShort(q.date)}` : "Dates flexible"}
                        </div>
                        <div style={{ marginTop: 3, fontSize: 11, color: "#6B7280" }}>Travellers {q.pax ?? "not specified"}</div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ marginBottom: 4 }}>
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: 999,
                              backgroundColor: statusBg,
                              color: statusColor,
                              border: statusBorder,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#6B7280" }}>{q.created_at ? formatDateShort(q.created_at) : ""}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT – chat + quote + booking */}
        <div
          style={{
            borderRadius: 22,
            border: "1px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            padding: "16px 16px 14px",
            minHeight: 420,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!selectedEnquiry ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#6B7280" }}>
              Select an enquiry on the left to open the conversation.
            </div>
          ) : (
            <>
              {/* Header + booking banner + quote summary */}
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
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{selectedEnquiry.name || "Traveller"}</div>

                  <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                    Enquiry sent on {selectedEnquiry.created_at ? formatDateTime(selectedEnquiry.created_at) : "-"}
                  </div>

                  <div style={{ display: "flex", gap: 32, fontSize: 12, color: "#4B5563" }}>
                    <div>
                      <div style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11, color: "#9CA3AF" }}>Preferred date</div>
                      <div>{selectedEnquiry.date ? formatDateShort(selectedEnquiry.date) : "Flexible"}</div>
                    </div>
                    <div>
                      <div style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11, color: "#9CA3AF" }}>Travellers</div>
                      <div>{selectedEnquiry.pax ?? "Not specified"}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, maxWidth: 340 }}>
                  {loadingBooking ? (
                    <span style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: "#F3F4F6", border: "1px solid #E5E7EB", fontSize: 11, color: "#4B5563" }}>
                      Checking booking status…
                    </span>
                  ) : booking ? (
                    <div
                      style={{
                        borderRadius: 14,
                        padding: "8px 10px",
                        backgroundColor: bookingTone.bg,
                        border: bookingTone.border,
                        fontSize: 12,
                        color: bookingTone.color,
                        width: "100%",
                      }}
                    >
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>{bookingStatusLabel(booking.status)}</div>

                      <div style={{ fontSize: 11, color: "#374151", marginBottom: 2 }}>
                        Booking ref: <span style={{ fontFamily: "monospace" }}>{booking.id.slice(0, 8).toUpperCase()}</span>
                      </div>

                      <div style={{ fontSize: 11, color: "#374151", marginBottom: 2 }}>
                        Amount: {booking.currency || quoteCurrency} {booking.total_amount ?? (quote ? quote.total_price ?? "-" : "-")}
                      </div>

                      <div style={{ fontSize: 11, color: "#4B5563" }}>
                        Payment status: <strong>{paymentStatusLabel(booking.payment_status)}</strong>
                      </div>

                      <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => router.push(`/operators/bookings/${booking.id}`)}
                          style={{
                            borderRadius: 999,
                            padding: "4px 10px",
                            border: "1px solid #D1D5DB",
                            backgroundColor: "#FFFFFF",
                            color: "#374151",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          View / update booking
                        </button>

                        <button
                          type="button"
                          onClick={handleSendPaymentInstructions}
                          disabled={paymentMsgSending || !!paymentMsgSuccess || bookingStatusRaw === "confirmed" || bookingStatusRaw === "cancelled"}
                          style={{
                            borderRadius: 999,
                            padding: "4px 10px",
                            border: "none",
                            backgroundColor: bookingStatusRaw === "confirmed" || bookingStatusRaw === "cancelled" ? "#9CA3AF" : "#14532D",
                            color: "#FFFFFF",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor:
                              bookingStatusRaw === "confirmed" || bookingStatusRaw === "cancelled"
                                ? "not-allowed"
                                : paymentMsgSending
                                ? "wait"
                                : "pointer",
                          }}
                        >
                          {paymentMsgSending ? "Sending…" : paymentMsgSuccess ? "Instructions sent" : "Share payment instructions"}
                        </button>

                        <button
                          type="button"
                          onClick={handleConfirmBooking}
                          disabled={!canConfirmBooking || confirmingBooking}
                          style={{
                            borderRadius: 999,
                            padding: "4px 10px",
                            border: "none",
                            backgroundColor: canConfirmBooking ? "#1D4ED8" : "#9CA3AF",
                            color: "#FFFFFF",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: !canConfirmBooking ? "not-allowed" : confirmingBooking ? "wait" : "pointer",
                          }}
                        >
                          {confirmingBooking ? "Confirming…" : "Confirm booking"}
                        </button>
                      </div>

                      {bookingStatusRaw === "payment_submitted" && (
                        <div style={{ marginTop: 6, fontSize: 11, color: "#92400E" }}>
                          Traveller submitted proof. Waiting for Safari Connector Finance verification.
                        </div>
                      )}

                      {bookingStatusRaw === "pending_payment" && (
                        <div style={{ marginTop: 6, fontSize: 11, color: "#4B5563" }}>
                          Waiting for traveller to pay. They will submit proof, then Finance verifies.
                        </div>
                      )}

                      {bookingStatusRaw === "payment_verified" && (
                        <div style={{ marginTop: 6, fontSize: 11, color: "#1D4ED8" }}>
                          Payment verified. You can now confirm the booking.
                        </div>
                      )}

                      {paymentMsgError && <div style={{ marginTop: 6, fontSize: 11, color: "#B91C1C" }}>{paymentMsgError}</div>}
                      {paymentMsgSuccess && <div style={{ marginTop: 6, fontSize: 11, color: "#065F46" }}>{paymentMsgSuccess}</div>}
                    </div>
                  ) : (
                    <span style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: "#F3F4F6", border: "1px solid #E5E7EB", fontSize: 11, color: "#4B5563" }}>
                      No booking yet – once the traveller accepts your quote, we&apos;ll create a booking automatically.
                    </span>
                  )}

                  <div style={{ fontSize: 11, color: "#6B7280", textAlign: "right" }}>
                    {loadingQuote
                      ? "Checking for quote…"
                      : quote
                      ? `Current quote: ${quote.currency || "USD"} ${quote.total_price ?? "-"}`
                      : "No quote sent yet for this enquiry."}
                  </div>
                </div>
              </div>

              {/* Chat area */}
              <div
                style={{
                  flex: 1,
                  borderRadius: 18,
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#F9FAFB",
                  padding: 12,
                  overflowY: "auto",
                  maxHeight: 320,
                }}
              >
                {selectedEnquiry.note && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 3 }}>Traveller’s original request</div>
                    <div
                      style={{
                        backgroundColor: "#EFF6FF",
                        borderRadius: 12,
                        padding: 10,
                        fontSize: 13,
                        lineHeight: 1.5,
                        border: "1px solid #BFDBFE",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {selectedEnquiry.note}
                    </div>
                  </div>
                )}

                {loadingMessages ? (
                  <div style={{ fontSize: 13, color: "#6B7280" }}>Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#6B7280" }}>
                    No messages yet. When you or the traveller send a message, the chat will appear here.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isOperator = (m.sender_role || "operator").toLowerCase() === "operator";
                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: isOperator ? "flex-end" : "flex-start", marginTop: 8 }}>
                        <div
                          style={{
                            maxWidth: "78%",
                            borderRadius: 12,
                            padding: 8,
                            fontSize: 13,
                            lineHeight: 1.5,
                            backgroundColor: isOperator ? "#DCFCE7" : "#FFFFFF",
                            border: isOperator ? "1px solid #A7F3D0" : "1px solid #E5E7EB",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: "#6B7280" }}>
                            {isOperator ? companyName : "Traveller"}
                          </div>
                          <div style={{ whiteSpace: "pre-line" }}>{m.message}</div>
                          {m.created_at && (
                            <div style={{ marginTop: 3, fontSize: 10, color: "#9CA3AF", textAlign: "right" }}>
                              {formatDateTime(m.created_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quote form */}
              <form
                onSubmit={handleSaveQuote}
                style={{
                  marginTop: 10,
                  borderRadius: 16,
                  border: "1px solid #E5E7EB",
                  padding: 10,
                  backgroundColor: "#FFFFFF",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>Send or update your quote</div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 2 }}>
                      Currency
                    </div>
                    <select
                      value={quoteCurrency}
                      onChange={(e) => setQuoteCurrency(e.target.value)}
                      style={{
                        width: "100%",
                        borderRadius: 10,
                        border: "1px solid #D1D5DB",
                        padding: "6px 9px",
                        fontSize: 13,
                        outline: "none",
                      }}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 2 }}>
                      Total price (for the trip)
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={quoteTotal}
                      onChange={(e) => setQuoteTotal(e.target.value)}
                      style={{
                        width: "100%",
                        borderRadius: 10,
                        border: "1px solid #D1D5DB",
                        padding: "6px 9px",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 2 }}>
                    Notes (what&apos;s included, exclusions, payment terms, etc.)
                  </div>
                  <textarea
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      border: "1px solid #D1D5DB",
                      padding: "6px 9px",
                      fontSize: 13,
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={savingQuote}
                    style={{
                      borderRadius: 999,
                      padding: "7px 14px",
                      border: "none",
                      backgroundColor: savingQuote ? "#9CA3AF" : "#14532D",
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: savingQuote ? "wait" : "pointer",
                    }}
                  >
                    {savingQuote ? "Saving quote…" : quote ? "Update quote" : "Send quote"}
                  </button>
                </div>
              </form>

              {/* Message composer */}
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a message to the traveller…"
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
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  style={{
                    borderRadius: 999,
                    padding: "8px 16px",
                    backgroundColor: newMessage.trim() ? "#14532D" : "#9CA3AF",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 800,
                    border: "none",
                    cursor: newMessage.trim() ? (sendingMessage ? "wait" : "pointer") : "not-allowed",
                  }}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
