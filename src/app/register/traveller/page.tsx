"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND_GREEN = "#0B6B3A";
const BG_SAND = "#F4F3ED";

export default function TravellerRegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      setMsg("❌ Please fill at least name, email and password.");
      return;
    }
    if (password !== password2) {
      setMsg("❌ Passwords do not match.");
      return;
    }

    setLoading(true);
    setMsg(null);

    // 1) sign up auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMsg("❌ " + error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    // 2) create traveller profile row (UI haijabadilika, tunaongeza tu email)
    if (user) {
      try {
        await supabase.from("travellers").insert({
          user_id: user.id,
          full_name: fullName,
          email,      // 👈 hii ndo ilikuwa inakosekana awali
          phone,
          country,
        });
      } catch (e) {
        console.error("traveller profile insert error:", e);
      }
    }

    setMsg("✅ Account created. Redirecting…");
    router.push("/traveller/dashboard");
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
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            margin: 0,
            marginBottom: 10,
            fontSize: 22,
            fontWeight: 800,
            color: BRAND_GREEN,
          }}
        >
          Create Traveller Account
        </h1>

        <p
          style={{
            textAlign: "center",
            margin: 0,
            marginBottom: 20,
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          Save your safari enquiries, favourite trips and chat with tour
          operators in one place.
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

        {/* Full name */}
        <label
          style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
        >
          Full name
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Maria Delgado"
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

        {/* Email */}
        <label
          style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
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
            marginTop: 4,
            marginBottom: 12,
            padding: 10,
            fontSize: 14,
            borderRadius: 8,
            border: "1px solid #D1D5DB",
          }}
        />

        {/* Phone & country inline */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div>
            <label
              style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
            >
              Phone (incl. country code)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+255 ..."
              style={{
                width: "100%",
                marginTop: 4,
                padding: 10,
                fontSize: 14,
                borderRadius: 8,
                border: "1px solid #D1D5DB",
              }}
            />
          </div>
          <div>
            <label
              style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
            >
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. Spain"
              style={{
                width: "100%",
                marginTop: 4,
                padding: 10,
                fontSize: 14,
                borderRadius: 8,
                border: "1px solid #D1D5DB",
              }}
            />
          </div>
        </div>

        {/* Passwords */}
        <label
          style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
        >
          Password
        </label>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create password"
            style={{
              width: "100%",
              marginTop: 4,
              marginBottom: 12,
              padding: "10px 40px 10px 10px",
              fontSize: 14,
              borderRadius: 8,
              border: "1px solid #D1D5DB",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              color: BRAND_GREEN,
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <label
          style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
        >
          Confirm password
        </label>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword2 ? "text" : "password"}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="Repeat password"
            style={{
              width: "100%",
              marginTop: 4,
              marginBottom: 20,
              padding: "10px 40px 10px 10px",
              fontSize: 14,
              borderRadius: 8,
              border: "1px solid #D1D5DB",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword2((v) => !v)}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              color: BRAND_GREEN,
            }}
          >
            {showPassword2 ? "Hide" : "Show"}
          </button>
        </div>

        <button
          onClick={handleRegister}
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
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            marginTop: 16,
            color: "#6B7280",
          }}
        >
          Already have an account?{" "}
          <a href="/login/traveller" style={{ color: BRAND_GREEN, fontWeight: 600 }}>
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
