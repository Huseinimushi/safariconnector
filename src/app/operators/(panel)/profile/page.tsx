// src/app/operators/profile/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

/* ---------- Types ---------- */

type OperatorRow = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  company_name?: string | null;
  country?: string | null;
  city?: string | null;
  location?: string | null;
  description?: string | null;
  about?: string | null;
  contact_person?: string | null;
  contact_name?: string | null;
  email?: string | null;
  operator_email?: string | null;
  contact_phone?: string | null;
  phone?: string | null;
  website?: string | null;
  operator_website?: string | null;
  [key: string]: any;
};

export default function OperatorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // form fields
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");

  /* ---------- Load operator (direct from operators table) ---------- */

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      setStatusMsg(null);

      try {
        // 1) current user
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userResp?.user) {
          console.error("operator profile auth error:", userErr);
          if (!isMounted) return;
          setErrorMsg("Please log in as an operator to edit your profile.");
          setLoading(false);
          return;
        }

        const user = userResp.user;

        // 2) operator row from operators table
        const { data: opRow, error: opErr } = await supabase
          .from("operators")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (opErr) {
          console.error(
            "operators profile load error:",
            opErr,
            "message:",
            (opErr as any)?.message,
            "details:",
            (opErr as any)?.details,
            "code:",
            (opErr as any)?.code
          );
          if (!isMounted) return;
          setErrorMsg(
            "We couldn’t find your operator profile in the operators table. Please contact support to get set up."
          );
          setOperator(null);
          setLoading(false);
          return;
        }

        if (!isMounted) return;

        const operatorRow = opRow as OperatorRow;
        setOperator(operatorRow);

        // seed form fields from this row
        const nameField =
          operatorRow.company_name ||
          operatorRow.name ||
          "";

        const countryField = operatorRow.country || "";
        const cityField =
          operatorRow.city ||
          operatorRow.location ||
          "";

        const descField =
          operatorRow.description ||
          operatorRow.about ||
          "";

        const contactNameField =
          operatorRow.contact_person ||
          operatorRow.contact_name ||
          "";

        const emailField =
          operatorRow.email ||
          operatorRow.operator_email ||
          "";

        const phoneField =
          operatorRow.phone ||
          operatorRow.contact_phone ||
          "";

        const websiteField =
          operatorRow.website ||
          operatorRow.operator_website ||
          "";

        setCompanyName(nameField);
        setCountry(countryField);
        setCity(cityField);
        setDescription(descField);
        setContactName(contactNameField);
        setContactEmail(emailField);
        setContactPhone(phoneField);
        setWebsite(websiteField);
      } catch (err: any) {
        console.error("operator profile exception:", err);
        if (isMounted) {
          setErrorMsg("Unexpected error while loading your profile.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  /* ---------- Submit ---------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);

    if (!operator) {
      setErrorMsg("No operator profile loaded.");
      return;
    }

    if (!companyName || !contactEmail) {
      setErrorMsg("Please fill in company name and contact email.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        company_name: companyName || null,
        country: country || null,
        city: city || null,
        description: description || null,
        contact_person: contactName || null, // assumes column exists
        email: contactEmail || null,         // ✅ column email
        phone: contactPhone || null,         // ✅ column phone
        website: website || null,
      };

      const { error } = await supabase
        .from("operators")
        .update(payload)
        .eq("id", operator.id);

      if (error) {
        console.error(
          "operator profile update error:",
          error,
          "message:",
          (error as any)?.message,
          "details:",
          (error as any)?.details,
          "code:",
          (error as any)?.code
        );
        setErrorMsg("Failed to save changes. Please try again.");
      } else {
        setStatusMsg("✅ Profile updated successfully.");
      }
    } catch (err: any) {
      console.error("operator profile update exception:", err);
      setErrorMsg("Unexpected error while saving your profile.");
    } finally {
      setSaving(false);
    }
  };

  const operatorNameDisplay =
    companyName ||
    operator?.company_name ||
    operator?.name ||
    "Tour Operator";

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "32px 16px 64px",
      }}
    >
      {/* Top heading + back button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#9CA3AF",
              marginBottom: 6,
            }}
          >
            Safari Connector
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: "#14532D",
            }}
          >
            Tour Operator Dashboard
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            Edit your public Safari Connector profile for{" "}
            <strong>{operatorNameDisplay}</strong>.
          </p>
        </div>

        <Link
          href="/operators/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid #D1D5DB",
            backgroundColor: "#FFFFFF",
            fontSize: 13,
            fontWeight: 500,
            color: "#374151",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 16 }}>←</span>
          <span>Back to dashboard</span>
        </Link>
      </div>

      {errorMsg && (
        <div
          style={{
            marginTop: 16,
            marginBottom: 12,
            borderRadius: 16,
            padding: "10px 12px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            fontSize: 13,
            color: "#B91C1C",
          }}
        >
          {errorMsg}
        </div>
      )}

      {statusMsg && (
        <div
          style={{
            marginTop: 8,
            marginBottom: 12,
            borderRadius: 16,
            padding: "8px 10px",
            backgroundColor: "#ECFDF5",
            border: "1px solid #BBF7D0",
            fontSize: 13,
            color: "#166534",
          }}
        >
          {statusMsg}
        </div>
      )}

      <section
        style={{
          marginTop: 20,
          borderRadius: 24,
          backgroundColor: "#FFFFFF",
          border: "1px solid #E5E7EB",
          padding: "18px 18px 20px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: "#111827",
          }}
        >
          Company profile
        </h2>
        <p
          style={{
            margin: 0,
            marginTop: 4,
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          These details appear on your public Safari Connector operator page.
          Keep them accurate and up to date.
        </p>

        {loading ? (
          <div
            style={{
              marginTop: 18,
              fontSize: 13,
              color: "#6B7280",
            }}
          >
            Loading profile…
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
              fontSize: 13,
            }}
          >
            {/* Company name */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{
                  fontSize: 12,
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                Company name *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                style={{
                  padding: "7px 9px",
                  borderRadius: 10,
                  border: "1px solid #D1D5DB",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Country */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{
                  fontSize: 12,
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Tanzania"
                style={{
                  padding: "7px 9px",
                  borderRadius: 10,
                  border: "1px solid #D1D5DB",
                  fontSize: 13,
                }}
              />
            </div>

            {/* City */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{
                  fontSize: 12,
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                City / base location
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Arusha"
                style={{
                  padding: "7px 9px",
                  borderRadius: 10,
                  border: "1px solid #D1D5DB",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Contact name */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{
                  fontSize: 12,
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                Primary contact name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Name travellers will see"
                style={{
                  padding: "7px 9px",
                  borderRadius: 10,
                  border: "1px solid #D1D5DB",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Contact email */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{
                  fontSize: 12,
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                Contact email *
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                style={{
                  padding: "7px 9px",
                  borderRadius: 10,
                  border: "1px solid #D1D5DB",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Contact phone */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{
                  fontSize: 12,
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                Contact phone / WhatsApp
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+255 xxx xxx xxx"
                style={{
                  padding: "7px 9px",
                  borderRadius: 10,
                  border: "1px solid #D1D5DB",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Website */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{
                  fontSize: 12,
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                style={{
                  padding: "7px 9px",
                  borderRadius: 10,
                  border: "1px solid #D1D5DB",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Description full width */}
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <label
                style={{
                  fontSize: 12,
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                Company description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Tell travellers about your experience, destinations you cover, and what makes your safaris special."
                style={{
                  padding: "7px 9px",
                  borderRadius: 10,
                  border: "1px solid #D1D5DB",
                  fontSize: 13,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Save button */}
            <div
              style={{
                gridColumn: "1 / -1",
                marginTop: 8,
                display: "flex",
                justifyContent: "flex-start",
                gap: 8,
              }}
            >
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "none",
                  backgroundColor: "#0B6B3A",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: saving ? "wait" : "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  opacity: saving ? 0.85 : 1,
                }}
              >
                {saving ? "Saving changes…" : "Save profile"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
