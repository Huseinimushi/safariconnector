"use client";

import React, { useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

const BRAND = {
  ink: "#0E2430",
  primary: "#1B4D3E",
  sand: "#F4F3ED",
  border: "#E1E5ED",
};

export default function SupportPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"traveller" | "operator" | "guest">(
    "guest"
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">(
    "normal"
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user?.id ?? null,
          user_role: role,
          email,
          subject,
          message,
          priority,
          status: "open",
        });

      if (insertError) throw insertError;

      setSuccess(
        "Thanks for reaching out. Our support team will get back to you shortly."
      );
      setSubject("");
      setMessage("");
    } catch (err: any) {
      console.error("support ticket error:", err);
      setError(
        err?.message ||
          "Something went wrong while sending your message. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: BRAND.sand,
        padding: "48px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          backgroundColor: "#fff",
          borderRadius: 24,
          padding: "24px 20px 20px",
          boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
          border: `1px solid ${BRAND.border}`,
        }}
      >
        <h1
          style={{
            fontSize: "1.9rem",
            fontWeight: 600,
            color: BRAND.primary,
            marginBottom: 6,
          }}
        >
          Contact support
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#4b5563",
            marginBottom: 16,
          }}
        >
          Tell us what you need help with – our team supports both travellers
          and operators using Safari Connector.
        </p>

        {success && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid #bbf7d0",
              backgroundColor: "#dcfce7",
              color: "#166534",
              fontSize: 13,
            }}
          >
            {success}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid #fecaca",
              backgroundColor: "#fef2f2",
              color: "#b91c1c",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
                color: BRAND.ink,
              }}
            >
              Your email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%",
                padding: "9px 10px",
                borderRadius: 10,
                border: `1px solid ${BRAND.border}`,
                fontSize: 13,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 160 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 4,
                  color: BRAND.ink,
                }}
              >
                I am a…
              </label>
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "traveller" | "operator" | "guest")
                }
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 10,
                  border: `1px solid ${BRAND.border}`,
                  fontSize: 13,
                  backgroundColor: "#fff",
                }}
              >
                <option value="traveller">Traveller</option>
                <option value="operator">Safari operator</option>
                <option value="guest">Just browsing</option>
              </select>
            </div>

            <div style={{ width: 160 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 4,
                  color: BRAND.ink,
                }}
              >
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as "low" | "normal" | "high")
                }
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 10,
                  border: `1px solid ${BRAND.border}`,
                  fontSize: 13,
                  backgroundColor: "#fff",
                }}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
                color: BRAND.ink,
              }}
            >
              Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Tell us what this is about"
              style={{
                width: "100%",
                padding: "9px 10px",
                borderRadius: 10,
                border: `1px solid ${BRAND.border}`,
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
                color: BRAND.ink,
              }}
            >
              Message
            </label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share as many details as possible so we can help quickly."
              style={{
                width: "100%",
                padding: "9px 10px",
                borderRadius: 10,
                border: `1px solid ${BRAND.border}`,
                fontSize: 13,
                resize: "vertical",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              border: "none",
              backgroundColor: loading ? "#9ca3af" : BRAND.primary,
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Sending…" : "Submit request"}
          </button>
        </form>
      </div>
    </div>
  );
}
