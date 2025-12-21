// src/app/admin/operators-overview/page.tsx
"use client";

import React, { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";
const CARD_BORDER = "#E5E7EB";

type OperatorRow = {
  id: string;
  company_name: string | null;
  country: string | null;
  location: string | null;
  email: string | null;
  status: string | null;
  created_at: string | null;
};

type OperatorStats = {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
};

export default function AdminOperatorsOverviewPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [stats, setStats] = useState<OperatorStats>({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  const [pendingOperators, setPendingOperators] = useState<OperatorRow[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // 🔐 simple admin check for this page
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user) {
          router.replace("/login");
          return;
        }

        const user = data.user;
        const email = (user.email || "").toLowerCase();
        const metaRole =
          (user.app_metadata?.role as string | undefined) ||
          (user.user_metadata?.role as string | undefined) ||
          null;

        const isAdmin =
          email === "admin@safariconnector.com" ||
          (metaRole && metaRole.toLowerCase() === "admin");

        if (!isAdmin) {
          router.replace("/");
          return;
        }

        setAllowed(true);
      } catch (e) {
        console.error("admin check error (overview):", e);
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, [router]);

  // load operators once admin allowed
  useEffect(() => {
    if (!allowed) return;

    const load = async () => {
      setLoading(true);
      setMsg(null);

      const { data, error } = await supabase
        .from("operators")
        // ✅ FIX: do NOT use .select<OperatorRow>(...) here
        .select("id, company_name, country, location, email, status, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("operators load error:", error);
        setMsg("❌ Failed to load operators. Please try again.");
        setLoading(false);
        return;
      }

      const operators = ((data || []) as unknown) as OperatorRow[];

      const total = operators.length;
      const approved = operators.filter((op) => op.status === "approved").length;
      const pending = operators.filter(
        (op) => !op.status || op.status === "pending"
      ).length;
      const rejected = operators.filter(
        (op) => op.status === "rejected" || op.status === "blocked"
      ).length;

      setStats({ total, approved, pending, rejected });

      const pendingList = operators.filter(
        (op) => !op.status || op.status === "pending"
      );
      setPendingOperators(pendingList);

      setLoading(false);
    };

    load();
  }, [allowed]);

  const handleUpdateStatus = async (
    operatorId: string,
    newStatus: "approved" | "rejected"
  ) => {
    setMsg(null);
    setUpdatingId(operatorId);

    const { error } = await supabase
      .from("operators")
      .update({ status: newStatus })
      .eq("id", operatorId);

    if (error) {
      console.error("update operator status error:", error);
      setMsg("❌ Failed to update operator status. Please try again.");
      setUpdatingId(null);
      return;
    }

    setPendingOperators((prev) => prev.filter((op) => op.id !== operatorId));

    setStats((prev) => ({
      total: prev.total,
      approved: newStatus === "approved" ? prev.approved + 1 : prev.approved,
      pending: Math.max(prev.pending - 1, 0),
      rejected: newStatus === "rejected" ? prev.rejected + 1 : prev.rejected,
    }));

    setMsg(
      newStatus === "approved"
        ? "✅ Operator approved successfully."
        : "✅ Operator marked as rejected."
    );
    setUpdatingId(null);
  };

  if (checking) {
    return <main style={fullPageCenter}>Checking admin access…</main>;
  }

  if (!allowed) return null;

  if (loading) {
    return <main style={fullPageCenter}>Loading operators overview…</main>;
  }

  return (
    <div
      style={{
        backgroundColor: BG_SAND,
        minHeight: "100vh",
        padding: "32px 16px 40px",
      }}
    >
      <main style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header style={{ marginBottom: 28 }}>
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
              marginTop: 6,
              fontSize: 30,
              fontWeight: 800,
              color: BRAND_GREEN,
            }}
          >
            Operators overview & approvals
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 6,
              fontSize: 14,
              color: "#4B5563",
              maxWidth: 640,
            }}
          >
            Review new operator applications, approve trusted suppliers, and keep
            Safari Connector&apos;s marketplace curated and safe.
          </p>
        </header>

        {msg && (
          <div
            style={{
              marginBottom: 18,
              padding: "9px 12px",
              borderRadius: 10,
              fontSize: 13,
              backgroundColor: msg.startsWith("❌") ? "#FEE2E2" : "#ECFDF3",
              color: msg.startsWith("❌") ? "#B91C1C" : "#166534",
              border: `1px solid ${CARD_BORDER}`,
            }}
          >
            {msg}
          </div>
        )}

        {/* Stats */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 26,
          }}
        >
          <div style={statCard}>
            <p style={statLabel}>Total operators</p>
            <p style={statValue}>{stats.total}</p>
            <p style={statSub}>
              Companies currently registered on Safari Connector.
            </p>
          </div>
          <div style={statCard}>
            <p style={statLabel}>Approved & active</p>
            <p style={statValue}>{stats.approved}</p>
            <p style={statSub}>
              Operators visible to travellers and able to receive requests.
            </p>
          </div>
          <div style={statCard}>
            <p style={statLabel}>Pending review</p>
            <p style={statValue}>{stats.pending}</p>
            <p style={statSub}>
              New or updated operators waiting for your approval.
            </p>
          </div>
          <div style={statCard}>
            <p style={statLabel}>Rejected / blocked</p>
            <p style={statValue}>{stats.rejected}</p>
            <p style={statSub}>Operators you&apos;ve chosen not to list.</p>
          </div>
        </section>

        {/* Pending list */}
        <section
          style={{
            borderRadius: 20,
            backgroundColor: "#FFFFFF",
            border: `1px solid ${CARD_BORDER}`,
            padding: "18px 18px 20px",
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: 6,
              fontSize: 18,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Pending operator applications
          </h2>
          <p
            style={{
              margin: 0,
              marginBottom: 10,
              fontSize: 13,
              color: "#6B7280",
            }}
          >
            Approve trusted suppliers so they can start receiving quote requests.
          </p>

          {pendingOperators.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6B7280" }}>
              No operators are currently waiting for approval.
            </p>
          ) : (
            <div style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
              {pendingOperators.map((op) => (
                <div
                  key={op.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: `1px solid ${CARD_BORDER}`,
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {op.company_name || "Untitled operator"}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        marginTop: 2,
                        fontSize: 12,
                        color: "#4B5563",
                      }}
                    >
                      {op.country || "Unknown country"}
                      {op.location ? ` · ${op.location}` : ""}
                    </p>
                    {op.email && (
                      <p
                        style={{
                          margin: 0,
                          marginTop: 2,
                          fontSize: 12,
                          color: "#6B7280",
                        }}
                      >
                        {op.email}
                      </p>
                    )}
                    {op.created_at && (
                      <p
                        style={{
                          margin: 0,
                          marginTop: 2,
                          fontSize: 11,
                          color: "#9CA3AF",
                        }}
                      >
                        Joined {new Date(op.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      alignItems: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        backgroundColor: "#FEF3C7",
                        color: "#92400E",
                        border: "1px solid #FCD34D",
                      }}
                    >
                      Pending review
                    </span>

                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <button
                        type="button"
                        disabled={updatingId === op.id}
                        onClick={() => handleUpdateStatus(op.id, "approved")}
                        style={{
                          padding: "6px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 999,
                          border: "none",
                          backgroundColor: "#BBF7D0",
                          color: "#14532D",
                          cursor: updatingId === op.id ? "default" : "pointer",
                          opacity: updatingId === op.id ? 0.7 : 1,
                        }}
                      >
                        {updatingId === op.id ? "Updating…" : "Approve"}
                      </button>

                      <button
                        type="button"
                        disabled={updatingId === op.id}
                        onClick={() => handleUpdateStatus(op.id, "rejected")}
                        style={{
                          padding: "6px 10px",
                          fontSize: 12,
                          fontWeight: 500,
                          borderRadius: 999,
                          border: "1px solid #FECACA",
                          backgroundColor: "#FEF2F2",
                          color: "#B91C1C",
                          cursor: updatingId === op.id ? "default" : "pointer",
                          opacity: updatingId === op.id ? 0.7 : 1,
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const fullPageCenter: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: BG_SAND,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  color: "#6B7280",
};

const statCard: CSSProperties = {
  borderRadius: 18,
  backgroundColor: "#FFFFFF",
  border: `1px solid ${CARD_BORDER}`,
  padding: "14px 16px 16px",
};

const statLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6B7280",
  margin: 0,
};

const statValue: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: "#111827",
  margin: 0,
  marginTop: 4,
};

const statSub: CSSProperties = {
  fontSize: 12,
  color: "#6B7280",
  margin: 0,
  marginTop: 4,
};
