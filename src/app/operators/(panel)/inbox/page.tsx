// src/app/inbox/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND_GREEN = "#0B6B3A";
const PAGE_BG = "#F5F5F4";

type OperatorInboxItem = {
  id: string;
  source: "manual" | "ai";
  operator_id: string;
  trip_id: string | null;
  trip_title: string | null;
  traveller_name: string | null;
  traveller_email: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
};

type InboxItemUI = OperatorInboxItem & { has_unread?: boolean };

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
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OperatorInboxPage() {
  const router = useRouter();
  const [items, setItems] = useState<InboxItemUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load inbox
  useEffect(() => {
    const loadInbox = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("Please log in as an operator.");
          return;
        }

        const userId = user.id;

        let operatorRow: { id: string } | null = null;
        let lastError: any = null;

        const tryLookup = async (
          table: "operators_view" | "operators",
          column: "user_id" | "auth_user_id"
        ) => {
          const { data, error } = await supabase
            .from(table)
            .select("id")
            // @ts-ignore
            .eq(column, userId)
            .maybeSingle();

          if (error) {
            lastError = error;
            return null;
          }
          if (!data) return null;
          return data as { id: string };
        };

        const attempts: Array<
          ["operators_view" | "operators", "user_id" | "auth_user_id"]
        > = [
          ["operators_view", "user_id"],
          ["operators_view", "auth_user_id"],
          ["operators", "user_id"],
          ["operators", "auth_user_id"],
        ];

        for (const [table, column] of attempts) {
          const found = await tryLookup(table, column);
          if (found) {
            operatorRow = found;
            break;
          }
        }

        if (!operatorRow) {
          console.error("Operator lookup failed:", lastError);
          setError(
            "Operator record not found for this login. Please make sure your operator profile is linked."
          );
          return;
        }

        const operatorId = String(operatorRow.id);

        const { data, error: inboxError } = await supabase
          .from("operator_inbox_view")
          .select("*")
          .eq("operator_id", operatorId)
          .order("created_at", { ascending: false });

        if (inboxError) {
          console.error("inbox load error:", inboxError);
          setError("Failed to load inbox.");
          return;
        }

        setItems((data as OperatorInboxItem[]) || []);
      } catch (err: any) {
        console.error("inbox unexpected error:", err);
        setError(err?.message || "Unexpected error while loading inbox.");
      } finally {
        setLoading(false);
      }
    };

    loadInbox();
  }, []);

  // Realtime “New” badge
  useEffect(() => {
    const channel = supabase
      .channel("operator-inbox-realtime")
      .on<MessageRow>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as MessageRow;
          if (msg.sender_role !== "traveller") return;

          setItems((prev) => {
            const copy = [...prev];
            const idx = copy.findIndex((it) => it.id === msg.thread_id);
            if (idx === -1) return prev;

            copy[idx] = { ...copy[idx], has_unread: true };
            const [item] = copy.splice(idx, 1);
            copy.unshift(item);

            return copy;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenThread = (item: InboxItemUI) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, has_unread: false } : it
      )
    );
    router.push(`/inbox/${item.id}`);
  };

  const unreadCount = items.filter((i) => i.has_unread).length;

  return (
    <div
      style={{
        background: PAGE_BG,
        minHeight: "calc(100vh - 80px)",
        padding: "20px 16px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header with back-to-dashboard */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
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
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                Inbox
              </h1>
              <p style={{ fontSize: 13, color: "#6B7280" }}>
                All conversations with travellers for your quotes and enquiries.
              </p>
            </div>
          </div>

          <div style={{ textAlign: "right", fontSize: 11, color: "#6B7280" }}>
            <div>{items.length} conversations</div>
            <div style={{ marginTop: 2 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    height: 8,
                    width: 8,
                    borderRadius: 999,
                    background: unreadCount > 0 ? BRAND_GREEN : "#D1D5DB",
                  }}
                />
                {unreadCount} with unread messages
              </span>
            </div>
          </div>
        </div>

        {/* Card container */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid #E5E7EB",
            padding: 12,
          }}
        >
          {loading && (
            <div style={{ fontSize: 12, color: "#6B7280", padding: 8 }}>
              Loading inbox...
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                fontSize: 12,
                color: "#DC2626",
                padding: 8,
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div
              style={{
                padding: 16,
                textAlign: "center",
                fontSize: 12,
                color: "#6B7280",
              }}
            >
              No conversations yet. New enquiries and AI quotes will appear
              here.
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div>
              {items.map((item) => {
                const isAI = item.source === "ai";
                const initials =
                  (item.traveller_name || item.traveller_email || "?")
                    .trim()
                    .charAt(0)
                    .toUpperCase();

                return (
                  <button
                    key={item.id}
                    onClick={() => handleOpenThread(item)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      padding: "10px 8px",
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget.style.background = "#F3F4F6"))
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget.style.background = "transparent"))
                    }
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        height: 40,
                        width: 40,
                        borderRadius: 999,
                        background: "#ECFDF5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 600,
                        color: BRAND_GREEN,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>

                    {/* Main text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#111827",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.traveller_name ||
                            item.traveller_email ||
                            "Traveller"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDateTime(item.created_at)}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#4B5563",
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.trip_title || "Trip / package enquiry"}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 11,
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: isAI ? "#EEF2FF" : "#ECFDF5",
                            color: isAI ? "#4F46E5" : "#047857",
                            fontWeight: 500,
                          }}
                        >
                          {isAI ? "AI Quote" : "Manual enquiry"}
                        </span>
                        {item.status && (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              border: "1px solid #E5E7EB",
                              color: "#6B7280",
                            }}
                          >
                            {item.status}
                          </span>
                        )}
                        {item.has_unread && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              marginLeft: "auto",
                              color: BRAND_GREEN,
                              fontWeight: 500,
                            }}
                          >
                            <span
                              style={{
                                height: 8,
                                width: 8,
                                borderRadius: 999,
                                background: BRAND_GREEN,
                              }}
                            />
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
