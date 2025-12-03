// src/app/operators/register/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";

type OperatorRow = {
  id: string;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  country: string | null;
  location: string | null;
  status: string | null;
};

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

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("auth error:", userError);
        setMsg("❌ Failed to check login. Please log in again.");
        setLoading(false);
        return;
      }

      if (!user) {
        router.push("/operators/login");
        return;
      }

      // Angalia kama tayari ana operator profile
      const { data: op, error: opError } = await supabase
        .from("operators")
        .select(
          "id, company_name, contact_person, email, country, location, status"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (opError) {
        console.error("operator load error:", opError);
        setMsg("⚠ Could not check existing operator profile. You can still create one.");
        setLoading(false);
        return;
      }

      if (op) {
        // Tuna-edit existing profile
        setOperatorId(op.id);
        setCompanyName(op.company_name || "");
        setContactPerson(op.contact_person || "");
        setEmail(op.email || user.email || "");
        setCountry(op.country || "");
        setLocation(op.location || "");
        setMsg("ℹ You already have an operator profile. You can update the details below.");
      }

      if (!op) {
        // New profile
        setEmail(user.email || "");
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

    setSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("auth error during save:", userError);
        setMsg("❌ Authentication problem. Please log in again.");
        setSaving(false);
        router.push("/operators/login");
        return;
      }

      if (operatorId) {
        // Update existing
        const { error } = await supabase
          .from("operators")
          .update({
            company_name: companyName,
            contact_person: contactPerson,
            email,
            country,
            location,
          })
          .eq("id", operatorId);

        if (error) {
          console.error("operator update error:", error);
          setMsg(
            "❌ Failed to update operator profile. Check columns in operators table."
          );
          setSaving(false);
          return;
        }

        setMsg("✅ Operator profile updated.");
        router.push("/operators/trips");
      } else {
        // Create new
        const { error } = await supabase.from("operators").insert({
          user_id: user.id,
          company_name: companyName,
          contact_person: contactPerson,
          email,
          country,
          location,
          status: "pending",
        });

        if (error) {
          console.error("operator insert error:", error);
          setMsg(
            "❌ Failed to create operator profile. Check columns in operators table."
          );
          setSaving(false);
          return;
        }

        setMsg("✅ Operator profile created. Redirecting to dashboard…");
        router.push("/operators/trips");
      }
    } catch (e: any) {
      console.error(e);
      setMsg("❌ Unexpected error while saving operator profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/operators/login");
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
              {operatorId ? "Update your operator profile" : "Create operator profile"}
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
              Tell travellers who you are. These details appear on your public
              profile and are used when we send you enquiries.
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
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Company name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Impala Holidays"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Contact person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Your full name"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Tanzania"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Main base / city
              </label>
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  backgroundColor: "#F9FAFB",
  fontSize: 14,
};
