// src/app/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { supabaseServer } from "@/lib/supabaseServer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/* Types */
type TripRow = {
  id: string;
  title: string;
  duration?: number | null;
  parks?: string[] | null;
  price_from?: number | null;
  price_to?: number | null;
  hero_url?: string | null;
  created_at?: string | null;
  style?: string | null; // optional
};

type OperatorRow = {
  id: string;
  company_name: string | null;
  country: string | null;
  location: string | null;
  status: string | null;
  logo_url?: string | null;
};

/* Local destination images (/public/destinations) */
const DEST_IMG: Record<string, string> = {
  Serengeti: "/destinations/serengeti.jpg",
  Ngorongoro: "/destinations/ngorongoro.jpg",
  Kilimanjaro: "/destinations/kilimanjaro.jpg",
  Zanzibar: "/destinations/zanzibar.jpg",
  Tarangire: "/destinations/tarangire.jpg",
  Manyara: "/destinations/manyara.jpg",
};

const BRAND = {
  green: "#1B4D3E",
  green2: "#0B7A53",
  sand: "#F4F3ED",
  ink: "#0F172A",
  muted: "#6B7280",
  border: "#E5E7EB",
};

// LOGIN URL (absolute)
const TRAVELLER_LOGIN_URL = "https://safariconnector.com/login/traveller";

// Helper: remote URL?
const isRemoteUrl = (src: string | null | undefined) =>
  !!src && (src.startsWith("http://") || src.startsWith("https://"));

const money = (n: number | null | undefined, c = "USD") =>
  n == null ? null : `${c} ${Number(n).toLocaleString()}`;

function clampText(s: string, max = 60) {
  const t = (s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trim() + "...";
}

/* NOTE: plain CSS (NO styled-jsx) */
const PAGE_CSS = `
/* Layout helpers */
.sc-hero-shell { padding: clamp(22px, 4vw, 34px) 16px 18px; }
.sc-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 18px;
  margin-top: 18px;
  align-items: end;
}
.sc-hero-title {
  margin: 0;
  font-size: clamp(30px, 6vw, 44px);
  line-height: clamp(36px, 6.2vw, 52px);
  font-weight: 950;
}
.sc-hero-lead {
  margin: 12px 0 0;
  font-size: clamp(14px, 3.6vw, 16px);
  line-height: 1.6;
}
.sc-badge-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.sc-badge-row-left {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.sc-hero-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
}
.sc-search {
  margin-top: 18px;
  background: rgba(255,255,255,.90);
  border: 1px solid rgba(255,255,255,.70);
  border-radius: 999px;
  padding: 8px;
  box-shadow: 0 18px 40px rgba(0,0,0,.25);
  display: flex;
  gap: 10px;
  align-items: center;
  backdrop-filter: blur(10px);
  max-width: 760px;
}
.sc-search input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: 10px 14px;
  font-size: 14px;
}
.sc-search-btn { border-radius: 999px; padding: 12px 18px; width: auto; }
.sc-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.sc-section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.sc-section-head h2 {
  margin: 0;
  font-size: clamp(20px, 4vw, 22px);
  font-weight: 950;
}
.sc-section-head p { margin: 5px 0 0; }
.sc-section-link {
  white-space: nowrap;
  align-self: center;
}

@media (max-width: 980px) {
  .sc-hero-grid { grid-template-columns: 1fr !important; }
  .sc-grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .sc-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .sc-search { flex-direction: column; align-items: stretch; border-radius: 18px; }
  .sc-search-btn { width: 100%; }
}
@media (max-width: 640px) {
  .sc-grid-3 { grid-template-columns: 1fr !important; }
  .sc-stat-grid { grid-template-columns: 1fr; }
}

/* Popular destinations: one-line auto carousel */
.sc-carousel {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  background: #fff;
  border: 1px solid ${BRAND.border};
  box-shadow: 0 10px 22px rgba(0,0,0,.06);
  padding: 12px 0;
}
.sc-carousel { overflow-x: auto; scrollbar-width: thin; }
.sc-carousel::-webkit-scrollbar { height: 8px; }
.sc-carousel::-webkit-scrollbar-thumb { background: rgba(15,23,42,.18); border-radius: 999px; }

.sc-track {
  display: flex;
  gap: 12px;
  width: max-content;
  padding: 0 12px;
  animation: sc-scroll 28s linear infinite;
  will-change: transform;
}
.sc-carousel:hover .sc-track { animation-play-state: paused; }

@keyframes sc-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
`;

async function loadHomepageData() {
  const supabase = await supabaseServer();

  // 1) TRY trips_view (SAFE columns ONLY - no style)
  const tripsViewRes = await supabase
    .from("trips_view")
    .select("id,title,duration,parks,price_from,price_to,hero_url,created_at")
    .order("created_at", { ascending: false })
    .limit(18);

  // If trips_view fails or empty, fallback to trips table
  let trips: TripRow[] = (tripsViewRes.data as any) ?? [];

  if (tripsViewRes.error || trips.length === 0) {
    const tripsTblRes = await supabase
      .from("trips")
      .select("id,title,duration,parks,price_from,price_to,hero_url,created_at,style,status")
      .in("status", ["live", "published", "approved"]) // adjust if your statuses differ
      .order("created_at", { ascending: false })
      .limit(18);

    trips = (tripsTblRes.data as any) ?? [];
  }

  // Operators
  const [opsRes, opsCountRes] = await Promise.all([
    supabase
      .from("operators")
      .select("id, company_name, country, location, status, logo_url")
      .in("status", ["approved", "live"])
      .order("company_name", { ascending: true })
      .limit(9),
    supabase
      .from("operators")
      .select("id", { count: "exact", head: true })
      .in("status", ["approved", "live"]),
  ]);

  const operators: OperatorRow[] = (opsRes.data as any) ?? [];
  const approvedOperatorsCount: number =
    (opsCountRes as any)?.count ?? operators.length;

  return { trips, operators, approvedOperatorsCount };
}

export default async function HomePage() {
  // Host routing
  const h = await headers();
  const host = (h.get("host") || "").toLowerCase();

  if (host.startsWith("admin.")) redirect("/");
  if (host.startsWith("operator.")) redirect("/operators/dashboard");

  const { trips, operators, approvedOperatorsCount } = await loadHomepageData();

  // Popular destinations from parks
  const destMap = new Map<string, number>();
  for (const t of trips) {
    (t.parks ?? []).forEach((p) => {
      const k = (p || "").trim();
      if (!k) return;
      destMap.set(k, (destMap.get(k) || 0) + 1);
    });
  }

  const popularDestinations = Array.from(destMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name);

  // Duplicate for seamless loop
  const carouselItems = popularDestinations.length
    ? [...popularDestinations, ...popularDestinations]
    : [];

  const stats = {
    trips: trips.length,
    operators: approvedOperatorsCount,
    parks: destMap.size,
  };

  const heroBg = "/home/hero.jpg";
  const liveTripTitle =
    trips.length > 0
      ? trips[Math.floor(Math.random() * trips.length)].title
      : "tailor-made safaris";

  return (
    <main style={{ background: BRAND.sand, minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      {/* HERO */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        {/* bg */}
        <div style={{ position: "absolute", inset: 0 }}>
          <Image
            src={heroBg}
            alt="Safari Connector"
            fill
            priority
            style={{ objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.45) 45%, rgba(244,243,237,.96) 100%)",
            }}
          />
        </div>

        <div
          className="sc-hero-shell"
          style={{
            position: "relative",
            maxWidth: 1180,
            margin: "0 auto",
          }}
        >
          {/* Pills */}
          <div
            className="sc-badge-row"
          >
            <div
              className="sc-badge-row-left"
            >
              <Badge
                style={{
                  background: "rgba(255,255,255,.90)",
                  color: BRAND.green,
                  border: "1px solid rgba(255,255,255,.65)",
                }}
              >
                Tanzania-born marketplace
              </Badge>

              <div
                style={{
                  background: "rgba(27,77,62,.86)",
                  color: "#ECFEFF",
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                  border: "1px solid rgba(255,255,255,.14)",
                  backdropFilter: "blur(8px)",
                }}
              >
                Travelers are exploring:{" "}
                <span style={{ fontWeight: 950 }}>
                  {clampText(liveTripTitle, 44)}
                </span>
              </div>
            </div>

            <div className="sc-hero-actions">
              {/* Login goes to main domain traveller login */}
              <a
                href={TRAVELLER_LOGIN_URL}
                style={{ textDecoration: "none" }}
              >
                <Button
                  variant="outline"
                  style={{
                    borderRadius: 999,
                    background: "rgba(255,255,255,.88)",
                    borderColor: "rgba(255,255,255,.65)",
                    color: BRAND.ink,
                    fontWeight: 900,
                  }}
                >
                  Login
                </Button>
              </a>

              <Link href="/plan" style={{ textDecoration: "none" }}>
                <Button
                  style={{
                    borderRadius: 999,
                    background: `linear-gradient(135deg, ${BRAND.green2}, #22C55E 60%, #FACC15)`,
                    border: "none",
                    fontWeight: 950,
                    boxShadow: "0 16px 34px rgba(0,0,0,.35)",
                  }}
                >
                  Build with AI
                </Button>
              </Link>
            </div>
          </div>

          {/* Headline + Search */}
          <div
            className="sc-hero-grid"
          >
            <div>
              <h1
                className="sc-hero-title"
                style={{
                  color: "#F8FAFC",
                  textShadow: "0 10px 30px rgba(0,0,0,.55)",
                  letterSpacing: "-0.02em",
                }}
              >
                Book a safari with confidence
                <br />
                curated trips, real operators,
                <br />
                transparent quotes.
              </h1>

              <p
                className="sc-hero-lead"
                style={{
                  color: "rgba(255,255,255,.88)",
                  maxWidth: 680,
                }}
              >
                Start with AI or browse itineraries. Request quotes from vetted
                operators across Tanzania and beyond.
              </p>

              {/* Search bar (visual like mockup) */}
              <div className="sc-search">
                <input
                  placeholder="Search parks, routes, or trip name (e.g. Serengeti)"
                  style={{ color: BRAND.ink }}
                />
                <Link href="/trips" style={{ textDecoration: "none" }}>
                  <Button
                    className="sc-search-btn"
                    style={{
                      background: BRAND.green,
                      border: "none",
                      fontWeight: 950,
                    }}
                  >
                    Browse Trips
                  </Button>
                </Link>
              </div>

              {/* Quick chips */}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Serengeti", "Ngorongoro", "Zanzibar", "Kilimanjaro"].map(
                  (k) => (
                    <Link
                      key={k}
                      href={`/trips?park=${encodeURIComponent(k)}`}
                      style={{ textDecoration: "none" }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "7px 12px",
                          borderRadius: 999,
                          background: "rgba(15,23,42,.42)",
                          border: "1px solid rgba(255,255,255,.18)",
                          color: "rgba(255,255,255,.92)",
                          fontSize: 12,
                          fontWeight: 900,
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        {k}
                      </span>
                    </Link>
                  )
                )}

                <Link href="/plan" style={{ textDecoration: "none" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "7px 12px",
                      borderRadius: 999,
                      background: "rgba(27,77,62,.65)",
                      border: "1px solid rgba(255,255,255,.18)",
                      color: "rgba(255,255,255,.95)",
                      fontSize: 12,
                      fontWeight: 950,
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    Build with AI &gt;
                  </span>
                </Link>
              </div>
            </div>

            {/* Right: Stats strip like mockup */}
            <div
              style={{
                background: "rgba(15,23,42,.50)",
                border: "1px solid rgba(255,255,255,.18)",
                borderRadius: 18,
                padding: 14,
                backdropFilter: "blur(12px)",
                boxShadow: "0 18px 40px rgba(0,0,0,.25)",
                color: "rgba(255,255,255,.92)",
              }}
            >
              <div className="sc-stat-grid">
                <Stat label="Trips" value={`${stats.trips}+`} />
                <Stat
                  label="Vetted operators"
                  value={`${stats.operators}+`}
                />
                <Stat label="Parks & regions" value={`${stats.parks}+`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BODY */}
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "26px 16px 64px",
        }}
      >
        {/* Popular destinations: one-line carousel */}
        {popularDestinations.length > 0 && (
          <section style={{ marginTop: 6 }}>
            <HeaderRow
              title="Popular destinations"
              subtitle="Based on real trips published on Safari Connector."
              href="/trips"
            />
            <div className="sc-carousel">
              <div className="sc-track">
                {carouselItems.map((name, idx) => (
                  <DestinationCard
                    key={`${name}-${idx}`}
                    name={name}
                    img={DEST_IMG[name]}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured trips */}
        <section style={{ marginTop: 26 }}>
          <HeaderRow
            title="Featured trips"
            subtitle="Curated itineraries you can still customize with your operator."
            href="/trips"
          />
          {trips.length === 0 ? (
            <EmptyCard text="No trips published yet. Check back soon." />
          ) : (
            <div
              className="sc-grid-3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              {trips.slice(0, 6).map((t, i) => (
                <TripCard key={t.id} trip={t} highlight={i === 0} />
              ))}
            </div>
          )}
        </section>

        {/* Top safari operators */}
        {operators.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <HeaderRow
              title="Top safari operators"
              subtitle="Vetted local partners you can trust."
              href="/operators"
            />
            <div
              className="sc-grid-3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              {operators.slice(0, 6).map((op) => (
                <OperatorCard key={op.id} op={op} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

/* Components */

function HeaderRow({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle?: string;
  href: string;
}) {
  return (
    <div className="sc-section-head">
      <div>
        <h2 style={{ color: BRAND.ink }}>{title}</h2>
        {subtitle ? (
          <p style={{ margin: "5px 0 0", fontSize: 13, color: BRAND.muted }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <Link
        href={href}
        className="sc-section-link"
        style={{
          color: BRAND.green2,
          fontWeight: 900,
          fontSize: 14,
          textDecoration: "none",
        }}
      >
        View all &gt;
      </Link>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div
      style={{
        border: `1px dashed ${BRAND.border}`,
        background: "#fff",
        borderRadius: 16,
        padding: 26,
        textAlign: "center",
        color: BRAND.muted,
        fontSize: 14,
      }}
    >
      {text}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 14,
        background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.12)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          opacity: 0.85,
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 3, fontSize: 18, fontWeight: 950 }}>
        {value}
      </div>
    </div>
  );
}

function DestinationCard({ name, img }: { name: string; img?: string }) {
  return (
    <Link
      href={`/trips?park=${encodeURIComponent(name)}`}
      style={{ textDecoration: "none", color: "inherit", flex: "0 0 auto" }}
    >
      <div
        style={{
          width: 300,
          height: 120,
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${BRAND.border}`,
          background: "#fff",
          position: "relative",
        }}
      >
        <div style={{ position: "relative", height: "100%" }}>
          {img ? (
            <Image src={img} alt={name} fill style={{ objectFit: "cover" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "#F3F4F6" }} />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.62) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 12,
              bottom: 10,
              color: "#fff",
              fontWeight: 950,
              fontSize: 15,
              textShadow: "0 2px 8px rgba(0,0,0,.35)",
            }}
          >
            {name}
          </div>
        </div>
      </div>
    </Link>
  );
}

function TripCard({ trip, highlight }: { trip: TripRow; highlight?: boolean }) {
  const imgSrc = trip.hero_url || `/trips/${trip.id}.jpg`;
  const remote = isRemoteUrl(imgSrc);

  const price =
    typeof trip.price_from === "number" && trip.price_from > 0
      ? `From ${money(trip.price_from) ?? ""}`
      : "Price on request";

  return (
    <Link
      href={`/trips/${trip.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          border: highlight ? `2px solid ${BRAND.green2}` : `1px solid ${BRAND.border}`,
          borderRadius: 18,
          overflow: "hidden",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          boxShadow: highlight
            ? "0 16px 34px rgba(27,77,62,.20)"
            : "0 1px 3px rgba(0,0,0,.05)",
          transform: highlight ? "translateY(-2px)" : "none",
        }}
      >
        <div style={{ position: "relative", height: 180, background: "#F3F4F6" }}>
          {imgSrc ? (
            remote ? (
              <img
                src={imgSrc}
                alt={trip.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <Image
                src={imgSrc}
                alt={trip.title}
                fill
                style={{ objectFit: "cover" }}
              />
            )
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "#F3F4F6" }} />
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)",
            }}
          />

          {highlight ? (
            <div
              style={{
                position: "absolute",
                left: 10,
                top: 10,
                background: "rgba(27,77,62,.92)",
                color: "#ECFEFF",
                padding: "5px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 950,
                border: "1px solid rgba(255,255,255,.14)",
              }}
            >
              Safari of the week
            </div>
          ) : null}

          <div style={{ position: "absolute", left: 12, bottom: 12, right: 12 }}>
            <div
              style={{
                color: "#fff",
                fontWeight: 950,
                fontSize: 16,
                lineHeight: 1.25,
                textShadow: "0 2px 10px rgba(0,0,0,.35)",
              }}
            >
              {clampText(trip.title, 56)}
            </div>
            <div
              style={{
                marginTop: 6,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                fontSize: 12,
                color: "rgba(255,255,255,.92)",
              }}
            >
              {trip.duration ? <span>{trip.duration} days</span> : null}
              {trip.parks?.length ? (
                <span>
                  - {trip.parks.slice(0, 2).join(", ")}
                  {trip.parks.length > 2 ? " +" : ""}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: `1px solid ${BRAND.border}`,
            padding: "10px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 950, color: BRAND.green2 }}>
            {price}
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, color: BRAND.green2 }}>
            View &gt;
          </div>
        </div>
      </div>
    </Link>
  );
}

function OperatorCard({ op }: { op: OperatorRow }) {
  const isApproved =
    (op.status || "").toLowerCase() === "approved" ||
    (op.status || "").toLowerCase() === "live";

  const statusLabel = isApproved ? "Approved" : (op.status || "Pending").toString();

  return (
    <Link
      href={`/operators/${op.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          border: `1px solid ${BRAND.border}`,
          borderRadius: 18,
          background: "#fff",
          padding: 14,
          boxShadow: "0 2px 10px rgba(0,0,0,.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            {op.logo_url ? (
              <img
                src={op.logo_url}
                alt={op.company_name || "Operator"}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  objectFit: "cover",
                  border: `1px solid ${BRAND.border}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "#F3F4F6",
                  border: `1px solid ${BRAND.border}`,
                }}
              />
            )}

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 950,
                  color: BRAND.ink,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {op.company_name || "Safari operator"}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: BRAND.muted }}>
                {op.location || op.country || "Location not set"}
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 999,
              background: isApproved ? "#ECFDF3" : "#FEF3C7",
              color: isApproved ? "#166534" : "#92400E",
              fontWeight: 900,
            }}
          >
            {statusLabel}
          </span>
        </div>

        <p style={{ marginTop: 10, fontSize: 12, color: "#4B5563", lineHeight: 1.6 }}>
          Verified local partner on Safari Connector. Manage trips, quotes and
          bookings via your operator dashboard.
        </p>
      </div>
    </Link>
  );
}
