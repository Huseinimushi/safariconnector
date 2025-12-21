// src/app/operators/[id]/edit/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";

type OperatorRow = {
  id: string;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  status: string | null;
  country: string | null;
  location: string | null;
};

export default function OperatorEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const operatorId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!operatorId) {
        setMsg("❌ Missing operator id in URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setMsg(null);

      // 1) hakikisha user yupo logged-in
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
        setMsg("❌ Please login as an operator to edit your profile.");
        setLoading(false);
        return;
      }

      // 2) load operator kwa id (RLS itazuia kama si wake)
      const { data, error } = await supabase
        .from("operators")
        .select(
          "id, company_name, contact_person, email, country, location, status"
        )
        .eq("id", operatorId)
        .maybeSingle();

      if (error) {
        console.error("operator load error:", error);
        setMsg("❌ Failed to load operator profile.");
        setLoading(false);
        return;
      }

      if (!data) {
        setMsg("❌ Operator profile not found.");
        setLoading(false);
        return;
      }

      const op = data as OperatorRow;

      setCompanyName(op.company_name || "");
      setContactPerson(op.contact_person || "");
      setEmail(op.email || "");
      setCountry(op.country || "");
      setLocation(op.location || "");
      setStatus(op.status || null);

      setLoading(false);
    };

    load();
  }, [operatorId]);

  const handleSave = async () => {
    if (!operatorId) return;

    if (!companyName) {
      setMsg("❌ Please enter your company name.");
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const { error } = await supabase
        .from("operators")
        .update({
          company_name: companyName,
          contact_person: contactPerson || null,
          email: email || null,
          country: country || null,
          location: location || null,
        })
        .eq("id", operatorId);

      if (error) {
        console.error("operator update error:", error);
        setMsg("❌ Failed to save changes. Please check your data and try again.");
      } else {
        setMsg("✅ Profile updated successfully.");
        // optional: rudi dashboard baada ya sekunde chache
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      }
    } catch (e: any) {
      console.error(e);
      setMsg("❌ Unexpected error while saving your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main
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
        Loading operator profile…
      </main>
    );
  }

  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "32px 16px 80px",
        }}
      >
        {/* Header */}
        <section style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            style={{
              border: "none",
              background: "transparent",
              color: BRAND_GREEN,
              fontSize: 13,
              cursor: "pointer",
              marginBottom: 6,
            }}
          >
            ← Back to dashboard
          </button>

          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              color: BRAND_GREEN,
              marginBottom: 4,
            }}
          >
            Edit operator profile
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            Keep your company details up to date so travellers know who they are
            booking with.
          </p>
        </section>

        {msg && (
          <div
            style={{
              marginBottom: 16,
              padding: "9px 12px",
              borderRadius: 12,
              border: "1px solid #E5E7EB",
              backgroundColor: msg.startsWith("✅")
                ? "#ECFDF3"
                : msg.startsWith("❌")
                ? "#FEE2E2"
                : "#FEF3C7",
              color: msg.startsWith("✅")
                ? "#166534"
                : msg.startsWith("❌")
                ? "#B91C1C"
                : "#92400E",
              fontSize: 13,
            }}
          >
            {msg}
          </div>
        )}

        <section
          style={{
            borderRadius: 18,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: "18px 18px 20px",
          }}
        >
          {/* Status badge */}
          {status && (
            <div
              style={{
                marginBottom: 12,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#6B7280",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Profile status</span>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  backgroundColor:
                    status === "approved" ? "#ECFDF3" : "#FEF3C7",
                  color: status === "approved" ? "#166534" : "#92400E",
                  textTransform: "capitalize",
                  fontWeight: 600,
                }}
              >
                {status}
              </span>
            </div>
          )}

          {/* Form fields */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 12,
              fontSize: 13,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                }}
              >
                Company name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Savannah Trails"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                }}
              >
                Contact person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Hussein Amini"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                }}
              >
                Company email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 10,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Location / city
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Arusha"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Tanzania"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              style={{
                padding: "9px 16px",
                borderRadius: 999,
                border: "none",
                backgroundColor: "#E5E7EB",
                color: "#374151",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "9px 18px",
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
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </section>
      </main>
    </div>
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
