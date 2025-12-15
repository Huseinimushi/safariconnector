"use client";

import React, { useEffect, useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";

type OperatorRow = {
  id: string;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  country: string | null;
  location: string | null;
  status: string | null;
  created_at: string | null;
};

export default function AdminOperatorsPage() {
  const [rows, setRows] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [msg, setMsg] = useState("");

  const loadOperators = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("operators")
      .select(
        "id, company_name, contact_person, email, country, location, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin load operators error:", error);
      setMsg("❌ Failed to load operators: " + error.message);
      setLoading(false);
      return;
    }

    setRows((data || []) as OperatorRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadOperators();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    setSavingId(id);
    setMsg("");

    const { error } = await supabase
      .from("operators")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Admin update status error:", error);
      setMsg("❌ Failed to update status: " + error.message);
      setSavingId(null);
      return;
    }

    setMsg(
      newStatus === "approved"
        ? "✅ Operator approved."
        : "✅ Operator marked as rejected."
    );
    setSavingId(null);
    loadOperators();
  };

  const filteredRows =
    statusFilter === "all"
      ? rows
      : rows.filter((r) => (r.status || "pending") === statusFilter);

  return (
    <AdminGuard>
      <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
        <main
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "32px 16px 64px",
          }}
        >
          {/* Header */}
          <section
            style={{
              marginBottom: 16,
              borderRadius: 24,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              padding: "18px 18px 14px",
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#6B7280",
                }}
              >
                Admin · Operators
              </p>
              <h1
                style={{
                  margin: 0,
                  marginTop: 4,
                  fontSize: 20,
                  fontWeight: 800,
                  color: BRAND_GREEN,
                }}
              >
                Operator applications
              </h1>
              <p
                style={{
                  margin: 0,
                  marginTop: 4,
                  fontSize: 12,
                  color: "#4B5563",
                  maxWidth: 520,
                }}
              >
                Review safari companies, verify their details and approve the
                ones that fit Safari Connector standards.
              </p>
            </div>
            <button
              onClick={() => (window.location.href = "/admin")}
              style={{
                alignSelf: "center",
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid #CBD5E1",
                backgroundColor: "#F9FAFB",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ← Back to admin home
            </button>
          </section>

          {/* Filters + message */}
          <section style={{ marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 12, color: "#6B7280" }}>
                Showing{" "}
                <strong>
                  {filteredRows.length}
                </strong>{" "}
                of {rows.length} operators
              </div>
              <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
                {(["all", "pending", "approved", "rejected"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      style={{
                        padding: "4px 9px",
                        borderRadius: 999,
                        border:
                          statusFilter === status
                            ? "1px solid transparent"
                            : "1px solid #D1D5DB",
                        backgroundColor:
                          statusFilter === status ? BRAND_GREEN : "#FFFFFF",
                        color:
                          statusFilter === status ? "#FFFFFF" : "#4B5563",
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {status}
                    </button>
                  )
                )}
              </div>
            </div>

            {msg && (
              <div
                style={{
                  marginTop: 8,
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontSize: 12,
                  backgroundColor: msg.startsWith("✅")
                    ? "#ECFDF3"
                    : "#FEF2F2",
                  color: msg.startsWith("✅") ? "#166534" : "#B91C1C",
                  border: `1px solid ${
                    msg.startsWith("✅") ? "#BBF7D0" : "#FECACA"
                  }`,
                }}
              >
                {msg}
              </div>
            )}
          </section>

          {/* Table */}
          <section
            style={{
              borderRadius: 18,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                borderBottom: "1px solid #E5E7EB",
                padding: "8px 12px",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#6B7280",
                display: "grid",
                gridTemplateColumns: "2fr 1.5fr 1.3fr 1fr 1fr",
                columnGap: 8,
              }}
            >
              <div>Company</div>
              <div>Contact</div>
              <div>Location</div>
              <div>Status</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>

            {loading ? (
              <div
                style={{
                  padding: "20px 12px",
                  fontSize: 13,
                  color: "#6B7280",
                }}
              >
                Loading operators…
              </div>
            ) : filteredRows.length === 0 ? (
              <div
                style={{
                  padding: "20px 12px",
                  fontSize: 13,
                  color: "#6B7280",
                }}
              >
                No operators found for the selected filter.
              </div>
            ) : (
              filteredRows.map((op, idx) => (
                <div
                  key={op.id}
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    display: "grid",
                    gridTemplateColumns: "2fr 1.5fr 1.3fr 1fr 1fr",
                    columnGap: 8,
                    backgroundColor:
                      idx % 2 === 0 ? "#FFFFFF" : "#F9FAFB",
                    borderTop: "1px solid #F3F4F6",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {op.company_name || "—"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                      }}
                    >
                      ID: {op.id.slice(0, 8)}…
                    </div>
                  </div>

                  <div>
                    <div>{op.contact_person || "—"}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                      }}
                    >
                      {op.email || "—"}
                    </div>
                  </div>

                  <div>
                    <div>{op.location || "—"}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                      }}
                    >
                      {op.country || "—"}
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        textTransform: "capitalize",
                        backgroundColor:
                          op.status === "approved"
                            ? "#ECFDF3"
                            : op.status === "rejected"
                            ? "#FEF2F2"
                            : "#EFF6FF",
                        color:
                          op.status === "approved"
                            ? "#166534"
                            : op.status === "rejected"
                            ? "#B91C1C"
                            : "#1D4ED8",
                      }}
                    >
                      {op.status || "pending"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 6,
                    }}
                  >
                    <button
                      disabled={
                        savingId === op.id || op.status === "approved"
                      }
                      onClick={() =>
                        handleUpdateStatus(op.id, "approved")
                      }
                      style={{
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "none",
                        backgroundColor: BRAND_GREEN,
                        color: "#FFFFFF",
                        fontSize: 11,
                        cursor:
                          savingId === op.id ||
                          op.status === "approved"
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          savingId === op.id ||
                          op.status === "approved"
                            ? 0.6
                            : 1,
                      }}
                    >
                      Approve
                    </button>
                    <button
                      disabled={
                        savingId === op.id || op.status === "rejected"
                      }
                      onClick={() =>
                        handleUpdateStatus(op.id, "rejected")
                      }
                      style={{
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "1px solid #FCA5A5",
                        backgroundColor: "#FEF2F2",
                        color: "#B91C1C",
                        fontSize: 11,
                        cursor:
                          savingId === op.id ||
                          op.status === "rejected"
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          savingId === op.id ||
                          op.status === "rejected"
                            ? 0.6
                            : 1,
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </main>
      </div>
    </AdminGuard>
  );
}
