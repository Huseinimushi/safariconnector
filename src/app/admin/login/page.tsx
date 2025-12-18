"use client";

import React, { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";

// Admins allowed to access this panel
const ADMIN_EMAILS = ["admin@safariconnector.com"].map((e) =>
  e.toLowerCase()
);

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@safariconnector.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      // 1) Normal Supabase password sign-in (client side)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data?.user) {
        console.error("admin login error:", error);
        setErrorMsg(error?.message || "Invalid email or password.");
        return;
      }

      const user = data.user;
      const userEmail = (user.email || "").toLowerCase();

      // 2) Simple admin allow-list
      if (!ADMIN_EMAILS.includes(userEmail)) {
        await supabase.auth.signOut();
        setErrorMsg("This account is not allowed to access the admin panel.");
        return;
      }

      // 3) Success → go to admin dashboard
      router.replace("/admin");
      router.refresh();
    } catch (err: any) {
      console.error("admin login exception:", err);
      setErrorMsg(err?.message || "Unexpected error during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: BG_SAND,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          border: "1px solid #E5E7EB",
          padding: "24px 22px 26px",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: BRAND_GREEN,
          }}
        >
          Admin sign in
        </h1>
        <p
          style={{
            margin: 0,
            marginTop: 6,
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          Use your Safari Connector admin credentials to access the control
          center.
        </p>

        {errorMsg && (
          <div
            style={{
              marginTop: 14,
              marginBottom: 10,
              padding: "8px 10px",
              borderRadius: 10,
              fontSize: 13,
              backgroundColor: "#FEE2E2",
              color: "#B91C1C",
              border: "1px solid #FECACA", // ← fixed
            }}
          >
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ marginTop: 18, display: "grid", gap: 12 }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 4,
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="admin@safariconnector.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 4,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "10px 14px",
              borderRadius: 999,
              border: "none",
              backgroundColor: "#FCD34D",
              color: "#111827",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign in as admin"}
          </button>
        </form>
      </div>
    </main>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  backgroundColor: "#F9FAFB",
  fontSize: 14,
};
