"use client";

import React, { useState, CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND = {
  ink: "#0E2430",
  primary: "#1B4D3E",
  sand: "#F4F3ED",
  border: "#E1E5ED",
};

const pageWrapper: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: BRAND.sand,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 16px",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 420,
  backgroundColor: "#ffffff",
  borderRadius: 24,
  padding: "28px 24px 24px",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.12)",
  border: `1px solid ${BRAND.border}`,
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1) Sign in with Supabase auth
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        throw signInError;
      }

      const user = data.user;
      if (!user) {
        throw new Error("Could not load user after login.");
      }

      // 2) Check profile role = 'admin'
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("profile error:", profileError);
        throw new Error("Unable to verify admin role.");
      }

      if (!profile || (profile.role || "").toLowerCase() !== "admin") {
        // not admin → logout immediately
        await supabase.auth.signOut();
        throw new Error(
          "This account is not allowed to access the admin panel."
        );
      }

      // 3) OK → redirect to admin dashboard
      router.push("/admin");
    } catch (err: any) {
      console.error("admin login error:", err);
      setError(
        err?.message ||
          "Failed to sign in. Please check your credentials and try again."
      );
      setLoading(false);
    }
  };

  return (
    <div style={pageWrapper}>
      <div style={cardStyle}>
        <p
          style={{
            fontSize: 12,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#6b7280",
            marginBottom: 6,
          }}
        >
          Safari Connector
        </p>
        <h1
          style={{
            fontSize: "1.8rem",
            lineHeight: 1.1,
            fontWeight: 600,
            color: BRAND.primary,
            marginBottom: 8,
          }}
        >
          Admin sign in
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#4b5563",
            marginBottom: 18,
          }}
        >
          This area is for Safari Connector admins only. Use your admin email
          and password to access the control center.
        </p>

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 10px",
              borderRadius: 12,
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: BRAND.ink,
              marginBottom: 4,
            }}
          >
            Admin email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@safariconnector.com"
            style={{
              width: "100%",
              padding: "9px 10px",
              borderRadius: 10,
              border: `1px solid ${BRAND.border}`,
              fontSize: 13,
              marginBottom: 12,
            }}
          />

          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: BRAND.ink,
              marginBottom: 4,
            }}
          >
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 10px",
              borderRadius: 10,
              border: `1px solid ${BRAND.border}`,
              fontSize: 13,
              marginBottom: 16,
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 999,
              border: "none",
              backgroundColor: loading ? "#9ca3af" : BRAND.primary,
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: 8,
            }}
          >
            {loading ? "Signing in…" : "Sign in as admin"}
          </button>
        </form>

        <p
          style={{
            fontSize: 11,
            color: "#9ca3af",
            marginTop: 10,
          }}
        >
          If you&apos;re an operator or traveller, please use the normal login
          pages on Safari Connector instead.
        </p>
      </div>
    </div>
  );
}
