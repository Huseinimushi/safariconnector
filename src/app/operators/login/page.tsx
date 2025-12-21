// src/app/login/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";

export default function OperatorLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setMsg("❌ Please enter both email and password.");
      return;
    }

    setLoading(true);
    setMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("operator login error:", error);
      setMsg("❌ " + (error.message || "Failed to login."));
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setMsg("❌ Login succeeded but no user returned.");
      setLoading(false);
      return;
    }

    // After login, try to find operator profile for this user
    const { data: op, error: opError } = await supabase
      .from("operators")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (opError) {
      console.error("operator lookup error:", opError);
      // hata kama kuna error ya lookup, tumpeleke dashboard
      router.push("/dashboard");
      setLoading(false);
      return;
    }

    if (!op) {
      // hana profile bado – mpeleke kwenye registration
      router.push("/register");
    } else {
      router.push("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        backgroundColor: BG_SAND,
        minHeight: "100vh",
        padding: "40px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 460,
          margin: "0 auto",
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          border: "1px solid #E5E7EB",
          padding: "28px 26px",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            margin: 0,
            marginBottom: 10,
            fontSize: 26,
            fontWeight: 800,
            color: BRAND_GREEN,
          }}
        >
          Operator Login
        </h1>

        <p
          style={{
            textAlign: "center",
            margin: 0,
            marginBottom: 18,
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          Login to access your Safari Connector operator dashboard.
        </p>

        {msg && (
          <div
            style={{
              marginBottom: 14,
              padding: "8px 12px",
              fontSize: 13,
              borderRadius: 10,
              backgroundColor: msg.startsWith("❌") ? "#FEE2E2" : "#ECFDF5",
              color: msg.startsWith("❌") ? "#B91C1C" : "#166534",
              border: msg.startsWith("❌")
                ? "1px solid #FECACA"
                : "1px solid #BBF7D0",
            }}
          >
            {msg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label
            style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              marginBottom: 12,
              padding: 10,
              fontSize: 14,
              borderRadius: 8,
              border: "1px solid #D1D5DB",
            }}
          />

          <label
            style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: 10,
              fontSize: 14,
              borderRadius: 8,
              border: "1px solid #D1D5DB",
            }}
          />

          {/* Forgot password link */}
          <div
            style={{
              marginTop: 6,
              marginBottom: 16,
              fontSize: 12,
              textAlign: "right",
            }}
          >
            <a
              href="/reset-password"
              style={{ color: BRAND_GREEN, textDecoration: "none" }}
            >
              Forgot your password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 999,
              border: "none",
              backgroundColor: BRAND_GREEN,
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            marginTop: 16,
            color: "#6B7280",
          }}
        >
          Don&apos;t have an operator account?{" "}
          <a href="/register" style={{ color: BRAND_GREEN }}>
            Apply as operator
          </a>
        </p>
      </div>
    </div>
  );
}
