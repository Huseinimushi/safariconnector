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
};

type OperatorRow = {
  id: string;
  company_name: string | null;
  country: string | null;
  location: string | null;
  status: string | null;
};

/* ─────────────── Local destination images (put files in /public/destinations) ─────────────── */
const DEST_IMG: Record<string, string> = {
  Serengeti: "/destinations/serengeti.jpg",
  Ngorongoro: "/destinations/ngorongoro.jpg",
  Kilimanjaro: "/destinations/kilimanjaro.jpg",
  Zanzibar: "/destinations/zanzibar.jpg",
  Tarangire: "/destinations/tarangire.jpg",
  Manyara: "/destinations/manyara.jpg",
};

// Helper: check kama URL ni remote (http/https)
const isRemoteUrl = (src: string | null | undefined) =>
  !!src && (src.startsWith("http://") || src.startsWith("https://"));

export default async function HomePage() {
  // ── Host-based routing: admin/operator wasipewe homepage ──
  const h = await headers();
  const host = (h.get("host") || "").toLowerCase();

  if (host.startsWith("admin.")) {
    redirect("/");
  }

  if (host.startsWith("operator.")) {
    redirect("/operators/dashboard");
  }

  // ✅ supabaseServer() returns Promise<SupabaseClient> → must await
  const supabase = await supabaseServer();

  // Pull data (trips, top approved operators, total approved operators count)
  const [tripsRes, opsRes, opsCountRes] = await Promise.all([
    supabase
      .from("trips_view")
      .select("id,title,duration,parks,price_from,price_to,hero_url,created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("operators")
      .select("id, company_name, country, location, status")
      .in("status", ["approved", "live"])
      .order("company_name", { ascending: true })
      .limit(6),
    supabase
      .from("operators")
      .select("id", { count: "exact", head: true })
      .in("status", ["approved", "live"]),
  ]);

  const trips: TripRow[] = tripsRes.data ?? [];
  const operators: OperatorRow[] = opsRes.data ?? [];
  const approvedOperatorsCount: number =
    (opsCountRes as any)?.count ?? operators.length;

  // Popular destinations from real parks
  const destMap = new Map<string, number>();
  for (const t of trips) {
    (t.parks ?? []).forEach((p) => {
      if (!p) return;
      destMap.set(p, (destMap.get(p) || 0) + 1);
    });
  }

  const popularDestinations = Array.from(destMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);

  // Stats (ONLY approved/live operators)
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
    <main className="home-shell">
      {/* ───────────────── HERO ───────────────── */}
      <section className="home-hero">
        {/* Background image */}
        <div className="home-hero-bg">
          <Image
            src={heroBg}
            alt="Safari Connector"
            fill
            className="object-cover"
            priority
          />
          <div className="home-hero-overlay" />
        </div>

        {/* Hero content */}
        <div className="home-hero-grid">
          {/* LEFT: text + CTAs */}
          <div className="home-hero-left">
            {/* Dynamic activity pill */}
            <div
              style={{
                background: "rgba(15,118,110,0.96)",
                color: "#ECFEFF",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                width: "fit-content",
                marginBottom: 10,
                boxShadow: "0 6px 18px rgba(0,0,0,.4)",
              }}
            >
              🔥 Travelers are exploring:{" "}
              <span style={{ fontWeight: 800 }}>{liveTripTitle}</span>
            </div>

            <Badge
              style={{
                background: "rgba(214,239,229,0.95)",
                color: "#0B7A53",
                border: "none",
                marginBottom: 8,
              }}
            >
              Safari Connector Marketplace · Tanzania born
            </Badge>

            <h1
              style={{
                margin: 0,
                fontSize: 42,
                lineHeight: "48px",
                fontWeight: 900,
                color: "#F9FAFB",
                textShadow: "0 3px 18px rgba(0,0,0,.8)",
              }}
            >
              Plan, compare & book the perfect African safari.
            </h1>

            <p
              style={{
                color: "#E5E7EB",
                marginTop: 12,
                fontSize: 16,
                maxWidth: 580,
              }}
            >
              Start with AI or browse curated itineraries, then request quotes
              from trusted local operators across Tanzania and East & Southern
              Africa — all inside one clean marketplace.
            </p>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 20,
                flexWrap: "wrap",
              }}
            >
              <Link href="/plan">
                <Button
                  style={{
                    borderRadius: 16,
                    padding: "12px 22px",
                    fontWeight: 800,
                    boxShadow: "0 14px 30px rgba(0,0,0,.55)",
                    background:
                      "linear-gradient(135deg, #0B7A53, #22C55E 60%, #FACC15)",
                    border: "none",
                  }}
                >
                  ✨ Build a Trip with AI
                </Button>
              </Link>
              <Link href="/trips">
                <Button
                  variant="outline"
                  style={{
                    borderRadius: 16,
                    borderColor: "rgba(209,213,219,0.9)",
                    background: "rgba(15,23,42,0.55)",
                    color: "#E5E7EB",
                  }}
                >
                  Browse Trips
                </Button>
              </Link>
              <Link href="/operators">
                <Button
                  variant="ghost"
                  style={{
                    borderRadius: 16,
                    color: "#E5E7EB",
                  }}
                >
                  Safari Operators
                </Button>
              </Link>
            </div>

            {/* Small trust strip */}
            <div
              style={{
                marginTop: 18,
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                fontSize: 12,
                color: "#BBF7D0",
              }}
            >
              <span>✅ Licensed local operators only</span>
              <span>•</span>
              <span>🦁 Focus on wildlife & culture, not stress</span>
              <span>•</span>
              <span>💬 Human support from East Africa</span>
            </div>
          </div>

          {/* RIGHT: glass card */}
          <div className="home-hero-right">
            <div
              style={{
                background: "rgba(15,23,42,0.88)",
                borderRadius: 22,
                padding: 16,
                border: "1px solid rgba(148,163,184,0.55)",
                color: "#E5E7EB",
                boxShadow: "0 22px 45px rgba(0,0,0,.75)",
                backdropFilter: "blur(14px)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  color: "#A7F3D0",
                  marginBottom: 4,
                }}
              >
                Instant inspiration
              </div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>
                Start with a popular route
              </div>

              <ul
                style={{
                  margin: "12px 0 0",
                  paddingLeft: 18,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "#E5E7EB",
                }}
              >
                <li>Tell us where, when & your budget.</li>
                <li>AI suggests a custom safari itinerary.</li>
                <li>Local operators reply with tailored quotes.</li>
              </ul>

              <div
                style={{
                  marginTop: 16,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px dashed rgba(148,163,184,0.8)",
                  background: "rgba(15,23,42,0.75)",
                  fontSize: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span>⚖️ Free & no booking obligation</span>
                <span>⏱ Under 2 minutes to get started</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip at bottom of hero */}
        <div className="home-hero-stats-wrap">
          <div className="home-hero-stats">
            <span>🌍 {stats.trips}+ curated trips</span>
            <span>•</span>
            <span>{stats.operators}+ vetted operators</span>
            <span>•</span>
            <span>{stats.parks}+ parks & regions</span>
          </div>
        </div>
      </section>

      {/* ───────────────── POPULAR DESTINATIONS ───────────────── */}
      {popularDestinations.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <HeaderRow
            title="Popular Destinations"
            subtitle="Based on real trips listed on Safari Connector."
            href="/trips"
          />
          <div className="home-grid-dests">
            {popularDestinations.map((name) => (
              <DestinationCard key={name} name={name} img={DEST_IMG[name]} />
            ))}
          </div>
        </section>
      )}

      {/* ───────────────── FEATURED TRIPS ───────────────── */}
      <section style={{ marginTop: 40 }}>
        <HeaderRow
          title="Featured Trips"
          subtitle="Hand-picked itineraries you can still customize with your operator."
          href="/trips"
        />

        {trips.length === 0 ? (
          <EmptyCard text="No trips published yet. Check back soon." />
        ) : (
          <div className="home-grid-trips">
            {trips.slice(0, 4).map((t, index) => (
              <TripCard key={t.id} trip={t} highlight={index === 0} />
            ))}
          </div>
        )}
      </section>

      {/* ───────────────── HOW IT WORKS ───────────────── */}
      <section style={{ marginTop: 44 }}>
        <div
          style={{
            borderRadius: 22,
            border: "1px solid #E5E7EB",
            background: "#FFFFFF",
            padding: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 900,
              color: "#0b2e24",
            }}
          >
            How Safari Connector Works
          </h2>
          <p style={{ marginTop: 4, fontSize: 13, color: "#6B7280" }}>
            Simple, transparent, and built around local Tanzanian & African
            experts.
          </p>

          <div className="home-grid-steps">
            <StepCard
              step="01"
              title="Design your safari"
              text="Use the AI Trip Builder or browse existing itineraries by park, budget, or style."
            />
            <StepCard
              step="02"
              title="Match with operators"
              text="Send one request to multiple vetted local companies who know the bush better than anyone."
            />
            <StepCard
              step="03"
              title="Compare & book"
              text="Review quotes, fine-tune details, then confirm directly with the operator you love most."
            />
          </div>
        </div>
      </section>

      {/* ───────────────── TOP OPERATORS (3 ONLY) ───────────────── */}
      {operators.length > 0 && (
        <section style={{ marginTop: 44 }}>
          <HeaderRow
            title="Top Safari Operators"
            subtitle="Featured partners trusted by Safari Connector."
            href="/operators"
          />
          <div className="home-grid-ops">
            {operators.slice(0, 3).map((op) => (
              <OperatorCard key={op.id} op={op} />
            ))}
          </div>
        </section>
      )}

      {/* ───────────────── TRUST STRIP ───────────────── */}
      <section className="home-grid-trust">
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
      </section>
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
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0b2e24" }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
            {subtitle}
          </p>
        )}
      </div>
      <Link
        href={href}
        style={{
          color: "#0B7A53",
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
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
        border: "1px dashed #E5E7EB",
        background: "#fff",
        borderRadius: 16,
        padding: 26,
        textAlign: "center",
        color: "#6B7280",
        fontSize: 14,
      }}
    >
      {text}
    </div>
  );
}

/* Trip card – uses DB hero_url or /public/trips/{id}.jpg */
function TripCard({ trip, highlight }: { trip: TripRow; highlight?: boolean }) {
  const imgSrc = trip.hero_url || `/trips/${trip.id}.jpg`;
  const remote = isRemoteUrl(imgSrc);

  return (
    <Link
      href={`/trips/${trip.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          border: highlight ? "2px solid #0B7A53" : "1px solid #E5E7EB",
          borderRadius: 18,
          overflow: "hidden",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          boxShadow: highlight
            ? "0 14px 30px rgba(15,118,110,.28)"
            : "0 1px 3px rgba(0,0,0,.05)",
          transform: highlight ? "translateY(-3px)" : "none",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <div style={{ position: "relative", height: 160, background: "#F3F4F6" }}>
          {imgSrc &&
            (remote ? (
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
              <Image src={imgSrc} alt={trip.title} fill className="object-cover" />
            ))}

          {highlight && (
            <div
              style={{
                position: "absolute",
                left: 10,
                top: 10,
                background: "rgba(15,118,110,0.94)",
                color: "#ECFEFF",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Safari of the week
            </div>
          )}
        </div>

        <div style={{ padding: 12, flexGrow: 1 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 16,
              color: "#111827",
              lineHeight: 1.3,
            }}
          >
            {trip.title}
          </div>
          <div
            style={{
              marginTop: 6,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            {trip.duration ? (
              <span>
                {trip.duration} day{trip.duration === 1 ? "" : "s"}
              </span>
            ) : null}
            {Array.isArray(trip.parks) && trip.parks.length > 0 ? (
              <span>
                • {trip.parks.slice(0, 2).join(", ")}
                {trip.parks.length > 2 ? " +" : ""}
              </span>
            ) : null}
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #E5E7EB",
            padding: "10px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0B7A53" }}>
            {typeof trip.price_from === "number" && trip.price_from > 0
              ? `From $${Number(trip.price_from).toLocaleString()}`
              : "Price on request"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0B7A53" }}>
            View →
          </div>
        </div>
      </div>
    </Link>
  );
}

function DestinationCard({ name, img }: { name: string; img?: string }) {
  return (
    <Link
      href={`/trips?park=${encodeURIComponent(name)}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: 16,
          overflow: "hidden",
          background: "#fff",
          position: "relative",
          height: 110,
        }}
      >
        <div style={{ position: "relative", height: "100%" }}>
          {img && <Image src={img} alt={name} fill className="object-cover" />}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.55))",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 10,
              bottom: 8,
              color: "#fff",
              fontWeight: 900,
              fontSize: 14,
              textShadow: "0 2px 6px rgba(0,0,0,.4)",
            }}
          >
            {name}
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

  const statusLabel = isApproved
    ? "Approved operator"
    : (op.status || "Pending").toString();
  const statusColor = isApproved ? "#166534" : "#92400E";
  const statusBg = isApproved ? "#ECFDF3" : "#FEF3C7";

  return (
    <Link
      href={`/operators/${op.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: 18,
          overflow: "hidden",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          boxShadow: "0 2px 6px rgba(0,0,0,.06)",
          position: "relative",
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>
              {op.company_name || "Safari operator"}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
              {op.location || op.country || "Location not set"}
            </div>
          </div>

          <span
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 999,
              backgroundColor: statusBg,
              color: statusColor,
              textTransform: "capitalize",
              whiteSpace: "nowrap",
            }}
          >
            {statusLabel}
          </span>
        </div>

        <p style={{ marginTop: 10, fontSize: 12, color: "#4B5563" }}>
          Verified local partner on Safari Connector. Manage trips, quotes and
          bookings via your operator dashboard.
        </p>
      </div>
    </Link>
  );
}

function StepCard({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid #E5E7EB",
        background: "#F9FAFB",
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: "#6B7280",
          marginBottom: 4,
        }}
      >
        Step {step}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: "#111827",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 13, color: "#4B5563" }}>{text}</div>
    </div>
  );
}

function TrustItem({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        background: "#F9FAFB",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          color: "#111827",
          marginBottom: 6,
          fontSize: 14,
        }}
      >
        {title}
      </div>
      <div style={{ color: "#374151", fontSize: 13 }}>{text}</div>
    </div>
  );
}
