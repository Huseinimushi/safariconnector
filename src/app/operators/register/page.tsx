// src/app/operators/register/page.tsx
"use client";

import React, { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";

type OperatorRow = {
  id: string;
  name: string | null;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  country: string | null;
  location: string | null;
  status: string | null;
  // slug: string | null; // unaweza kuongeza ukitaka, sio lazima kwa sasa
};

// Helper ya kutengeneza slug kutoka kwenye company name
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // badilisha spaces & symbols → dash
    .replace(/^-+|-+$/g, ""); // toa dash za mwanzo/mwisho
}

export default function OperatorRegisterPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [operatorId, setOperatorId] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg(null);

      // 1. Lazima awe logged in kama operator user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("auth error:", userError);
        setMsg("❌ Failed to check login. Please log in as an operator.");
        setLoading(false);
        return;
      }

      if (!user) {
        // Kama hana account / haja-login → peleka login
        router.replace("/operators/login");
        return;
      }

      // 2. Cheki kama tayari ana operator profile
      const { data: op, error: opError } = await supabase
        .from("operators")
        .select<OperatorRow>(
          "id, name, company_name, contact_person, email, country, location, status"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (opError) {
        console.error("operator load error:", opError);
        setMsg(
          "⚠ Could not check existing operator profile. You can still create one."
        );
        setEmail(user.email || "");
        setLoading(false);
        return;
      }

      if (op) {
        // Existing profile → edit
        setOperatorId(op.id);
        setCompanyName(op.company_name || op.name || "");
        setContactPerson(op.contact_person || "");
        setEmail(op.email || user.email || "");
        setCountry(op.country || "");
        setLocation(op.location || "");

        const statusLabel =
          !op.status || op.status === "pending"
            ? "pending admin approval"
            : op.status === "approved"
            ? "approved"
            : "not listed";

        setMsg(
          `ℹ You already have an operator profile (${statusLabel}). You can update the details below.`
        );
      } else {
        // New profile
        setEmail(user.email || "");
        setMsg(
          "ℹ Create your operator profile. After approval you’ll be able to post trips."
        );
      }

      setLoading(false);
    };

    load();
  }, [router]);

  const handleSave = async () => {
    setMsg(null);

    if (!companyName || !contactPerson || !email) {
      setMsg("❌ Please fill company name, contact person and email.");
      return;
    }

    const slug = slugify(companyName);

    setSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("auth error during save:", userError);
        setMsg("❌ Authentication problem. Please log in again as operator.");
        setSaving(false);
        router.replace("/operators/login");
        return;
      }

      if (operatorId) {
        // 🔁 Update existing operator profile
        const { error } = await supabase
          .from("operators")
          .update({
            name: companyName,
            company_name: companyName,
            contact_person: contactPerson,
            email,
            country,
            location,
            slug, // weka slug pia kwenye update
          })
          .eq("id", operatorId);

        if (error) {
          console.error(
            "operator update error:",
            JSON.stringify(error, null, 2)
          );
          setMsg(
            `❌ Failed to update operator profile: ${
              (error as any).message || "Unknown error"
            }`
          );
          setSaving(false);
          return;
        }

        setMsg("✅ Operator profile updated.");
      } else {
        // 🆕 Create new operator profile linked to this user
        const { error } = await supabase.from("operators").insert([
          {
            user_id: user.id,
            name: companyName,
            company_name: companyName,
            contact_person: contactPerson,
            email,
            country,
            location,
            slug, // 👈 IMPORTANT: fix for NOT NULL slug
            status: "pending", // admin must approve
          },
        ]);

        if (error) {
          console.error(
            "operator insert error:",
            JSON.stringify(error, null, 2)
          );
          setMsg(
            `❌ Failed to create operator profile: ${
              (error as any).message || "Unknown error"
            }`
          );
          setSaving(false);
          return;
        }

        setMsg(
          "✅ Your operator profile has been created and is pending admin approval. You can use your dashboard, but posting trips will be enabled after approval."
        );
      }
    } catch (e: any) {
      console.error("operator save unexpected error:", e);
      setMsg("❌ Unexpected error while saving operator profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/operators/login");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <main
        style={{
          backgroundColor: BG_SAND,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6B7280",
        }}
      >
        Loading operator profile setup…
      </main>
    );
  }

  return (
    <div
      style={{
        backgroundColor: BG_SAND,
        minHeight: "100vh",
        padding: "32px 16px",
      }}
    >
      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "#6B7280",
              }}
            >
              Safari Connector
            </p>
            <h1
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 24,
                fontWeight: 800,
                color: BRAND_GREEN,
              }}
            >
              {operatorId
                ? "Update your operator profile"
                : "Create operator profile"}
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: 6,
                fontSize: 13,
                color: "#4B5563",
                maxWidth: 480,
              }}
            >
              These details appear on your public operator page and are used
              when travellers send you enquiries.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid #D1D5DB",
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: "#FFFFFF",
              color: "#111827",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </section>

        <section
          style={{
            borderRadius: 20,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: "18px 18px 20px",
          }}
        >
          {msg && (
            <div
              style={{
                marginBottom: 14,
                padding: "8px 11px",
                borderRadius: 10,
                fontSize: 13,
                backgroundColor: msg.startsWith("❌")
                  ? "#FEE2E2"
                  : msg.startsWith("⚠")
                  ? "#FEF3C7"
                  : msg.startsWith("ℹ")
                  ? "#DBEAFE"
                  : "#ECFDF3",
                color: msg.startsWith("❌")
                  ? "#B91C1C"
                  : msg.startsWith("⚠")
                  ? "#92400E"
                  : msg.startsWith("ℹ")
                  ? "#1D4ED8"
                  : "#166534",
                border: "1px solid #E5E7EB",
              }}
            >
              {msg}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <label style={labelStyle}>Company name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Impala Holidays"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Contact person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Your full name"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Tanzania"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Main base / city</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Moshi, Arusha, Zanzibar…"
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "none",
                backgroundColor: BRAND_GOLD,
                color: "#111827",
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving
                ? "Saving…"
                : operatorId
                ? "Save changes"
                : "Create operator profile"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 4,
  display: "block",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  backgroundColor: "#F9FAFB",
  fontSize: 14,
};
