"use client";

import { useEffect, useMemo, useState } from "react";

type Trip = {
  id: string;
  title: string;
  duration: number;
  parks: string[];
  style: "value" | "balanced" | "premium" | string;
  price_from: number | null;
  price_to: number | null;
  images?: string[];
  operator_id?: string | null;
  status?: string;
};

const BRAND = { primary: "#1B4D3E" };

/** ✅ New: curated sample trips to seed the list or merge with API */
const NEW_TRIPS: Trip[] = [
  {
    id: "sc-001",
    title: "Serengeti & Ngorongoro Highlights – 5 Days",
    duration: 5,
    parks: ["Serengeti", "Ngorongoro"],
    style: "balanced", // Mid-range → balanced
    price_from: 1450,
    price_to: 1850,
    images: [
      "https://images.unsplash.com/photo-1526312426976-593c2e615b9a?q=80&w=1400&auto=format&fit=crop",
    ],
    status: "published",
  },
  {
    id: "sc-002",
    title: "Tarangire • Manyara • Ngorongoro – 3 Days",
    duration: 3,
    parks: ["Tarangire", "Lake Manyara", "Ngorongoro"],
    style: "value", // Budget → value
    price_from: 690,
    price_to: 890,
    images: [
      "https://images.unsplash.com/photo-1508675801651-13d2920bca27?q=80&w=1400&auto=format&fit=crop",
    ],
    status: "published",
  },
  {
    id: "sc-003",
    title: "Kilimanjaro Machame Route – 7 Days Trek",
    duration: 7,
    parks: ["Kilimanjaro"],
    style: "premium", // Private → premium
    price_from: 1890,
    price_to: 2390,
    images: [
      "https://images.unsplash.com/photo-1607863882221-5aa078c86309?q=80&w=1400&auto=format&fit=crop",
    ],
    status: "published",
  },
  {
    id: "sc-004",
    title: "Zanzibar Beach + Safari Combo – 8 Days",
    duration: 8,
    parks: ["Serengeti", "Zanzibar"],
    style: "premium", // Luxury → premium
    price_from: 3250,
    price_to: 3890,
    images: [
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1400&auto=format&fit=crop",
    ],
    status: "published",
  },
  {
    id: "sc-005",
    title: "Masai Mara Big Cats – 4 Days",
    duration: 4,
    parks: ["Masai Mara"],
    style: "balanced", // Mid-range → balanced
    price_from: 1100,
    price_to: 1390,
    images: [
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1400&auto=format&fit=crop",
    ],
    status: "published",
  },
];

export default function TripsPage() {
  const [q, setQ] = useState("");
  const [minDays, setMinDays] = useState<number | "">("");
  const [maxDays, setMaxDays] = useState<number | "">("");
  const [style, setStyle] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);

  /** Merge helper (dedupe by id) */
  function mergeTrips(seed: Trip[], incoming: Trip[]) {
    const map = new Map<string, Trip>();
    [...seed, ...incoming].forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }

const load = async () => {
  setLoading(true);
  setError(null);
  try {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (minDays) params.set("minDays", String(minDays));
    if (maxDays) params.set("maxDays", String(maxDays));
    if (style) params.set("style", style);

    const res = await fetch(`/api/trips?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();

    if (!res.ok) throw new Error(data?.error || "Failed to load trips");
    setTrips(data.trips || []);
  } catch (e: any) {
    setError(e.message || "Unknown error");
    setTrips([]); // clear old mock data
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    load(); // load on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep your filtering server-driven; client memo stays simple
  const filtered = useMemo(() => trips, [trips]);

  return (
    <main className="container trips-root">
      <header className="trips-head">
        <h1 className="trips-title" style={{ color: BRAND.primary }}>Browse Trips</h1>
        <p className="muted">Search curated itineraries from verified operators.</p>
      </header>

      {/* Filters */}
      <section className="panel filters">
        <input
          className="input"
          placeholder="Search by park, country, title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="input"
          type="number"
          min={3}
          max={30}
          placeholder="Min days"
          value={minDays}
          onChange={(e) => setMinDays(e.target.value === "" ? "" : Number(e.target.value))}
        />
        <input
          className="input"
          type="number"
          min={3}
          max={30}
          placeholder="Max days"
          value={maxDays}
          onChange={(e) => setMaxDays(e.target.value === "" ? "" : Number(e.target.value))}
        />
        <select className="input" value={style} onChange={(e) => setStyle(e.target.value)}>
          <option value="">Any style</option>
          <option value="value">Value</option>
          <option value="balanced">Balanced</option>
          <option value="premium">Premium</option>
        </select>
        <div className="actions">
          <button className="btn-primary" onClick={load} disabled={loading}>
            {loading ? "Searching…" : "Apply"}
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              setQ(""); setMinDays(""); setMaxDays(""); setStyle(""); load();
            }}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </section>

      {/* Results */}
      {error && <p className="err">{error}</p>}
      {loading && !filtered.length && (
        <div className="grid-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty">
          <p>No trips found. Try widening your filters.</p>
          <a href="/plan" className="btn-primary">Build with AI</a>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <div className="meta">
            <span>{filtered.length} trip{filtered.length > 1 ? "s" : ""} found</span>
          </div>
          <section className="grid-3">
            {filtered.map((t) => (
              <a key={t.id} href={`/trips/${t.id}`} className="card hover-float">
                <div className="thumb-16x9">
                  <img
                    src={pickTripImage(t)}
                    alt={t.title}
                    loading="lazy"
                  />
                </div>
                <div className="card-body">
                  <div className="card-title">{t.title}</div>
                  <div className="muted">
                    {t.duration} days · {t.parks?.slice(0, 2).join(" • ") || "Multiple parks"}
                  </div>
                  <div className="row">
                    <span className={`pill pill-${t.style || "value"}`}>{prettyStyle(t.style)}</span>
                    <span className="price-chip">
                      {renderPrice(t.price_from, t.price_to)}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </section>
        </>
      )}

      {/* ✅ Add clean footer spacing here */}
      <div style={{ marginTop: "6rem" }} />
    </main>
  );
}

function pickTripImage(t: Trip) {
  if (t.images?.length) return t.images[0]!;
  // fallback stock
  return "https://images.unsplash.com/photo-1543877087-ebf71fde2be1?w=1200&q=70&auto=format&fit=crop";
}

function prettyStyle(s?: string) {
  if (!s) return "Value";
  const m = s.toLowerCase();
  if (m === "balanced") return "Balanced";
  if (m === "premium") return "Premium";
  return "Value";
}

function renderPrice(min?: number | null, max?: number | null) {
  if (min && max) return `USD ${min.toLocaleString()}–${max.toLocaleString()}`;
  if (min) return `From USD ${min.toLocaleString()}`;
  return "Price on request";
}

function SkeletonCard() {
  return (
    <div className="card">
      <div className="thumb-16x9 skeleton" />
      <div className="card-body">
        <div className="sk-line w-70" />
        <div className="sk-line w-40" />
        <div className="row">
          <span className="sk-pill" />
          <span className="sk-chip" />
        </div>
      </div>
    </div>
  );
}
