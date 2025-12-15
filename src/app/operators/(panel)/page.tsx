"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
};

export default function OperatorsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [operator, setOperator] = useState<OperatorRow | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg(null);

      // 1) Check logged in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("auth error:", userError);
        setMsg("❌ Failed to check login. Please try again.");
        setLoading(false);
        return;
      }

      if (!user) {
        // not logged in → go to operator login
        router.push("/operators/login");
        return;
      }

      // 2) Load operator profile for this user
      const { data: op, error: opError } = await supabase
        .from("operators")
        .select(
          "id, company_name, contact_person, email, country, location, status"
        )
        .eq("user_id", user.id)
        .single();

      if (opError) {
        console.error("operator load error:", opError);

        // If no operator row yet → go to registration
        if (
          opError.code === "PGRST116" ||
          opError.message?.includes("No rows")
        ) {
          router.push("/operators/register");
          return;
        }

        setMsg("❌ Failed to load operator profile.");
        setLoading(false);
        return;
      }

      setOperator(op as OperatorRow);
      setLoading(false);
    };

    load();
  }, [router]);

  const handleGoToTrips = () => {
    router.push("/operators/trips");
  };

  const handleLogout = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await supabase.auth.signOut();
      router.push("/operators/login");
    } catch (err: any) {
      console.error("logout error:", err);
      setMsg("❌ Failed to log out. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "80vh",
          backgroundColor: BG_SAND,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6B7280",
        }}
      >
        Loading your operator account…
      </main>
    );
  }

  if (!operator) {
    // In case something went wrong above and we didn't redirect
    return (
      <main
        style={{
          minHeight: "80vh",
          backgroundColor: BG_SAND,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#B91C1C",
          padding: 16,
          textAlign: "center",
        }}
      >
        We couldn&apos;t find an operator profile linked to your account.
        Please create your operator profile.
      </main>
    );
  }

  const isPending = operator.status !== "approved";

  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "24px 16px 64px",
          opacity: busy ? 0.7 : 1,
          pointerEvents: busy ? "none" : "auto",
        }}
      >
        {/* Header */}
        <section
          style={{
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: "16px 20px 14px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
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
              Operator overview
            </p>
            <h1
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 24,
                fontWeight: 800,
                color: BRAND_GREEN,
              }}
            >
              Welcome back, {operator.company_name || "Safari operator"}
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 13,
                color: "#4B5563",
                maxWidth: 560,
              }}
            >
              Manage your trips, quotes and bookings in the operator dashboard.
              Keep your profile complete so Safari Connector can send you more
              qualified enquiries.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <span
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                backgroundColor: isPending ? "#FEF3C7" : "#ECFDF3",
                color: isPending ? "#92400E" : "#166534",
                textTransform: "capitalize",
              }}
            >
              {isPending ? "pending approval" : "approved operator"}
            </span>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleGoToTrips}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: BRAND_GOLD,
                  color: "#111827",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                }}
              >
                Go to trips & enquiries
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid #D1D5DB",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  backgroundColor: "#FFFFFF",
                  color: "#111827",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </section>

        {/* Global message */}
        {msg && (
          <div
            style={{
              marginBottom: 14,
              borderRadius: 12,
              padding: "8px 12px",
              fontSize: 13,
              backgroundColor: msg.startsWith("❌")
                ? "#FEE2E2"
                : msg.startsWith("⚠")
                ? "#FEF3C7"
                : "#ECFDF5",
              color: msg.startsWith("❌")
                ? "#B91C1C"
                : msg.startsWith("⚠")
                ? "#92400E"
                : "#166534",
              border: `1px solid ${
                msg.startsWith("❌")
                  ? "#FECACA"
                  : msg.startsWith("⚠")
                  ? "#FDE68A"
                  : "#BBF7D0"
              }`,
            }}
          >
            {msg}
          </div>
        )}

        {/* Simple profile summary card */}
        <section
          style={{
            borderRadius: 20,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: "16px 16px 18px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Your operator profile
          </h2>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 13,
              color: "#6B7280",
            }}
          >
            These details are visible to travellers on your public profile.
          </p>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              fontSize: 13,
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
              }}
            >
              <div style={{ color: "#6B7280", marginBottom: 2 }}>
                Company name
              </div>
              <div style={{ fontWeight: 600, color: "#111827" }}>
                {operator.company_name || "Not set"}
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
              }}
            >
              <div style={{ color: "#6B7280", marginBottom: 2 }}>
                Contact person
              </div>
              <div style={{ fontWeight: 600, color: "#111827" }}>
                {operator.contact_person || "Not set"}
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
              }}
            >
              <div style={{ color: "#6B7280", marginBottom: 2 }}>Email</div>
              <div style={{ fontWeight: 600, color: "#111827" }}>
                {operator.email || "Not set"}
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
              }}
            >
              <div style={{ color: "#6B7280", marginBottom: 2 }}>
                Location
              </div>
              <div style={{ fontWeight: 600, color: "#111827" }}>
                {operator.location || operator.country || "Not set"}
              </div>
            </div>
          </div>

          <p
            style={{
              margin: 0,
              marginTop: 14,
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            To change your profile details, go to{" "}
            <strong>Account settings</strong> (coming soon) or contact the Safari
            Connector support team.
          </p>
        </section>
      </main>
    </div>
  );
}
