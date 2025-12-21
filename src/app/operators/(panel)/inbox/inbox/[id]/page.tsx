// src/app/inbox/[id]/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND_GREEN = "#0B6B3A";
const BUBBLE_GREY = "#E5E7EB";
const PAGE_BG = "#F5F5F4";

type MessageRow = {
  id: string;
  thread_id: string;
  sender_role: "operator" | "traveller" | "system";
  sender_id: string | null;
  sender_name: string | null;
  message: string;
  created_at: string;
};

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OperatorChatPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params?.id as string;

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Load existing messages
  useEffect(() => {
    if (!threadId) return;

    const load = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("load messages error:", error);
          setSendError("Failed to load messages.");
          return;
        }

        setMessages((data as MessageRow[]) || []);
      } catch (err: any) {
        console.error("load messages unexpected error:", err);
        setSendError(err?.message || "Unexpected error while loading messages.");
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 50);
      }
    };

    load();
  }, [threadId]);

  // Realtime subscription
  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`messages-thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;
          setMessages((prev) => [...prev, newMessage]);
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || !threadId || sending) return;

    try {
      setSending(true);
      setSendError(null);

      const text = message.trim();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setSendError("Please log in to send messages.");
        setSending(false);
        return;
      }

      const userId = user.id;

      // operator side: we always send as operator, but jaribu kupata jina zuri
      let senderName: string | null = user.email || null;

      const { data: op1 } = await supabase
        .from("operators_view")
        .select("name, company_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (op1) {
        senderName =
          (op1.name as string | null) ||
          (op1.company_name as string | null) ||
          senderName;
      }

      const { error: insertError } = await supabase.from("messages").insert({
        thread_id: threadId,
        sender_role: "operator",
        sender_id: userId,
        sender_name: senderName,
        message: text,
      });

      if (insertError) {
        console.error("send message insert error:", insertError);
        setSendError("Failed to send message.");
        setSending(false);
        return;
      }

      setMessage("");
      // realtime itacharge ku–append message
    } catch (err: any) {
      console.error("send message unexpected error:", err);
      setSendError(err?.message || "Unexpected error while sending message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        background: PAGE_BG,
        minHeight: "calc(100vh - 80px)",
        padding: "20px 16px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Back + title */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 8 }}>
          <button
            type="button"
            onClick={() => router.push("/inbox")}
            style={{
              height: 32,
              width: 32,
              borderRadius: "999px",
              border: "1px solid #D1D5DB",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            ←
          </button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Conversation with traveller
            </div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>
              Conversation ID:{" "}
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#9CA3AF" }}>
                {threadId}
              </span>
            </div>
          </div>
        </div>

        {/* Chat card */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid #E5E7EB",
            padding: 16,
            height: "70vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Messages list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "4px 4px",
              background: "#F9FAFB",
              borderRadius: 12,
            }}
          >
            {loading && (
              <div style={{ fontSize: 12, color: "#6B7280" }}>Loading messages...</div>
            )}

            {!loading && messages.length === 0 && (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "#6B7280",
                  textAlign: "center",
                }}
              >
                <div>
                  <div>No messages yet.</div>
                  <div style={{ marginTop: 4 }}>
                    Start the conversation with your traveller below.
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: "4px 0" }}>
              {messages.map((m) => {
                const isOperator = m.sender_role === "operator";
                return (
                  <div
                    key={m.id}
                    style={{
                      textAlign: isOperator ? "right" : "left",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        padding: "8px 12px",
                        borderRadius: 16,
                        maxWidth: "70%",
                        background: isOperator ? "#D1FAE5" : "#FFFFFF",
                        color: "#111827",
                        border: isOperator ? "1px solid #A7F3D0" : `1px solid ${BUBBLE_GREY}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#6B7280",
                          marginBottom: 4,
                        }}
                      >
                        {isOperator ? "You" : m.sender_name || "Traveller"}
                      </div>
                      <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
                        {m.message}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#9CA3AF",
                          marginTop: 6,
                          textAlign: "right",
                        }}
                      >
                        {formatDateTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input row */}
          <form
            onSubmit={sendMessage}
            style={{
              marginTop: 12,
              borderTop: "1px solid #E5E7EB",
              paddingTop: 12,
            }}
          >
            {sendError && (
              <div style={{ fontSize: 11, color: "#DC2626", marginBottom: 6 }}>
                {sendError}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Andika ujumbe kwa mteja wako..."
                style={{
                  flex: 1,
                  borderRadius: 999,
                  border: "1px solid #D1D5DB",
                  padding: "8px 12px",
                  fontSize: 13,
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!sending && message.trim()) {
                      sendMessage();
                    }
                  }
                }}
              />
              <button
                type="submit"
                disabled={sending || !message.trim()}
                style={{
                  borderRadius: 999,
                  border: "none",
                  background: BRAND_GREEN,
                  color: "#FFFFFF",
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: sending || !message.trim() ? "not-allowed" : "pointer",
                  opacity: sending || !message.trim() ? 0.5 : 1,
                }}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 10,
                color: "#9CA3AF",
              }}
            >
              Bonyeza Enter kutuma, Shift + Enter kwa line mpya.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
