// src/app/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { supabaseServer } from "@/lib/supabaseServer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/* ───────────────── Types ───────────────── */
type TripRow = {
  id: string;
  title: string;
  duration?: number | null;
  parks?: string[] | null;
  price_from?: number | null;
  price_to?: number | null;
  hero_url?: string | null;
  created_at?: string | null;
  style?: string | null;
};

type OperatorRow = {
  id: string;
  company_name: string | null;
  country: string | null;
  location: string | null;
  status: string | null;
  logo_url?: string | null;
};

/* ─────────────── Local destination images (/public/destinations) ─────────────── */
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

const isRemoteUrl = (src: string | null | undefined) =>
  !!src && (src.startsWith("http://") || src.startsWith("https://"));

function clampText(s: string, max = 72) {
  const t = (s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trim() + "…";
}

function money(n: number | null | undefined, c = "USD") {
  if (n == null || !Number.isFinite(n)) return null;
  return `${c} ${Number(n).toLocaleString()}`;
}

function prettyStyle(s?: string | null) {
  const m = String(s || "").toLowerCase();
  if (m === "premium") return "Premium";
  if (m === "balanced") return "Balanced";
  if (m === "value") return "Value";
  return "Safari";
}

export default async function HomePage() {
  // ── Host-based routing: admin/operator wasipewe main homepage ──
  const h = await headers();
  const host = (h.get("host") || "").toLowerCase();

  if (host.startsWith("admin.")) redirect("/");
  if (host.startsWith("operator.")) redirect("/operators/dashboard");

  const supabase = await supabaseServer();

  const [tripsRes, opsRes, opsCountRes] = await Promise.all([
    supabase
      .from("trips_view")
      .select("id,title,duration,parks,price_from,price_to,hero_url,created_at,style")
      .order("created_at", { ascending: false })
      .limit(18),
    supabase
      .from("operators")
      .select("id, company_name, country, location, status, logo_url")
      .in("status", ["approved", "live"])
      .order("company_name", { ascending: true })
      .limit(9),
    supabase.from("operators").select("id", { count: "exact", head: true }).in("status", ["approved", "live"]),
  ]);

  const trips: TripRow[] = tripsRes.data ?? [];
  const operators: OperatorRow[] = opsRes.data ?? [];
  const approvedOperatorsCount: number = (opsCountRes as any)?.count ?? operators.length;

  // Build destination popularity from trips.parks
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

  const stats = {
    trips: trips.length,
    operators: approvedOperatorsCount,
    parks: destMap.size,
  };

  const heroBg = "/home/hero.jpg"; // keep your existing one
  const liveTripTitle =
    trips.length > 0 ? trips[Math.floor(Math.random() * trips.length)].title : "tailor-made safaris";

  // For carousel: duplicate list for seamless loop
  const carouselItems = popularDestinations.length ? [...popularDestinations, ...popularDestinations] : [];

  return (
    <main style={{ background: BRAND.sand, minHeight: "100vh" }}>
      {/* ===================== HERO ===================== */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderBottom: `1px solid ${BRAND.border}`,
        }}
      >
        {/* Background */}
        <div style={{ position: "absolute", inset: 0 }}>
          <Image src={heroBg} alt="Safari Connector" fill priority style={{ objectFit: "cover" }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.45) 35%, rgba(244,243,237,.95) 100%)",
            }}
          />
        </div>

        {/* Hero content */}
        <div
          style={{
            position: "relative",
            maxWidth: 1180,
            margin: "0 auto",
            padding: "34px 16px 26px",
          }}
        >
          {/* Top micro-strip */}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Badge
                style={{
                  background: "rgba(255,255,255,.92)",
                  color: BRAND.green,
                  border: "1px solid rgba(255,255,255,.65)",
                  backdropFilter: "blur(8px)",
                }}
              >
                Tanzania-born marketplace
              </Badge>

              <div
                style={{
                  background: "rgba(27,77,62,.92)",
                  color: "#ECFEFF",
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  border: "1px solid rgba(255,255,255,.14)",
                  backdropFilter: "blur(8px)",
                }}
              >
                Live: <span style={{ fontWeight: 900 }}>{clampText(liveTripTitle, 44)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/login" style={{ textDecoration: "none" }}>
                <Button
                  variant="outline"
                  style={{
                    borderRadius: 999,
                    background: "rgba(255,255,255,.88)",
                    borderColor: "rgba(255,255,255,.65)",
                    color: BRAND.ink,
                    fontWeight: 800,
                  }}
                >
                  Login
                </Button>
              </Link>
              <Link href="/plan" style={{ textDecoration: "none" }}>
                <Button
                  style={{
                    borderRadius: 999,
                    background: `linear-gradient(135deg, ${BRAND.green2}, #22C55E 60%, #FACC15)`,
                    border: "none",
                    fontWeight: 900,
                    boxShadow: "0 16px 34px rgba(0,0,0,.35)",
                  }}
                >
                  Build with AI
                </Button>
              </Link>
            </div>
          </div>

          {/* Headline + search card */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, .95fr)",
              gap: 18,
              alignItems: "stretch",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 44,
                  lineHeight: "50px",
                  fontWeight: 950,
                  color: "#F8FAFC",
                  textShadow: "0 10px 30px rgba(0,0,0,.55)",
                  letterSpacing: "-0.02em",
                }}
              >
                Book a safari with confidence —
                <br />
                curated trips, real operators,
                <br />
                transparent quotes.
              </h1>

              <p
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  color: "rgba(255,255,255,.90)",
                  fontSize: 16,
                  maxWidth: 680,
                  lineHeight: 1.55,
                }}
              >
                Start with AI or browse itineraries. Request quotes from vetted local operators across Tanzania and beyond.
              </p>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  color: "rgba(255,255,255,.9)",
                  fontSize: 12,
                }}
              >
                <span>✅ Licensed local operators</span>
                <span>•</span>
                <span>💬 Human support</span>
                <span>•</span>
                <span>⚖️ No booking obligation</span>
              </div>
            </div>

            {/* Search / CTA card */}
            <div
              style={{
                background: "rgba(255,255,255,.92)",
                border: "1px solid rgba(255,255,255,.70)",
                borderRadius: 22,
                padding: 14,
                boxShadow: "0 18px 40px rgba(0,0,0,.35)",
                backdropFilter: "blur(10px)",
                alignSelf: "end",
              }}
            >
              <div style={{ fontSize: 12, color: BRAND.muted, fontWeight: 800, letterSpacing: ".10em", textTransform: "uppercase" }}>
                Quick search
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <input
                  placeholder="Search parks, routes, or trip name… (e.g. Serengeti)"
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    border: `1px solid ${BRAND.border}`,
                    padding: "12px 14px",
                    fontSize: 14,
                    outline: "none",
                    background: "#fff",
                  }}
                />
                <Link href="/trips" style={{ textDecoration: "none" }}>
                  <Button
                    style={{
                      borderRadius: 999,
                      background: BRAND.green,
                      border: "none",
                      fontWeight: 900,
                      padding: "12px 16px",
                    }}
                  >
                    Browse
                  </Button>
                </Link>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Serengeti", "Ngorongoro", "Zanzibar", "Kilimanjaro", "Tarangire"].map((k) => (
                  <Link key={k} href={`/trips?park=${encodeURIComponent(k)}`} style={{ textDecoration: "none" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 12px",
                        borderRadius: 999,
                        border: `1px solid ${BRAND.border}`,
                        background: "#fff",
                        fontSize: 12,
                        fontWeight: 800,
                        color: BRAND.ink,
                      }}
                    >
                      {k}
                    </span>
                  </Link>
                ))}
                <Link href="/plan" style={{ textDecoration: "none" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(27,77,62,.18)",
                      background: "rgba(27,77,62,.10)",
                      fontSize: 12,
                      fontWeight: 900,
                      color: BRAND.green,
                    }}
                  >
                    Build with AI →
                  </span>
                </Link>
              </div>

              {/* Stats row */}
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <StatPill label="Trips" value={`${stats.trips}+`} />
                <StatPill label="Operators" value={`${stats.operators}+`} />
                <StatPill label="Parks" value={`${stats.parks}+`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== BODY ===================== */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 16px 64px" }}>
        {/* Popular destinations — one-line auto carousel */}
        {popularDestinations.length > 0 && (
          <section style={{ marginTop: 6 }}>
            <HeaderRow
              title="Popular destinations"
              subtitle="Based on real trips published on Safari Connector."
              href="/trips"
            />

            <div className="sc-carousel">
              <div className="sc-track" aria-label="Popular destinations carousel">
                {carouselItems.map((name, idx) => (
                  <DestinationCard key={`${name}-${idx}`} name={name} img={DEST_IMG[name]} />
                ))}
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: BRAND.muted }}>
              Tip: hover to pause, or scroll horizontally with trackpad.
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
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 14,
              }}
              className="sc-grid-3"
            >
              {trips.slice(0, 6).map((t, i) => (
                <TripCard key={t.id} trip={t} highlight={i === 0} />
              ))}
            </div>
          )}
        </section>

        {/* Top Operators */}
        {operators.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <HeaderRow
              title="Top safari operators"
              subtitle="Vetted local partners you can trust."
              href="/operators"
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 14,
              }}
              className="sc-grid-3"
            >
              {operators.slice(0, 6).map((op) => (
                <OperatorCard key={op.id} op={op} />
              ))}
            </div>
          </section>
        )}

        {/* Trust strip */}
        <section style={{ marginTop: 28 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 14,
            }}
            className="sc-grid-3"
          >
            <TrustItem
              title="Verified local partners"
              text="We work with licensed, vetted operators — many born and raised near the parks they guide."
            />
            <TrustItem
              title="Fair, transparent quotes"
              text="Request several offers for the same trip, compare clearly, and book when you’re ready."
            />
            <TrustItem
              title="Human support, not bots"
              text="Safari Connector is built in Africa for Africa. Need help? A real human is only a message away."
            />
          </div>
        </section>
      </div>

      {/* ===================== STYLES ===================== */}
      <style jsx global>{`
        /* Responsive grids */
        @media (max-width: 980px) {
          .sc-grid-3 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 640px) {
          .sc-grid-3 {
            grid-template-columns: 1fr !important;
          }
        }

        /* Carousel */
        .sc-carousel {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          background: #fff;
          border: 1px solid ${BRAND.border};
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);
          padding: 12px 0;
        }

        .sc-track {
          display: flex;
          gap: 12px;
          width: max-content;
          padding: 0 12px;
          animation: sc-scroll 28s linear infinite;
          will-change: transform;
        }

        .sc-carousel:hover .sc-track {
          animation-play-state: paused;
        }

        @keyframes sc-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        /* Make it still usable by user scroll if needed */
        .sc-carousel {
          overflow-x: auto;
          scrollbar-width: thin;
        }
        .sc-carousel::-webkit-scrollbar {
          height: 8px;
        }
        .sc-carousel::-webkit-scrollbar-thumb {
          background: rgba(15, 23, 42, 0.18);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}

/* ───────────────── Sub-components ───────────────── */

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
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 16,
        marginBottom: 10,
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 950, color: BRAND.ink, letterSpacing: "-0.01em" }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: "5px 0 0", fontSize: 13, color: BRAND.muted }}>
            {subtitle}
          </p>
        )}
      </div>
      <Link
        href={href}
        style={{
          color: BRAND.green2,
          fontWeight: 900,
          fontSize: 14,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        View all →
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

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${BRAND.border}`,
        background: "#fff",
        padding: "10px 10px",
      }}
    >
      <div style={{ fontSize: 11, color: BRAND.muted, fontWeight: 900, letterSpacing: ".10em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ marginTop: 2, fontSize: 16, fontWeight: 950, color: BRAND.ink }}>{value}</div>
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
          width: 280,
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${BRAND.border}`,
          background: "#fff",
          position: "relative",
          height: 120,
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
              background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,.62) 100%)",
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
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {name}
            <span
              style={{
                fontSize: 12,
                fontWeight: 900,
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,.16)",
                border: "1px solid rgba(255,255,255,.18)",
              }}
            >
              Explore →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* Trip card */
function TripCard({ trip, highlight }: { trip: TripRow; highlight?: boolean }) {
  const imgSrc = trip.hero_url || `/trips/${trip.id}.jpg`;
  const remote = isRemoteUrl(imgSrc);

  const price =
    typeof trip.price_from === "number" && trip.price_from > 0
      ? `From ${money(trip.price_from) ?? ""}`
      : "Price on request";

  return (
    <Link href={`/trips/${trip.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          border: highlight ? `2px solid ${BRAND.green2}` : `1px solid ${BRAND.border}`,
          borderRadius: 18,
          overflow: "hidden",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          boxShadow: highlight ? "0 16px 34px rgba(27,77,62,.20)" : "0 1px 3px rgba(0,0,0,.05)",
          transform: highlight ? "translateY(-2px)" : "none",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <div style={{ position: "relative", height: 180, background: "#F3F4F6" }}>
          {imgSrc &&
            (remote ? (
              <img
                src={imgSrc}
                alt={trip.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <Image src={imgSrc} alt={trip.title} fill style={{ objectFit: "cover" }} />
            ))}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)",
            }}
          />

          {highlight && (
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
                fontWeight: 900,
                border: "1px solid rgba(255,255,255,.14)",
              }}
            >
              Safari of the week
            </div>
          )}

          <div style={{ position: "absolute", left: 12, bottom: 12, right: 12 }}>
            <div style={{ color: "#fff", fontWeight: 950, fontSize: 16, lineHeight: 1.25, textShadow: "0 2px 10px rgba(0,0,0,.35)" }}>
              {clampText(trip.title, 56)}
            </div>

            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "rgba(255,255,255,.92)" }}>
              {trip.duration ? <span>{trip.duration} days</span> : null}
              <span>•</span>
              <span>{prettyStyle(trip.style)}</span>
              {trip.parks?.length ? (
                <>
                  <span>•</span>
                  <span>{trip.parks.slice(0, 2).join(", ")}{trip.parks.length > 2 ? " +" : ""}</span>
                </>
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
            gap: 8,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 950, color: BRAND.green2 }}>{price}</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: BRAND.green2 }}>View →</div>
        </div>
      </div>
    </Link>
  );
}

function OperatorCard({ op }: { op: OperatorRow }) {
  const isApproved = (op.status || "").toLowerCase() === "approved" || (op.status || "").toLowerCase() === "live";
  const statusLabel = isApproved ? "Approved" : (op.status || "Pending").toString();
  const statusColor = isApproved ? "#166534" : "#92400E";
  const statusBg = isApproved ? "#ECFDF3" : "#FEF3C7";

  return (
    <Link href={`/operators/${op.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          border: `1px solid ${BRAND.border}`,
          borderRadius: 18,
          background: "#fff",
          padding: 14,
          boxShadow: "0 2px 10px rgba(0,0,0,.06)",
          height: "100%",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            {op.logo_url ? (
              <img
                src={op.logo_url}
                alt={op.company_name || "Operator"}
                style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", border: `1px solid ${BRAND.border}` }}
              />
            ) : (
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "#F3F4F6", border: `1px solid ${BRAND.border}` }} />
            )}

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 950, color: BRAND.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
              backgroundColor: statusBg,
              color: statusColor,
              whiteSpace: "nowrap",
              fontWeight: 900,
            }}
          >
            {statusLabel}
          </span>
        </div>

        <p style={{ marginTop: 10, fontSize: 12, color: "#4B5563", lineHeight: 1.6 }}>
          Verified partner on Safari Connector. Manage trips, quotes and bookings via your operator dashboard.
        </p>
      </div>
    </Link>
  );
}

function TrustItem({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${BRAND.border}`,
        borderRadius: 18,
        padding: 14,
        boxShadow: "0 2px 10px rgba(0,0,0,.06)",
      }}
    >
      <div style={{ fontWeight: 950, color: BRAND.ink, marginBottom: 6, fontSize: 14 }}>{title}</div>
      <div style={{ color: "#374151", fontSize: 13, lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}
