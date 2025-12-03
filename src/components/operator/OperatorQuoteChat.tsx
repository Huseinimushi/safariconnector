"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const BRAND_GREEN = "#0B6B3A";
const BG_SAND = "#F4F3ED";

type OperatorQuote = {
  id: string;
  client_name: string | null;
  client_email: string | null;
  message: string | null;
  created_at: string | null;
};

type OperatorQuoteMessage = {
  id: string;
  quote_id: string;
  sender: "operator" | "client" | string;
  message: string;
  created_at: string;
};

export default function OperatorQuoteChat({ quoteId }: { quoteId: string }) {
  const [quote, setQuote] = useState<OperatorQuote | null>(null);
  const [messages, setMessages] = useState<OperatorQuoteMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadQuote = async () => {
    const { data, error } = await supabase
      .from("operator_quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (!error && data) setQuote(data as OperatorQuote);
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("operator_quote_messages")
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: true });

    if (!error && data) setMessages(data as OperatorQuoteMessage[]);
  };

  useEffect(() => {
    if (!quoteId) return;
    (async () => {
      setLoading(true);
      await Promise.all([loadQuote(), loadMessages()]);
      setLoading(false);
    })();
  }, [quoteId]);

  const sendReply = async () => {
    if (!newMsg.trim() || !quoteId) return;
    try {
      setSending(true);
      const { error } = await supabase.from("operator_quote_messages").insert({
        quote_id: quoteId,
        sender: "operator",
        message: newMsg.trim(),
      });

      if (!error) {
        setNewMsg("");
        await loadMessages();
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div>Loading quote conversation…</div>;
  }

  if (!quote) {
    return <div>No quote found.</div>;
  }

  return (
    <div
      style={{
        background: BG_SAND,
        padding: 16,
        borderRadius: 12,
        border: `1px solid ${BRAND_GREEN}22`,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h3
        style={{
          color: BRAND_GREEN,
          margin: 0,
          marginBottom: 8,
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        Quote conversation
      </h3>

      {/* Guest details */}
      <div
        style={{
          padding: 10,
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #E5E7EB",
          marginBottom: 10,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {quote.client_name || "Safari Connector traveller"}
        </div>
        {quote.client_email && (
          <div style={{ fontSize: 12, color: "#6B7280" }}>
            {quote.client_email}
          </div>
        )}
        {quote.created_at && (
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
            Requested:{" "}
            {new Date(quote.created_at).toLocaleString(undefined, {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}

        {quote.message && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 8,
              background: "#F3F4F6",
              fontSize: 13,
            }}
          >
            {quote.message}
          </div>
        )}
      </div>

      {/* Messages list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 10,
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #E5E7EB",
          marginBottom: 10,
        }}
      >
        {messages.length === 0 && (
          <div style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
            No messages yet. Reply to start the conversation.
          </div>
        )}

        {messages.map((m) => {
          const isOperator = m.sender === "operator";
          return (
            <div
              key={m.id}
              style={{
                marginBottom: 8,
                display: "flex",
                justifyContent: isOperator ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "6px 10px",
                  borderRadius: 10,
                  background: isOperator ? BRAND_GREEN : "#E5E7EB",
                  color: isOperator ? "#fff" : "#111827",
                  fontSize: 13,
                }}
              >
                <div>{m.message}</div>
                <div
                  style={{
                    fontSize: 10,
                    opacity: 0.75,
                    marginTop: 2,
                    textAlign: "right",
                  }}
                >
                  {new Date(m.created_at).toLocaleString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Write your reply to this enquiry…"
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 999,
            border: "1px solid #D1D5DB",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={sendReply}
          disabled={sending || !newMsg.trim()}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            border: "none",
            background: BRAND_GREEN,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: sending ? "wait" : "pointer",
            opacity: sending || !newMsg.trim() ? 0.7 : 1,
          }}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
