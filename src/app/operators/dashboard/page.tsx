"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND_GREEN = "#0B6B3A";
const BG_SAND = "#F4F3ED";

export default function OperatorDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState<any>(null);
  const [quotesCount, setQuotesCount] = useState(0);

  // ====== LOGOUT ======
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/operators/login");
  }

  // ====== LOAD OPERATOR PROFILE ======
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/operators/login");
        return;
      }

      const { data: op, error } = await supabase
        .from("operators")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!op || error) {
        router.push("/operators/register");
        return;
      }

      setOperator(op);

      const { count } = await supabase
        .from("operator_quotes")
        .select("*", { count: "exact", head: true })
        .eq("operator_id", op.id);

      setQuotesCount(count || 0);
      setLoading(false);
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading dashboard…
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "26px 18px" }}>
        {/* TOP RIGHT LOGOUT BUTTON */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 20,
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 20px",
              backgroundColor: BRAND_GREEN,
              color: "white",
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              borderRadius: 30,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>

        {/* WELCOME HEADER */}
        <h1
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: BRAND_GREEN,
            marginBottom: 6,
          }}
        >
          Welcome, {operator?.contact_person || operator?.company_name}
        </h1>

        <p style={{ color: "#374151", fontSize: 14, marginBottom: 26 }}>
          Manage your profile, review enquiries and keep track of your trips on
          Safari Connector.
        </p>

        {/* 3 MAIN CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginBottom: 26,
          }}
        >
          {/* Trips */}
          <div style={card}>
            <h3 style={cardTitle}>Trips</h3>
            <p style={cardText}>Trips currently visible to travellers.</p>

            <a href="/operators/trips" style={linkBtn}>
              Manage trips →
            </a>
          </div>

          {/* Quote Requests */}
          <div style={card}>
            <h3 style={cardTitle}>Quote Requests</h3>
            <p style={cardText}>
              New enquiries: <strong>{quotesCount}</strong>
            </p>

            <a href="/operators/quotes" style={linkBtn}>
              View requests →
            </a>
          </div>

          {/* Profile */}
          <div style={card}>
            <h3 style={cardTitle}>Profile</h3>
            <p style={cardText}>
              {operator?.status === "approved" ? "Live" : "Pending approval"}
            </p>

            <a href="/operators/edit-profile" style={linkBtn}>
              Edit profile →
            </a>
          </div>
        </div>

        {/* SNAPSHOT + NEXT STEPS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
            gap: 18,
          }}
        >
          {/* Snapshot */}
          <div style={bigCard}>
            <h3 style={cardTitle}>Company snapshot</h3>

            <p style={snapLabel}>Company name</p>
            <p style={snapValue}>{operator?.company_name}</p>

            <p style={snapLabel}>Email</p>
            <p style={snapValue}>{operator?.email || operator?.ops_email}</p>

            <p style={snapLabel}>Location</p>
            <p style={snapValue}>
              {operator?.location}, {operator?.country}
            </p>

            <p
              style={{
                marginTop: 14,
                color: "#6B7280",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              Tip: keep your response time low and your trip descriptions
              detailed. High quality content and fast replies lead to more
              confirmed bookings.
            </p>
          </div>

          {/* Next Steps */}
          <div style={bigCard}>
            <h3 style={cardTitle}>Next steps</h3>

            <ul style={{ paddingLeft: 18, fontSize: 14, color: "#374151" }}>
              <li>Complete your company profile fully.</li>
              <li>Add your top trips (5–8 day safaris).</li>
              <li>Reply quickly to new requests.</li>
              <li>Share your unique story and values.</li>
            </ul>

            <a
              href="/operators/trips/new"   // ✅ FIXED ROUTE
              style={{
                marginTop: 16,
                display: "inline-block",
                padding: "10px 20px",
                borderRadius: 999,
                backgroundColor: BRAND_GREEN,
                color: "white",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Add a new trip →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* STYLES */
const card: React.CSSProperties = {
  backgroundColor: "white",
  padding: "18px 22px",
  borderRadius: 16,
  border: "1px solid #E5E7EB",
};

const cardTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: "#111827",
  marginBottom: 6,
};

const cardText: React.CSSProperties = {
  fontSize: 14,
  color: "#374151",
  marginBottom: 10,
};

const linkBtn: React.CSSProperties = {
  color: BRAND_GREEN,
  fontWeight: 600,
  fontSize: 14,
  textDecoration: "none",
};

const bigCard: React.CSSProperties = {
  backgroundColor: "white",
  padding: "20px 24px",
  borderRadius: 16,
  border: "1px solid #E5E7EB",
};

const snapLabel: React.CSSProperties = {
  margin: "10px 0 2px",
  fontSize: 13,
  color: "#6B7280",
};

const snapValue: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 600,
  color: "#111827",
};
