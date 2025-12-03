// src/app/update-password/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      setChecking(true);
      setMsg(null);

      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        console.error("update-password: no valid user session", error);
        setHasSession(false);
        setMsg(
          "❌ This password reset link is invalid or has expired. Please request a new reset email."
        );
      } else {
        setHasSession(true);
      }

      setChecking(false);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasSession) {
      setMsg(
        "❌ No active reset session. Please use the password reset link from your email again."
      );
      return;
    }

    if (!newPassword || !newPassword2) {
      setMsg("❌ Please fill in both password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setMsg("❌ Password should be at least 6 characters.");
      return;
    }

    if (newPassword !== newPassword2) {
      setMsg("❌ Passwords do not match.");
      return;
    }

    setSaving(true);
    setMsg(null);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("update password error:", error);
      setMsg("❌ " + (error.message || "Failed to update password."));
    } else {
      setMsg(
        "✅ Your password has been updated successfully. You can now login with your new password."
      );
    }

    setSaving(false);
  };

  if (checking) {
    return (
      <div
        style={{
          backgroundColor: BG_SAND,
          minHeight: "100vh",
          padding: "40px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6B7280",
          fontSize: 14,
        }}
      >
        Checking your reset link…
      </div>
    );
  }

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
          Set a new password
        </h1>

        <p
          style={{
            margin: 0,
            marginBottom: 16,
            textAlign: "center",
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          Choose a strong password you haven&apos;t used before on Safari
          Connector. Hii itatumika kwa akaunti yako – iwe unalogin kama
          traveller au operator.
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

        {hasSession ? (
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
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              style={{
                width: "100%",
                padding: 10,
                fontSize: 14,
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                marginBottom: 10,
              }}
            />

            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 4,
              }}
            >
              Confirm new password
            </label>
            <input
              type="password"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              placeholder="Repeat new password"
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
              disabled={saving}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 999,
                border: "none",
                backgroundColor: BRAND_GREEN,
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Updating password…" : "Update password"}
            </button>
          </form>
        ) : (
          <div style={{ fontSize: 13, color: "#4B5563", marginTop: 4 }}>
            <p style={{ marginTop: 0, marginBottom: 10 }}>
              If you reached this page from an old or invalid link, you can
              request a new password reset email.
            </p>
            <a
              href="/reset-password"
              style={{
                color: BRAND_GREEN,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Request a new reset link →
            </a>
          </div>
        )}

        {/* Links za logins baada ya success */}
        <div
          style={{
            marginTop: 18,
            borderTop: "1px dashed #E5E7EB",
            paddingTop: 12,
            fontSize: 12,
            color: "#6B7280",
          }}
        >
          <p style={{ margin: 0, marginBottom: 6, textAlign: "center" }}>
            Ready to login?
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/login/traveller"
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: "1px solid #D1D5DB",
                textDecoration: "none",
                fontSize: 12,
                color: "#374151",
                backgroundColor: "#F9FAFB",
              }}
            >
              Traveller login
            </a>
            <a
              href="/operators/login"
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: "1px solid #D1D5DB",
                textDecoration: "none",
                fontSize: 12,
                color: "#374151",
                backgroundColor: "#F9FAFB",
              }}
            >
              Operator login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
