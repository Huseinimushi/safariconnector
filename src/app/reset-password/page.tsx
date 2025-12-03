// src/app/reset-password/page.tsx
"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!email) {
      setMsg("❌ Please enter your email first.");
      return;
    }

    setSending(true);

    try {
      // HAPA NDIPO TUNAMWAMBIA SUPABASE ALETE LINK YA /update-password
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/update-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        console.error("resetPassword error:", error);
        setMsg("❌ " + (error.message || "Failed to send reset email."));
      } else {
        setMsg(
          "✅ Password reset link has been sent. Please check your email inbox (and spam)."
        );
      }
    } catch (e: any) {
      console.error(e);
      setMsg("❌ Unexpected error while sending reset email.");
    } finally {
      setSending(false);
    }
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
            margin: 0,
            marginBottom: 8,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 800,
            color: BRAND_GREEN,
          }}
        >
          Reset your password
        </h1>

        <p
          style={{
            margin: 0,
            marginBottom: 18,
            textAlign: "center",
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          Enter the email you use on Safari Connector. We&apos;ll send you a
          secure link to create a new password.
        </p>

        {msg && (
          <div
            style={{
              marginBottom: 14,
              padding: "8px 12px",
              borderRadius: 10,
              fontSize: 13,
              backgroundColor: msg.startsWith("✅") ? "#ECFDF3" : "#FEE2E2",
              color: msg.startsWith("✅") ? "#166534" : "#B91C1C",
              border: msg.startsWith("✅")
                ? "1px solid #BBF7D0"
                : "1px solid #FECACA",
            }}
          >
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 4,
            }}
          >
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              padding: 10,
              fontSize: 14,
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              marginBottom: 16,
            }}
          />

          <button
            type="submit"
            disabled={sending}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 999,
              border: "none",
              backgroundColor: BRAND_GREEN,
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 700,
              cursor: sending ? "default" : "pointer",
              opacity: sending ? 0.7 : 1,
            }}
          >
            {sending ? "Sending link…" : "Send reset link"}
          </button>
        </form>

        <p
          style={{
            margin: 0,
            marginTop: 18,
            textAlign: "center",
            fontSize: 12,
            color: "#6B7280",
          }}
        >
          Remembered your password?{" "}
          <a
            href="/login/traveller"
            style={{ color: BRAND_GREEN, fontWeight: 600 }}
          >
            Traveller login
          </a>{" "}
          ·{" "}
          <a
            href="/operators/login"
            style={{ color: BRAND_GREEN, fontWeight: 600 }}
          >
            Operator login
          </a>
        </p>
      </div>
    </div>
  );
}
