"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";

type TravellerRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
};

type QuoteRow = {
  id: string;
  operator_id: string;
  full_name: string | null;
  email: string | null;
  travel_start_date: string | null;
  travel_end_date: string | null;
  group_size: number | null;
  message: string | null;
  created_at: string | null;
};

export default function TravellerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [traveller, setTraveller] = useState<TravellerRow | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg(null);

      // 1) check logged in user
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
        router.push("/login/traveller");
        return;
      }

      // 2) load traveller profile
      const { data: trav, error: travError } = await supabase
        .from("travellers")
        .select("id, user_id, full_name, email, phone, country")
        .eq("user_id", user.id)
        .maybeSingle();

      if (travError) {
        console.error("traveller load error:", travError);
        setMsg("❌ Failed to load traveller profile.");
        setLoading(false);
        return;
      }

      let travellerRow: TravellerRow | null = trav as TravellerRow | null;

      // if no traveller row, auto-create using auth user (no redirect)
      if (!travellerRow) {
        try {
          const inferredName =
            (user.user_metadata as any)?.full_name ||
            (user.email ? user.email.split("@")[0] : null);

          const { data: newTrav, error: insertError } = await supabase
            .from("travellers")
            .insert({
              user_id: user.id,
              full_name: inferredName,
              email: user.email,
            })
            .select("id, user_id, full_name, email, phone, country")
            .single();

          if (insertError) {
            console.error("auto create traveller error:", insertError);
            setMsg(
              "⚠ We could not auto-create your traveller profile. Please try registering again."
            );
            setLoading(false);
            return;
          }

          travellerRow = newTrav as TravellerRow;
        } catch (e) {
          console.error("traveller auto-create exception:", e);
          setMsg("⚠ Unexpected error while creating your profile.");
          setLoading(false);
          return;
        }
      }

      setTraveller(travellerRow);

      // 3) load quotes linked to this traveller (by email)
      if (travellerRow.email) {
        const { data: quotesData, error: quotesError } = await supabase
          .from("operator_quotes")
          .select(
            "id, operator_id, full_name, email, travel_start_date, travel_end_date, group_size, message, created_at"
          )
          .eq("email", travellerRow.email)
          .order("created_at", { ascending: false });

        if (quotesError) {
          console.error("quotes load error:", quotesError);
          setMsg("⚠ Could not load your enquiries.");
        } else {
          setQuotes((quotesData || []) as QuoteRow[]);
        }
      }

      setLoading(false);
    };

    load();
  }, [router]);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      router.push("/login/traveller");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to logout. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return value;
    }
  };

  if (loading) {
    return (
      <main
        style={{
          backgroundColor: BG_SAND,
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6B7280",
        }}
      >
        Loading your traveller dashboard…
      </main>
    );
  }

  if (!traveller) {
    return (
      <main
        style={{
          backgroundColor: BG_SAND,
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#B91C1C",
          padding: 16,
          textAlign: "center",
        }}
      >
        We couldn&apos;t load your traveller profile. Please try again.
      </main>
    );
  }

  const quotesCount = quotes.length;
  const lastQuoteDate =
    quotesCount > 0 && quotes[0].created_at
      ? formatDate(quotes[0].created_at)
      : null;

  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "24px 16px 64px",
          opacity: busy ? 0.7 : 1,
          pointerEvents: busy ? "none" : "auto",
        }}
      >
        {/* HEADER */}
        <section
          style={{
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: "16px 20px 14px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6B7280",
              }}
            >
              Traveller dashboard
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
              Welcome back, {traveller.full_name || "Traveller"}
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 13,
                color: "#4B5563",
                maxWidth: 560,
              }}
            >
              See your safari enquiries, follow operator replies and keep your
              traveller profile up to date.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/traveller/quotes")}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: BRAND_GOLD,
                color: "#111827",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              View my enquiries
            </button>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid #D1D5DB",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                backgroundColor: "#FFFFFF",
                color: "#111827",
              }}
            >
              Logout
            </button>
          </div>
        </section>

        {msg && (
          <div
            style={{
              marginBottom: 14,
              borderRadius: 12,
              padding: "8px 12px",
              fontSize: 13,
              backgroundColor: msg.startsWith("❌")
                ? "#FEE2E2"
                : msg.startsWith("⚠")
                ? "#FEF3C7"
                : "#ECFDF5",
              color: msg.startsWith("❌")
                ? "#B91C1C"
                : msg.startsWith("⚠")
                ? "#92400E"
                : "#166534",
              border: `1px solid ${
                msg.startsWith("❌")
                  ? "#FECACA"
                  : msg.startsWith("⚠")
                  ? "#FDE68A"
                  : "#BBF7D0"
              }`,
            }}
          >
            {msg}
          </div>
        )}

        {/* GRID: summary + recent quotes */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* LEFT: Profile summary */}
          <div
            style={{
              borderRadius: 20,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              padding: "16px 16px 14px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#9CA3AF",
                marginBottom: 6,
              }}
            >
              Your traveller profile
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "999px",
                  background:
                    "linear-gradient(135deg, #0B6B3A 0%, #D4A017 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                {traveller.full_name?.charAt(0).toUpperCase() ?? "T"}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {traveller.full_name || "Your name"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6B7280",
                    marginTop: 2,
                  }}
                >
                  {traveller.country || "Country not set"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
                fontSize: 11,
                marginBottom: 12,
              }}
            >
              {/* Total enquiries */}
              <div
                style={{
                  padding: "7px 9px",
                  borderRadius: 12,
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                }}
              >
                <div style={{ color: "#6B7280" }}>Total enquiries</div>
                <div
                  style={{
                    marginTop: 2,
                    fontWeight: 700,
                    color: "#111827",
                    fontSize: 15,
                  }}
                >
                  {quotesCount}
                </div>
              </div>

              {/* Last enquiry */}
              <div
                style={{
                  padding: "7px 9px",
                  borderRadius: 12,
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                }}
              >
                <div style={{ color: "#6B7280" }}>Last enquiry</div>
                <div
                  style={{
                    marginTop: 2,
                    fontWeight: 600,
                    color: "#111827",
                    fontSize: 13,
                  }}
                >
                  {lastQuoteDate || "Not yet"}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#6B7280",
                borderTop: "1px dashed #E5E7EB",
                paddingTop: 10,
                marginTop: 4,
              }}
            >
              <div>
                <strong>Email:</strong> {traveller.email || "Not set"}
              </div>
              <div style={{ marginTop: 2 }}>
                <strong>Phone:</strong> {traveller.phone || "Not set"}
              </div>
            </div>
          </div>

          {/* RIGHT: Recent enquiries */}
          <div
            style={{
              borderRadius: 20,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              padding: "14px 14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  Recent safari enquiries
                </h2>
                <p
                  style={{
                    margin: 0,
                    marginTop: 2,
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  See the latest quote requests you sent to tour operators.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/traveller/quotes")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid #D1D5DB",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: "#FFFFFF",
                  color: "#111827",
                }}
              >
                Open inbox
              </button>
            </div>

            {quotesCount === 0 ? (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 14,
                  padding: "10px 12px",
                  backgroundColor: "#F9FAFB",
                  border: "1px dashed #D1D5DB",
                  fontSize: 12,
                  color: "#4B5563",
                }}
              >
                You haven&apos;t sent any quote requests yet. Use{" "}
                <strong>AI Trip Builder</strong> or any trip enquiry form to
                contact trusted operators.
              </div>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  gap: 8,
                }}
              >
                {quotes.slice(0, 4).map((q) => {
                  const isAI =
                    q.message?.startsWith(
                      "Enquiry generated via Safari Connector AI Trip Builder."
                    ) ?? false;

                  return (
                    <div
                      key={q.id}
                      style={{
                        borderRadius: 14,
                        border: "1px solid #E5E7EB",
                        padding: "9px 10px",
                        fontSize: 12,
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 3,
                        }}
                      >
                        <strong>
                          Safari enquiry{" "}
                          {q.travel_start_date
                            ? `(${formatDate(q.travel_start_date)})`
                            : ""}
                        </strong>
                        <span
                          style={{
                            fontSize: 11,
                            color: "#6B7280",
                          }}
                        >
                          {q.created_at ? formatDate(q.created_at) : ""}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#6B7280" }}>
                        {typeof q.group_size === "number"
                          ? `${q.group_size} travellers`
                          : "Group size not set"}
                      </div>
                      {isAI && (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 10,
                            display: "inline-block",
                            padding: "2px 7px",
                            borderRadius: 999,
                            backgroundColor: "#FFFBEB",
                            color: "#92400E",
                            border: "1px solid #FDE68A",
                          }}
                        >
                          AI Trip Builder enquiry
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
