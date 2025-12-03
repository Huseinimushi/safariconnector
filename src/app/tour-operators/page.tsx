// src/app/tour-operators/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BG_SAND = "#F4F3ED";
const BRAND_GREEN = "#0B6B3A";

type PublicOperator = {
  id: string;
  company_name: string | null;
  country: string | null;
  location: string | null;
  status: string | null;
};

export default function TourOperatorsPage() {
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<PublicOperator[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("operators")
        .select("id, company_name, country, location, status")
        .eq("status", "approved")
        .order("company_name", { ascending: true });

      if (error) {
        console.error("tour operators load error:", error);
        setErrorMsg("Sorry, we couldn’t load tour operators. Please try again.");
        setLoading(false);
        return;
      }

      setOperators((data || []) as PublicOperator[]);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "32px 16px 64px",
        }}
      >
        {/* PAGE HEADER */}
        <section
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#6B7280",
              }}
            >
              Safari Connector network
            </p>
            <h1
              style={{
                margin: 0,
                marginTop: 6,
                fontSize: 28,
                fontWeight: 800,
                color: BRAND_GREEN,
              }}
            >
              Tour operators in our marketplace
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: 6,
                fontSize: 14,
                color: "#4B5563",
                maxWidth: 620,
              }}
            >
              Browse trusted local operators who design and operate safaris in
              East Africa. Each partner is vetted by Safari Connector before
              appearing here.
            </p>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#6B7280",
              textAlign: "right",
            }}
          >
            {operators.length > 0 && (
              <>
                <div>
                  <strong>{operators.length}</strong> tour operator
                  {operators.length === 1 ? "" : "s"}
                </div>
                <div>Showing approved partners only</div>
              </>
            )}
          </div>
        </section>

        {/* ERROR / LOADING */}
        {errorMsg && (
          <div
            style={{
              marginBottom: 20,
              borderRadius: 12,
              padding: "10px 12px",
              backgroundColor: "#FEE2E2",
              border: "1px solid #FECACA",
              fontSize: 13,
              color: "#B91C1C",
            }}
          >
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div
            style={{
              marginTop: 40,
              display: "flex",
              justifyContent: "center",
              fontSize: 14,
              color: "#6B7280",
            }}
          >
            Loading tour operators…
          </div>
        ) : operators.length === 0 ? (
          <div
            style={{
              marginTop: 40,
              borderRadius: 16,
              padding: "16px 18px",
              backgroundColor: "#F9FAFB",
              border: "1px dashed #D1D5DB",
              fontSize: 14,
              color: "#4B5563",
              textAlign: "center",
            }}
          >
            We don&apos;t have any approved tour operators visible yet. Please
            check again soon as we onboard new partners.
          </div>
        ) : (
          <section>
            {/* GRID OF CARDS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {operators.map((op) => (
                <article
                  key={op.id}
                  style={{
                    borderRadius: 18,
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    padding: "14px 14px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* Title + badge */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {op.company_name || "Safari operator"}
                      </h2>
                      <p
                        style={{
                          margin: 0,
                          marginTop: 2,
                          fontSize: 12,
                          color: "#6B7280",
                        }}
                      >
                        {op.location || op.country
                          ? [op.location, op.country]
                              .filter(Boolean)
                              .join(", ")
                          : "Location not specified"}
                      </p>
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 999,
                        backgroundColor: "#ECFDF3",
                        color: "#166534",
                        textTransform: "capitalize",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {op.status || "approved"}
                    </span>
                  </div>

                  {/* Short text */}
                  <p
                    style={{
                      margin: 0,
                      marginTop: 8,
                      fontSize: 13,
                      color: "#4B5563",
                    }}
                  >
                    Specialising in tailor-made safaris and local experiences.
                    Contact this operator to customise your itinerary.
                  </p>

                  {/* CTA */}
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Link
                      href={`/operators/${op.id}`}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: BRAND_GREEN,
                        textDecoration: "none",
                      }}
                    >
                      View profile & trips →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
