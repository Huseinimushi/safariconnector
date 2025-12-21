"use client";

import React, { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";

export default function OperatorSignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Kama tayari kashalogin operator, msirudishe sign up tena
  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        router.replace("/register");
        return;
      }
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!email || !password || !password2) {
      setMsg("❌ Please fill email and both password fields.");
      return;
    }

    if (password !== password2) {
      setMsg("❌ Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setMsg("❌ Password should be at least 6 characters.");
      return;
    }

    setSaving(true);

    try {
      // CREATE AUTH USER
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "operator",
          },
        },
      });

      if (error || !data?.user) {
        console.error("operator signUp error:", error);
        setMsg(
          error?.message ||
            "❌ Failed to create operator account. Email may already be in use."
        );
        setSaving(false);
        return;
      }

      setDone(true);
      setMsg(
        "✅ Operator account created. Now complete your company profile so an admin can approve you."
      );

      // redirect to profile page
      setTimeout(() => {
        router.replace("/register");
      }, 1200);
    } catch (e: any) {
      console.error(e);
      setMsg("❌ Unexpected error while creating operator account.");
    } finally {
      setSaving(false);
    }
  };

  const handleGoToLogin = () => {
    router.push("/login");
  };

  if (loading) {
    return (
      <main
        style={{
          backgroundColor: BG_SAND,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6B7280",
        }}
      >
        Checking account…
      </main>
    );
  }

  return (
    <div
      style={{
        backgroundColor: BG_SAND,
        minHeight: "100vh",
        padding: "32px 16px",
      }}
    >
      <main style={{ maxWidth: 480, margin: "0 auto" }}>
        <section style={{ marginBottom: 18 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#6B7280",
            }}
          >
            Safari Connector
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
            Operator sign up
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 6,
              fontSize: 13,
              color: "#4B5563",
            }}
          >
            Create your login details. On the next step you’ll add your company
            profile so an admin can approve your account.
          </p>
        </section>

        <section
          style={{
            borderRadius: 20,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: "18px 18px 20px",
          }}
        >
          {msg && (
            <div
              style={{
                marginBottom: 14,
                padding: "8px 11px",
                borderRadius: 10,
                fontSize: 13,
                backgroundColor: msg.startsWith("❌")
                  ? "#FEE2E2"
                  : "#ECFDF3",
                color: msg.startsWith("❌") ? "#B91C1C" : "#166534",
                border: "1px solid #E5E7EB",
              }}
            >
              {msg}
            </div>
          )}

          <form
            onSubmit={handleSignup}
            style={{
              display: "grid",
              gap: 14,
              opacity: done ? 0.6 : 1,
              pointerEvents: done ? "none" : "auto",
            }}
          >
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a secure password"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Confirm password</label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Repeat your password"
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={saving || done}
              style={{
                marginTop: 4,
                padding: "10px 16px",
                borderRadius: 999,
                border: "none",
                backgroundColor: BRAND_GOLD,
                color: "#111827",
                fontSize: 14,
                fontWeight: 700,
                cursor: saving || done ? "default" : "pointer",
                opacity: saving || done ? 0.7 : 1,
              }}
            >
              {saving ? "Creating account…" : "Create operator account"}
            </button>
          </form>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            <span>Already have an account?</span>
            <button
              type="button"
              onClick={handleGoToLogin}
              style={{
                fontSize: 12,
                textDecoration: "underline",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: BRAND_GREEN,
              }}
            >
              Go to operator login →
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 4,
  display: "block",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  backgroundColor: "#F9FAFB",
  fontSize: 14,
};
