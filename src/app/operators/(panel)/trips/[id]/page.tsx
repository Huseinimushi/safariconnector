"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type OperatorRow = { id: string; company_name: string | null; status?: string | null };

type TripRow = {
  id: string;
  title: string | null;
  duration: number | null;
  style: string | null;
  parks: string[] | null;
  price_from: number | null;
  price_to: number | null;
  overview: string | null;
  description: string | null;
  highlights: string[] | null;
  includes: string[] | null;
  excludes: string[] | null;
  images: string[] | null;
  hero_url: string | null;
  operator_id: string | null;
  created_at?: string | null;
  status?: string | null;
};

type DayRow = { id: string; day_index: number; title: string | null; desc: string | null };

const BG = "#F4F3ED";
const GREEN = "#0B6B3A";

const normalizeOpStatus = (s: any) => String(s || "pending").toLowerCase();

export default function OperatorTripManagePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const tripId = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [trip, setTrip] = useState<TripRow | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const canEdit = useMemo(() => {
    const s = normalizeOpStatus(operator?.status);
    return s === "approved" || s === "live";
  }, [operator?.status]);

  useEffect(() => {
    if (!tripId) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setMsg(null);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) console.error("auth error:", userErr);
      const user = userRes?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: op, error: opErr } = await supabase
        .from("operators")
        .select("id, company_name, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (opErr || !op) {
        if (!alive) return;
        setMsg("❌ Operator profile not found.");
        setLoading(false);
        return;
      }

      if (!alive) return;
      setOperator(op as OperatorRow);

      const { data: t, error: tErr } = await supabase
        .from("trips")
        .select("id,title,duration,style,parks,price_from,price_to,overview,description,highlights,includes,excludes,images,hero_url,operator_id,created_at,status")
        .eq("id", tripId)
        .eq("operator_id", op.id)
        .maybeSingle();

      if (tErr || !t) {
        if (!alive) return;
        console.error("trip load error:", tErr);
        setMsg("❌ Trip not found or not owned by your operator.");
        setLoading(false);
        return;
      }

      const { data: dayRows, error: dErr } = await supabase
        .from("trip_days")
        .select("id,day_index,title,desc")
        .eq("trip_id", tripId)
        .order("day_index", { ascending: true });

      if (dErr) console.error("days load error:", dErr);

      if (!alive) return;
      setTrip(t as TripRow);
      setDays((dayRows || []) as any);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router, tripId]);

  if (loading) {
    return (
      <main style={{ backgroundColor: BG, minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#6B7280" }}>
        Loading trip…
      </main>
    );
  }

  if (!trip) {
    return (
      <main style={{ backgroundColor: BG, minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, color: "#B91C1C" }}>
        {msg || "Trip not found."}
      </main>
    );
  }

  const hero = trip.hero_url || trip.images?.[0] || "";
  const priceLine =
    trip.price_from != null
      ? `From $${trip.price_from.toLocaleString()}${trip.price_to != null ? ` – $${trip.price_to.toLocaleString()}` : ""}`
      : "Price on request";

  return (
    <div style={{ backgroundColor: BG, minHeight: "100vh" }}>
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 16px 64px" }}>
        {/* Header */}
        <section
          style={{
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: "16px 20px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#6B7280" }}>
              Operator / Trip
            </p>
            <h1 style={{ margin: 0, marginTop: 4, fontSize: 24, fontWeight: 800, color: GREEN }}>
              {trip.title || "Untitled trip"}
            </h1>
            <p style={{ margin: 0, marginTop: 4, fontSize: 13, color: "#4B5563" }}>
              {priceLine} · {trip.duration ? `${trip.duration} days` : "Duration not set"}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <Link
              href="/trips"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #D1D5DB",
                backgroundColor: "#FFFFFF",
                fontSize: 12,
                fontWeight: 600,
                color: "#111827",
                textDecoration: "none",
              }}
            >
              ← Back to trips
            </Link>

            <Link
              href={`/trips/${trip.id}/edit`}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                backgroundColor: canEdit ? GREEN : "#9CA3AF",
                fontSize: 12,
                fontWeight: 700,
                color: "#FFFFFF",
                textDecoration: "none",
                pointerEvents: canEdit ? "auto" : "none",
                opacity: canEdit ? 1 : 0.8,
              }}
            >
              Edit trip
            </Link>
          </div>
        </section>

        {msg && (
          <div style={{ marginBottom: 16, borderRadius: 12, padding: "8px 12px", fontSize: 13, backgroundColor: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>
            {msg}
          </div>
        )}

        {/* Content */}
        <section style={{ borderRadius: 24, background: "#FFFFFF", border: "1px solid #E5E7EB", overflow: "hidden" }}>
          {hero ? (
            <div style={{ height: 240, backgroundImage: `url(${hero})`, backgroundSize: "cover", backgroundPosition: "center" }} />
          ) : (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
              No featured image
            </div>
          )}

          <div style={{ padding: 18, display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 16 }}>
            {/* Left */}
            <div style={{ display: "grid", gap: 14 }}>
              {trip.overview && (
                <div>
                  <h3 style={h3Style}>Overview</h3>
                  <p style={pStyle}>{trip.overview}</p>
                </div>
              )}

              {trip.description && (
                <div>
                  <h3 style={h3Style}>Description</h3>
                  <p style={pStyle}>{trip.description}</p>
                </div>
              )}

              <div>
                <h3 style={h3Style}>Day-by-day itinerary</h3>
                {days.length === 0 ? (
                  <p style={pStyle}>No day-by-day itinerary saved.</p>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {days.map((d) => (
                      <div key={d.id} style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 10, background: "#F9FAFB" }}>
                        <div style={{ fontWeight: 800, color: "#111827", fontSize: 13 }}>
                          Day {d.day_index}: {d.title || `Day ${d.day_index}`}
                        </div>
                        {d.desc ? <div style={{ marginTop: 4, color: "#374151", fontSize: 13, lineHeight: 1.5 }}>{d.desc}</div> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right */}
            <div style={{ display: "grid", gap: 12 }}>
              <div style={cardStyle}>
                <h3 style={h3Style}>Routing</h3>
                <div style={metaLineStyle}>
                  <strong>Style:</strong> {trip.style || "—"}
                </div>
                <div style={metaLineStyle}>
                  <strong>Parks:</strong> {(trip.parks || []).length ? (trip.parks || []).join(", ") : "—"}
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={h3Style}>Highlights</h3>
                {(trip.highlights || []).length ? (
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#374151", fontSize: 13, lineHeight: 1.6 }}>
                    {(trip.highlights || []).map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={pStyle}>—</p>
                )}
              </div>

              <div style={cardStyle}>
                <h3 style={h3Style}>Inclusions</h3>
                {(trip.includes || []).length ? (
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#374151", fontSize: 13, lineHeight: 1.6 }}>
                    {(trip.includes || []).map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={pStyle}>—</p>
                )}

                <h3 style={{ ...h3Style, marginTop: 10 }}>Exclusions</h3>
                {(trip.excludes || []).length ? (
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#374151", fontSize: 13, lineHeight: 1.6 }}>
                    {(trip.excludes || []).map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={pStyle}>—</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

const h3Style: React.CSSProperties = { margin: 0, fontSize: 14, fontWeight: 800, color: "#111827", marginBottom: 6 };
const pStyle: React.CSSProperties = { margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 };
const cardStyle: React.CSSProperties = { border: "1px solid #E5E7EB", borderRadius: 16, padding: 12, background: "#FFFFFF" };
const metaLineStyle: React.CSSProperties = { fontSize: 13, color: "#374151", marginTop: 6, lineHeight: 1.5 };
