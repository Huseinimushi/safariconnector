// src/components/TripCard.tsx
import Image from "next/image";
import Link from "next/link";

export type TripRow = {
  id: string;
  slug?: string | null;
  title: string;
  duration?: number | null;
  parks?: string[] | null;
  price_from?: number | null;
  price_to?: number | null;
  hero_url?: string | null;
  operator_id?: string | null;
  operator_name?: string | null;
  created_at?: string | null;
};

export default function TripCard({ t }: { t: TripRow }) {
  return (
    <Link href={`/trips/${t.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: 16,
          overflow: "hidden",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <div style={{ position: "relative", height: 160, background: "#F3F4F6" }}>
          {t.hero_url ? <Image src={t.hero_url} alt={t.title} fill className="object-cover" /> : null}
        </div>

        <div style={{ padding: 12, flexGrow: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#111827" }}>{t.title}</div>
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
            {t.duration ? <span>{t.duration} day{t.duration === 1 ? "" : "s"}</span> : null}
            {Array.isArray(t.parks) && t.parks.length > 0 ? (
              <span>• {t.parks.slice(0, 2).join(", ")}{t.parks.length > 2 ? " +" : ""}</span>
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
            {typeof t.price_from === "number" && t.price_from > 0
              ? `From $${Number(t.price_from).toLocaleString()}`
              : "Price on request"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0B7A53" }}>View →</div>
        </div>
      </div>
    </Link>
  );
}
