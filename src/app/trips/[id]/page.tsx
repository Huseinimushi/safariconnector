// src/app/trips/[id]/page.tsx

import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import EnquiryCard from "./EnquiryCard";
import s from "./TripDetail.module.css";

export const dynamic = "force-dynamic";

/* ===================== Types ===================== */

type Trip = {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  parks: string[] | null;
  style: string | null;
  price_from: number | null;
  price_to: number | null;
  images: string[] | null;
  status: string | null;
  operator_id: string | null;

  // Optional rich fields
  overview: string | null;
  highlights: string[] | null; // optional “key bullets”
  includes: string[] | null; // operator add trip: Included
  excludes: string[] | null; // operator add trip: Excluded
};

type TripDay = { day: number; title: string; desc: string | null };

type TripRate = {
  season: string | null;
  start_date: string | null;
  end_date: string | null;
  currency: string | null;
  price_pp: number | null;
  min_pax: number | null;
  notes: string | null; // e.g., "March – May"
};

type Operator = {
  id: string;
  name: string | null;
  logo_url: string | null;
  about: string | null;
  website: string | null;
};

/* =================== Data Loader =================== */

async function loadTrip(id: string) {
  const supabase = supabaseServer();

  // 🔐 get current logged-in user (if any)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: trip } = await supabase
    .from("trips")
    .select(`
      id,title,description,duration,
      parks,style,price_from,price_to,images,status,operator_id,
      overview,highlights,includes,excludes
    `)
    .eq("id", id)
    .maybeSingle();

  if (!trip)
    return {
      trip: null,
      days: [] as TripDay[],
      rates: [] as TripRate[],
      operator: null as Operator | null,
      user: user ?? null,
    };

  const [daysRes, ratesRes, opRes] = await Promise.all([
    supabase
      .from("trip_days")
      .select("day:day_index,title,desc")
      .eq("trip_id", id)
      .order("day_index", { ascending: true }),
    supabase
      .from("trip_rates")
      .select("season,start_date,end_date,currency,price_pp,min_pax,notes")
      .eq("trip_id", id)
      .order("season", { ascending: true }),
    trip.operator_id
      ? supabase
          .from("operators")
          .select("id,name,logo_url,about,website")
          .eq("id", trip.operator_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
  ]);

  return {
    trip: trip as Trip,
    days: (daysRes.data as TripDay[]) || [],
    rates: (ratesRes.data as TripRate[]) || [],
    operator: ((opRes as any).data as Operator) || null,
    user: user ?? null,
  };
}

/* =================== Helpers =================== */

function prettyStyle(s?: string | null) {
  const m = (s || "value").toLowerCase();
  if (m === "premium") return "Premium";
  if (m === "balanced") return "Balanced";
  return "Value";
}

const money = (n: number | null | undefined, c = "USD") =>
  n == null ? null : `${c} ${n.toLocaleString()}`;

/** Prefer notes ("March – May"); else derive month names from dates; else em dash */
function formatRatePeriod(r: TripRate) {
  if (r.notes && r.notes.trim().length > 0) return r.notes;
  const monthName = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(undefined, { month: "long" }) : "—";
  if (r.start_date || r.end_date) {
    const from = monthName(r.start_date);
    const to = monthName(r.end_date);
    return from === to ? from : `${from} – ${to}`;
  }
  return "—";
}

/** 🔐 Build traveller name/email from Supabase user metadata */
function buildTravellerPrefill(user: any | null) {
  if (!user) return { name: "", email: "" };
  const meta = user.user_metadata || {};
  const fullName =
    meta.full_name ||
    meta.name ||
    `${meta.first_name ?? ""} ${meta.last_name ?? ""}`.trim();
  const email = user.email || meta.email || "";
  return { name: fullName || "", email };
}

/* =================== Page =================== */

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { trip, days, rates, operator, user } = await loadTrip(id);
  if (!trip) notFound();

  const hero =
    (trip.images && trip.images[0]) ||
    "https://images.unsplash.com/photo-1543877087-ebf71fde2be1?w=1600&q=70&auto=format&fit=crop";

  // bullets for Overview: prefer highlights; fall back to includes
  const overviewBullets: string[] =
    (trip.highlights && trip.highlights.length
      ? trip.highlights
      : trip.includes && trip.includes.length
      ? trip.includes
      : []) ?? [];

  // Safe check to avoid rendering "0" in JSX when arrays are empty
  const hasIncExc =
    ((trip.includes?.length ?? 0) > 0) ||
    ((trip.excludes?.length ?? 0) > 0);

  // 🔐 Traveller defaults to pass into enquiry card
  const travellerPrefill = buildTravellerPrefill(user);

  return (
    <main className={s.wrap}>
      {/* HERO */}
      <section className={s.hero}>
        <img src={hero} alt={trip.title} />
        <div className={s.heroOverlay} />
        <div className={s.heroContent}>
          <h1 className={s.title}>{trip.title}</h1>
          <div className={s.heroMeta}>
            <span className={s.pill}>{trip.duration} days</span>
            <span className={s.pill}>{prettyStyle(trip.style)}</span>
            {trip.parks?.length ? (
              <span className={s.pill}>{trip.parks.join(" • ")}</span>
            ) : null}
          </div>
        </div>
      </section>

      {/* CONTENT GRID */}
      <div className={s.grid}>
        {/* LEFT */}
        <div>
          {/* Prices & park chips */}
          <section className={s.card}>
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  className="priceLabel"
                  style={{
                    color: "var(--muted)",
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                  }}
                >
                  From
                </div>
                <div
                  className="price"
                  style={{ fontSize: 24, fontWeight: 700 }}
                >
                  {money(trip.price_from) ?? "Price on request"}
                  {trip.price_to ? (
                    <span
                      style={{
                        fontSize: 16,
                        color: "var(--muted)",
                        marginLeft: 6,
                      }}
                    >
                      – {money(trip.price_to)}
                    </span>
                  ) : null}
                </div>
              </div>
              {trip.parks?.length ? (
                <div className={s.badges}>
                  {trip.parks.map((p) => (
                    <span key={p} className={s.badge}>
                      {p}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          {/* Overview (+ bullets) */}
          {(trip.overview || trip.description) && (
            <section className={s.card}>
              <h2 className={s.h2}>Overview</h2>
              <p className={s.lead}>{trip.overview || trip.description}</p>

              {!!overviewBullets.length && (
                <ul
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gap: 8,
                    gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
                  }}
                >
                  {overviewBullets.map((h, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        gap: 8,
                        color: "#2a3b36",
                      }}
                    >
                      <span
                        style={{
                          marginTop: 8,
                          width: 6,
                          height: 6,
                          background: "#1b4d3e",
                          borderRadius: 12,
                          flex: "0 0 6px",
                        }}
                      />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Day-by-Day */}
          {!!days.length && (
            <section className={s.card}>
              <h2 className={s.h2}>Itinerary</h2>
              <div
                style={{
                  borderTop: `1px solid var(--border)`,
                }}
              >
                {days.map((d, i) => (
                  <details
                    key={d.day}
                    style={{
                      padding: "14px 0",
                      borderBottom:
                        i === days.length - 1
                          ? "none"
                          : `1px solid var(--border)`,
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Day {d.day}: {d.title}
                    </summary>
                    <p
                      style={{
                        marginTop: 8,
                        color: "#2a3b36",
                      }}
                    >
                      {d.desc}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Rates */}
          {!!rates.length && (
            <section className={s.card}>
              <h2 className={s.h2}>Rates</h2>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 14,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f7faf9" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: 10,
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        Season
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: 10,
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        Period
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: 10,
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        Price / person
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: 10,
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        Min pax
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: 10,
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((r, i) => (
                      <tr key={i}>
                        <td
                          style={{
                            padding: 10,
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          {r.season || "-"}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          {formatRatePeriod(r)}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            borderBottom: "1px solid var(--border)",
                            textAlign: "right",
                          }}
                        >
                          {r.price_pp != null
                            ? money(r.price_pp, r.currency || "USD")
                            : "—"}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          {r.min_pax ?? "—"}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          {r.notes || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={s.small} style={{ marginTop: 8 }}>
                Prices are indicative; final quote depends on dates, rooming &
                availability.
              </div>
            </section>
          )}

          {/* What's Included / Excluded */}
          {hasIncExc && (
            <section className={s.card}>
              <h2 className={s.h2}>What’s Included</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: "6px 0 8px",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#134e3a",
                    }}
                  >
                    Included
                  </h3>
                  <ul style={{ display: "grid", gap: 6 }}>
                    {(trip.includes ?? []).map((it, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <span style={{ color: "#1b4d3e" }}>✔</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3
                    style={{
                      margin: "6px 0 8px",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#7a1f1f",
                    }}
                  >
                    Excluded
                  </h3>
                  <ul style={{ display: "grid", gap: 6 }}>
                    {(trip.excludes ?? []).map((it, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <span style={{ color: "#b91c1c" }}>✖</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Gallery */}
          {trip.images && trip.images.length > 1 && (
            <section className={s.card}>
              <h2 className={s.h2}>Photo Highlights</h2>
              <div className={s.gallery}>
                {trip.images.slice(0, 6).map((src, i) => (
                  <div key={i} className={s.thumb}>
                    <img src={src} alt={`Photo ${i + 1}`} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <div style={{ marginTop: 4 }}>
            <a
              href="/trips"
              style={{
                color: "var(--brand)",
                textDecoration: "none",
              }}
            >
              ← Back to all trips
            </a>
          </div>
        </div>

        {/* RIGHT (Enquiry + Offered by) */}
        <aside>
          <div className={s.sticky}>
            <EnquiryCard
              id={trip.id}
              title={trip.title}
              duration={trip.duration}
              parks={trip.parks ?? []}
              price_from={trip.price_from}
              price_to={trip.price_to}
              // 🔐 pass traveller defaults into the enquiry form
              initialName={travellerPrefill.name}
              initialEmail={travellerPrefill.email}
              // ⭐ pass operatorId ili request i-route kwa operator sahihi
              operatorId={trip.operator_id}
            />

            {operator && (
              <div className={s.card} style={{ marginTop: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {operator.logo_url ? (
                    <img
                      src={operator.logo_url}
                      alt={operator.name || "Operator"}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        objectFit: "cover",
                        border: "1px solid var(--border)",
                      }}
                    />
                  ) : null}
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--ink)",
                      }}
                    >
                      {operator.name || "Licensed Operator"}
                    </div>
                    {operator.website && (
                      <a
                        href={operator.website}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 13,
                          color: "var(--brand)",
                          textDecoration: "none",
                        }}
                      >
                        Visit website →
                      </a>
                    )}
                  </div>
                </div>
                {operator.about && (
                  <p
                    style={{
                      marginTop: 10,
                      color: "#2a3b36",
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    {operator.about}
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
