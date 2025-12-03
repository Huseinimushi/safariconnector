"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const BRAND_GREEN = "#0B6B3A";
const BRAND_GOLD = "#D4A017";
const BG_SAND = "#F4F3ED";

type OperatorRow = {
  id: string;
  company_name: string | null;
  name: string | null;
  logo_url: string | null;
  country: string | null;
  location: string | null;
  description: string | null;
  specialties: string[] | null;
  status: string | null;
};

type TripRow = {
  id: string;
  title: string | null;
  slug: string | null;
  duration_days: number | null;
  style: string | null;
  price_from: number | null;
  price_to: number | null;
};

export default function OperatorProfileClient({ id }: { id: string }) {
  const router = useRouter();
  // 👉 TUNATUMIA HII MOJA KWA MOJA, HAKUNA supabaseBrowser TENA
  // const supabase = useMemo(() => supabaseBrowser(), []); ❌
  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const [{ data: op, error: opError }, { data: tripData, error: tripError }] =
        await Promise.all([
          supabase
            .from("operators")
            .select(
              "id, company_name, name, logo_url, country, location, description, specialties, status"
            )
            .eq("id", id)
            .single(),
          supabase
            .from("trips")
            .select(
              "id, title, slug, duration_days, style, price_from, price_to"
            )
            .eq("operator_id", id)
            .order("created_at", { ascending: false }),
        ]);

      if (opError) {
        console.error("Operator load error:", opError);
      } else {
        setOperator(op as OperatorRow);
      }

      if (tripError) {
        console.error("Trips load error:", tripError);
      } else {
        setTrips((tripData || []) as TripRow[]);
      }

      setLoading(false);
    };

    if (id) {
      loadData();
    }
  }, [id]);

  const handleAddTrip = () => {
    // unaweza kubadilisha route hii kulingana na structure yako
    router.push(`/operators/trips/new?operatorId=${id}`);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "50vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6B7280",
        }}
      >
        Loading operator profile…
      </div>
    );
  }

  if (!operator) {
    return (
      <div
        style={{
          minHeight: "50vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#B91C1C",
        }}
      >
        Operator not found.
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: BG_SAND, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "24px 16px 64px",
        }}
      >
        {/* HEADER */}
        <section
          style={{
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: "18px 18px 16px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            {operator.logo_url ? (
              <img
                src={operator.logo_url}
                alt={operator.company_name || "Logo"}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  objectFit: "cover",
                  border: "1px solid #E5E7EB",
                }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  backgroundColor: "#E5E7EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 20,
                  color: "#4B5563",
                }}
              >
                {(operator.company_name || operator.name || "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  color: BRAND_GREEN,
                }}
              >
                {operator.company_name || operator.name}
              </h1>
              <p
                style={{
                  margin: 0,
                  marginTop: 4,
                  fontSize: 13,
                  color: "#4B5563",
                }}
              >
                {operator.location || "—"},{" "}
                {operator.country || ""}
              </p>
              {operator.specialties && operator.specialties.length > 0 && (
                <p
                  style={{
                    margin: 0,
                    marginTop: 4,
                    fontSize: 11,
                    color: "#6B7280",
                  }}
                >
                  Specialties: {operator.specialties.join(" · ")}
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 999,
                backgroundColor:
                  operator.status === "approved"
                    ? "#ECFDF3"
                    : operator.status === "rejected"
                    ? "#FEF2F2"
                    : "#EFF6FF",
                color:
                  operator.status === "approved"
                    ? "#166534"
                    : operator.status === "rejected"
                    ? "#B91C1C"
                    : "#1D4ED8",
                textTransform: "capitalize",
              }}
            >
              {operator.status || "pending"}
            </span>

            <button
              type="button"
              onClick={handleAddTrip}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                backgroundColor: BRAND_GOLD,
                color: "#111827",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add new trip
            </button>
          </div>
        </section>

        {/* DESCRIPTION + TRIPS */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 2fr)",
            gap: 18,
          }}
        >
          <div
            style={{
              borderRadius: 18,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              padding: "14px 14px 12px",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: 6,
                fontSize: 15,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              About this operator
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#4B5563",
                lineHeight: 1.7,
              }}
            >
              {operator.description ||
                "This operator has not added a full company story yet."}
            </p>
          </div>

          <div
            style={{
              borderRadius: 18,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              padding: "14px 14px 10px",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: 6,
                fontSize: 15,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Trips by this operator
            </h2>

            {trips.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  marginTop: 6,
                  fontSize: 13,
                  color: "#6B7280",
                }}
              >
                No trips have been created yet. Use the &quot;Add new trip&quot;
                button above to create your first itinerary.
              </p>
            ) : (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    style={{
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      padding: "8px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#111827",
                        }}
                      >
                        {trip.title || "Untitled trip"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          marginTop: 2,
                        }}
                      >
                        {trip.duration_days
                          ? `${trip.duration_days} days`
                          : "Duration not set"}{" "}
                        · {trip.style || "Style not set"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {trip.price_from ? (
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: BRAND_GREEN,
                          }}
                        >
                          From ${trip.price_from.toLocaleString()}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6B7280",
                          }}
                        >
                          Price on request
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/trips/${trip.id}`)
                        }
                        style={{
                          marginTop: 4,
                          border: "none",
                          background: "none",
                          padding: 0,
                          fontSize: 11,
                          color: "#1D4ED8",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Open trip →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
