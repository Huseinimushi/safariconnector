"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";

type QuoteRow = {
  id: string;
  operator_id: string;
  full_name: string | null;
  email: string | null;
  travel_start_date: string | null;
  travel_end_date: string | null;
  group_size: number | null;
  message: string | null;
  created_at: string | null;
};

type MessageRow = {
  id: string;
  quote_id: string;
  sender_role: string | null; // "traveller" | "operator" | "system"
  sender_name: string | null;
  message: string | null;
  created_at: string | null;
};

export default function TravellerQuotesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRow | null>(null);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const [travellerName, setTravellerName] = useState<string | null>(null);
  const [globalMsg, setGlobalMsg] = useState<string | null>(null);

  // ===== LOAD QUOTES FOR LOGGED-IN TRAVELLER =====
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setGlobalMsg(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("auth error:", userError);
        setGlobalMsg("❌ Failed to check login. Please try again.");
        setLoading(false);
        return;
      }

      if (!user) {
        router.push("/login/traveller");
        return;
      }

      const userEmail = user.email;
      setTravellerName(user.user_metadata?.full_name || null);

      // get all quotes where this email was used
      const { data, error } = await supabase
        .from("operator_quotes")
        .select(
          "id, operator_id, full_name, email, travel_start_date, travel_end_date, group_size, message, created_at"
        )
        .eq("email", userEmail)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("load quotes error:", error);
        setGlobalMsg("❌ Failed to load your enquiries.");
        setQuotes([]);
        setSelectedQuote(null);
        setLoading(false);
        return;
      }

      const rows = (data || []) as QuoteRow[];
      setQuotes(rows);
      setSelectedQuote(rows.length > 0 ? rows[0] : null);

      setLoading(false);
    };

    load();
  }, [router]);

  // ===== LOAD MESSAGES WHEN QUOTE CHANGES =====
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedQuote) {
        setMessages([]);
        return;
      }

      setMessagesLoading(true);

      const { data, error } = await supabase
        .from("operator_quote_messages")
        .select(
          "id, quote_id, sender_role, sender_name, message, created_at"
        )
        .eq("quote_id", selectedQuote.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("load messages error:", error);
        setMessages([]);
      } else {
        setMessages((data || []) as MessageRow[]);
      }

      setMessagesLoading(false);
    };

    loadMessages();
  }, [selectedQuote]);

  // ===== HELPERS =====
  const formatDate = (value: string | null) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return value;
    }
  };

  const isAIQuote = (quote: QuoteRow) =>
    quote.message?.startsWith(
      "Enquiry generated via Safari Connector AI Trip Builder."
    ) ?? false;

  // ===== SEND NEW MESSAGE =====
  const handleSendMessage = async () => {
    if (!selectedQuote) return;
    if (!newMessage.trim()) return;

    setGlobalMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login/traveller");
      return;
    }

    const safeName =
      travellerName ||
      selectedQuote.full_name ||
      user.email?.split("@")[0] ||
      "Traveller";

    const payload = {
      quote_id: selectedQuote.id,
      sender_role: "traveller",
      sender_name: safeName,
      message: newMessage.trim(),
    };

    const { data, error } = await supabase
      .from("operator_quote_messages")
      .insert(payload)
      .select("id, quote_id, sender_role, sender_name, message, created_at")
      .single();

    if (error) {
      console.error("send message error:", error);
      setGlobalMsg("❌ Failed to send your message. Please try again.");
      return;
    }

    // append to local state
    setMessages((prev) => [...prev, data as MessageRow]);
    setNewMessage("");
  };

  // ===== UI RENDER =====
  if (loading) {
    return (
      <main
        style={{
          backgroundColor: BG_SAND,
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6B7280",
        }}
      >
        Loading your enquiries…
      </main>
    );
  }

  const hasQuotes = quotes.length > 0;

  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "32px 16px 64px",
        }}
      >
        {/* HEADER */}
        <section
          style={{
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: "18px 22px",
            marginBottom: 18,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: BRAND_GREEN,
              marginBottom: 6,
            }}
          >
            Your Enquiries
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            See all the safari quote requests you’ve sent to tour operators
            through Safari Connector. Select an enquiry to view the details and
            chat with the operator.
          </p>
        </section>

        {globalMsg && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 12px",
              borderRadius: 10,
              fontSize: 13,
              backgroundColor: globalMsg.startsWith("❌")
                ? "#FEE2E2"
                : "#FEF3C7",
              color: globalMsg.startsWith("❌") ? "#B91C1C" : "#92400E",
              border: globalMsg.startsWith("❌")
                ? "1px solid #FECACA"
                : "1px solid #FDE68A",
            }}
          >
            {globalMsg}
          </div>
        )}

        {!hasQuotes ? (
          <section
            style={{
              borderRadius: 20,
              backgroundColor: "#FFFFFF",
              border: "1px dashed #D1D5DB",
              padding: "26px 22px",
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            You haven&apos;t sent any enquiries yet. Use{" "}
            <a
              href="/plan"
              style={{ color: BRAND_GREEN, fontWeight: 600, textDecoration: "none" }}
            >
              AI Trip Builder
            </a>{" "}
            or the enquiry form on a trip page to contact trusted tour
            operators.
          </section>
        ) : (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 280px) minmax(0, 1fr)",
              gap: 16,
              alignItems: "stretch",
            }}
          >
            {/* LEFT: QUOTE LIST */}
            <div
              style={{
                borderRadius: 20,
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                padding: "10px 10px 12px",
                display: "flex",
                flexDirection: "column",
                minHeight: 420,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 8,
                  padding: "2px 4px",
                }}
              >
                Enquiry history
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                  marginBottom: 8,
                  padding: "0 4px",
                }}
              >
                Click an enquiry to see the full details and messages.
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  paddingRight: 2,
                  paddingLeft: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {quotes.map((q) => {
                  const selected = selectedQuote?.id === q.id;
                  const ai = isAIQuote(q);

                  const created =
                    q.created_at ? formatDate(q.created_at) : "Unknown date";

                  const snippet = (q.message || "").slice(0, 120);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedQuote(q)}
                      style={{
                        textAlign: "left",
                        padding: "8px 9px",
                        borderRadius: 12,
                        border: selected
                          ? `1px solid ${BRAND_GREEN}`
                          : "1px solid #E5E7EB",
                        backgroundColor: selected ? "#ECFDF3" : "#F9FAFB",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          Safari enquiry
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "#6B7280",
                          }}
                        >
                          {created}
                        </span>
                      </div>

                      {ai && (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 999,
                            backgroundColor: "#FFFBEB",
                            border: "1px solid #FDE68A",
                            color: "#92400E",
                            marginBottom: 4,
                          }}
                        >
                          AI Trip Builder enquiry
                        </span>
                      )}

                      <div
                        style={{
                          fontSize: 12,
                          color: "#4B5563",
                          lineHeight: 1.45,
                        }}
                      >
                        {snippet}
                        {q.message && q.message.length > 120 ? "…" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: CONVERSATION */}
            <div
              style={{
                borderRadius: 20,
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                padding: "14px 14px 12px",
                display: "flex",
                flexDirection: "column",
                minHeight: 420,
              }}
            >
              {!selectedQuote ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color: "#6B7280",
                    textAlign: "center",
                    padding: 16,
                  }}
                >
                  Select an enquiry on the left to see its details.
                </div>
              ) : (
                <>
                  {/* Header info */}
                  <div
                    style={{
                      borderBottom: "1px solid #E5E7EB",
                      paddingBottom: 8,
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        Enquiry with tour operator
                      </div>
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 12,
                          color: "#6B7280",
                        }}
                      >
                        Sent on{" "}
                        {selectedQuote.created_at
                          ? formatDate(selectedQuote.created_at)
                          : "Unknown date"}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: "#374151",
                        }}
                      >
                        {selectedQuote.travel_start_date ||
                        selectedQuote.travel_end_date ? (
                          <>
                            Travel dates:{" "}
                            {selectedQuote.travel_start_date
                              ? formatDate(selectedQuote.travel_start_date)
                              : "not set"}{" "}
                            –{" "}
                            {selectedQuote.travel_end_date
                              ? formatDate(selectedQuote.travel_end_date)
                              : "not set"}
                          </>
                        ) : (
                          <>Travel dates not set</>
                        )}
                        {typeof selectedQuote.group_size === "number" &&
                          ` • Group size: ${selectedQuote.group_size} travellers`}
                      </div>
                    </div>

                    {isAIQuote(selectedQuote) && (
                      <div
                        style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          borderRadius: 999,
                          backgroundColor: "#FFFBEB",
                          border: "1px solid #FDE68A",
                          color: "#92400E",
                          whiteSpace: "nowrap",
                        }}
                      >
                        AI Trip Builder enquiry
                      </div>
                    )}
                  </div>

                  {/* Conversation area */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: "4px 2px 8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {/* Initial enquiry as first bubble from traveller */}
                    {selectedQuote.message && (
                      <ChatBubble
                        side="right"
                        name={
                          selectedQuote.full_name ||
                          travellerName ||
                          "You"
                        }
                        timestamp={
                          selectedQuote.created_at
                            ? formatDate(selectedQuote.created_at)
                            : ""
                        }
                      >
                        {selectedQuote.message}
                      </ChatBubble>
                    )}

                    {/* Messages list */}
                    {messagesLoading ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6B7280",
                          textAlign: "center",
                          marginTop: 10,
                        }}
                      >
                        Loading messages…
                      </div>
                    ) : messages.length === 0 ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6B7280",
                          textAlign: "center",
                          marginTop: 12,
                        }}
                      >
                        No replies yet from the operator. They&apos;ll respond
                        here once they&apos;ve reviewed your enquiry.
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isTraveller = m.sender_role === "traveller";
                        const side = isTraveller ? "right" : "left";
                        const name =
                          m.sender_name ||
                          (isTraveller ? "You" : "Operator");

                        return (
                          <ChatBubble
                            key={m.id}
                            side={side}
                            name={name}
                            timestamp={m.created_at ? formatDate(m.created_at) : ""}
                          >
                            {m.message || ""}
                          </ChatBubble>
                        );
                      })
                    )}
                  </div>

                  {/* Input area */}
                  <div
                    style={{
                      borderTop: "1px solid #E5E7EB",
                      paddingTop: 8,
                      marginTop: 4,
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-end",
                    }}
                  >
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Write a message to the tour operator…"
                      rows={2}
                      style={{
                        flex: 1,
                        resize: "none",
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #D1D5DB",
                        fontSize: 13,
                        fontFamily:
                          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}
                    />

                    <button
                      type="button"
                      onClick={handleSendMessage}
                      style={{
                        padding: "9px 16px",
                        borderRadius: 999,
                        border: "none",
                        backgroundColor: BRAND_GREEN,
                        color: "#FFFFFF",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: newMessage.trim() ? "pointer" : "default",
                        opacity: newMessage.trim() ? 1 : 0.6,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* ========= CHAT BUBBLE COMPONENT ========= */

function ChatBubble(props: {
  side: "left" | "right";
  name: string;
  timestamp?: string;
  children: React.ReactNode;
}) {
  const { side, name, timestamp, children } = props;
  const isRight = side === "right";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isRight ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          backgroundColor: isRight ? "#DCFCE7" : "#F3F4F6",
          color: "#111827",
          borderRadius: 16,
          border: "1px solid #E5E7EB",
          padding: "6px 9px 7px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#6B7280",
            marginBottom: 2,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>{isRight ? "You" : name}</span>
          {timestamp && <span>{timestamp}</span>}
        </div>
        <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{children}</div>
      </div>
    </div>
  );
}
