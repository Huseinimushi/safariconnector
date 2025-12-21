"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import Link from "next/link";

const BRAND = {
  ink: "#0E2430",
  primary: "#1B4D3E",
  sand: "#F4F3ED",
  border: "#E1E5ED",
};

type TicketRow = {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  email: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  user_role: string | null;
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

export default function AdminSupportPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "in_progress" | "resolved">(
    "all"
  );

  useEffect(() => {
    const loadTickets = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from("support_tickets")
          .select("*")
          .order("created_at", { ascending: false });

        const { data, error: qErr } = await query;

        if (qErr) throw qErr;

        setTickets((data || []) as TicketRow[]);
      } catch (err: any) {
        console.error("admin support load error:", err);
        setError(
          err?.message ||
            "Failed to load support tickets. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, []);

  const updateStatus = async (
    id: string,
    status: "open" | "in_progress" | "resolved" | "closed"
  ) => {
    try {
      setSavingId(id);
      setError(null);

      const { error: upErr } = await supabase
        .from("support_tickets")
        .update({ status })
        .eq("id", id);

      if (upErr) throw upErr;

      setTickets((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
              }
            : t
        )
      );
    } catch (err: any) {
      console.error("update support ticket status error:", err);
      setError(
        err?.message ||
          "Failed to update ticket. Please try again."
      );
    } finally {
      setSavingId(null);
    }
  };

  const filteredTickets =
    filterStatus === "all"
      ? tickets
      : tickets.filter(
          (t) => (t.status || "").toLowerCase() === filterStatus
        );

  const openCount = tickets.filter(
    (t) => (t.status || "").toLowerCase() === "open"
  ).length;

  const inProgressCount = tickets.filter(
    (t) => (t.status || "").toLowerCase() === "in_progress"
  ).length;

  const resolvedCount = tickets.filter(
    (t) => (t.status || "").toLowerCase() === "resolved"
  ).length;

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
              Support inbox
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "#4b5563",
                maxWidth: 520,
              }}
            >
              See all support requests from travellers and operators. Triage by
              priority and update status as your team follows up.
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

        {/* FILTERS + STATS */}
        <div
          style={{
            ...cardStyle,
            marginBottom: 20,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.ink,
                marginBottom: 4,
              }}
            >
              Ticket summary
            </p>
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              {tickets.length.toLocaleString("en-US")} total tickets ·{" "}
              {openCount} open · {inProgressCount} in progress ·{" "}
              {resolvedCount} resolved
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(
              [
                ["all", "All"],
                ["open", "Open"],
                ["in_progress", "In progress"],
                ["resolved", "Resolved"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  setFilterStatus(value as typeof filterStatus)
                }
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border:
                    filterStatus === value
                      ? "none"
                      : `1px solid ${BRAND.border}`,
                  backgroundColor:
                    filterStatus === value ? BRAND.primary : "#ffffff",
                  color: filterStatus === value ? "#ffffff" : BRAND.ink,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* TICKETS LIST */}
        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 12,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: BRAND.ink,
                }}
              >
                Support tickets
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                Click on a ticket to see details and update status.
              </p>
            </div>
          </div>

          {loading ? (
            <p
              style={{
                fontSize: 14,
                color: "#9ca3af",
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              Loading tickets…
            </p>
          ) : filteredTickets.length === 0 ? (
            <p
              style={{
                fontSize: 14,
                color: "#9ca3af",
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              No tickets in this view.
            </p>
          ) : (
            filteredTickets.map((t) => {
              const status = (t.status || "").toLowerCase();
              const priority = (t.priority || "").toLowerCase();

              let statusColor = "#6b7280";
              if (status === "open") statusColor = "#b91c1c";
              if (status === "in_progress") statusColor = "#92400e";
              if (status === "resolved") statusColor = "#166534";

              let priorityColor = "#6b7280";
              if (priority === "high") priorityColor = "#b91c1c";
              if (priority === "low") priorityColor = "#0369a1";

              return (
                <div
                  key={t.id}
                  style={{
                    padding: "10px 0",
                    borderTop: `1px solid ${BRAND.border}`,
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: BRAND.ink,
                        marginBottom: 2,
                      }}
                    >
                      {t.subject}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 4,
                      }}
                    >
                      From {t.email} ·{" "}
                      {t.user_role
                        ? t.user_role.charAt(0).toUpperCase() +
                          t.user_role.slice(1)
                        : "Unknown"}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#4b5563",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {t.message.length > 260
                        ? t.message.slice(0, 260) + "…"
                        : t.message}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                        marginTop: 2,
                      }}
                    >
                      {t.created_at
                        ? `Created ${new Date(
                            t.created_at
                          ).toLocaleString()}`
                        : ""}
                    </p>
                  </div>

                  <div
                    style={{
                      minWidth: 180,
                      textAlign: "right",
                      fontSize: 11,
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: `1px solid ${BRAND.border}`,
                          fontSize: 11,
                          color: statusColor,
                        }}
                      >
                        {status === "in_progress"
                          ? "In progress"
                          : status.charAt(0).toUpperCase() +
                            status.slice(1)}
                      </span>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 999,
                          marginLeft: 6,
                          border: `1px solid ${BRAND.border}`,
                          fontSize: 11,
                          color: priorityColor,
                        }}
                      >
                        {priority === "high"
                          ? "High priority"
                          : priority.charAt(0).toUpperCase() +
                            priority.slice(1)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      {status !== "open" && (
                        <button
                          onClick={() => updateStatus(t.id, "open")}
                          disabled={savingId === t.id}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: `1px solid #fecaca`,
                            backgroundColor: "#fef2f2",
                            color: "#b91c1c",
                            cursor:
                              savingId === t.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {savingId === t.id ? "…" : "Mark as open"}
                        </button>
                      )}
                      {status !== "in_progress" && (
                        <button
                          onClick={() =>
                            updateStatus(t.id, "in_progress")
                          }
                          disabled={savingId === t.id}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "none",
                            backgroundColor: "#facc15",
                            color: "#78350f",
                            cursor:
                              savingId === t.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {savingId === t.id ? "…" : "In progress"}
                        </button>
                      )}
                      {status !== "resolved" && (
                        <button
                          onClick={() => updateStatus(t.id, "resolved")}
                          disabled={savingId === t.id}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "none",
                            backgroundColor: "#16a34a",
                            color: "#fff",
                            cursor:
                              savingId === t.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {savingId === t.id ? "…" : "Mark as resolved"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
