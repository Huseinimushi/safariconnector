"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@safariconnector.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      // 1. Sign in normally
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data?.user) {
        console.error("admin login error:", error);
        setErrorMsg("Invalid email or password.");
        setLoading(false);
        return;
      }

      const user = data.user;
      const userEmail = (user.email || "").toLowerCase();

      // 🔥 SIMPLE RULE: ONLY THIS EMAIL IS ADMIN
      const isAdminEmail = userEmail === "admin@safariconnector.com";

      if (!isAdminEmail) {
        // sio admin → signOut na ujumbe
        await supabase.auth.signOut();
        setErrorMsg(
          "This account is not allowed to access the admin panel."
        );
        setLoading(false);
        return;
      }

      // 2. Admin confirmed → redirect to admin dashboard
      router.replace("/admin");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Unexpected error during login.");
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
              backgroundColor: errorMsg.includes("not allowed")
                ? "#FEF3C7"
                : "#FEE2E2",
              color: errorMsg.includes("not allowed")
                ? "#92400E"
                : "#B91C1C",
              border: "1px solid #FCD34D",
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  backgroundColor: "#F9FAFB",
  fontSize: 14,
};
