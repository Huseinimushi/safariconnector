// src/app/operators/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

/* ───────────────── Helpers ───────────────── */

// ✅ strict UUID validator (keeps your original)
const isUUID = (value: string | undefined | null): value is string => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
};

// ✅ NEW: operator workspace sections (so /operators/trips does NOT show "Invalid operator link")
const OPERATOR_SECTIONS = new Set([
  "dashboard",
  "trips",
  "bookings",
  "enquiries",
  "quotes",
  "inbox",
  "profile",
  "new",
  "leads",
  "payments",
  "settings",
]);

/* ───────────────── Types ───────────────── */

type OperatorRow = {
  [key: string]: any; // from operators_view
};

type TripRow = {
  id: string;
  title: string | null;
  duration: number | null;
  style: string | null;
  price_from: number | null;
  price_to: number | null;
  operator_id: string | null;
};

type ReviewRow = {
  id: string;
  operator_id: string;
  rating_overall: number | null;
  title: string | null;
  comment: string | null;
  guest_name: string | null;
  created_at: string | null;
};

type PhotoRow = {
  id: string;
  operator_id: string;
  image_url: string | null;
  caption: string | null;
  created_at: string | null;
};

/* ───────────────── Quote Request Form ───────────────── */

type QuoteFormProps = {
  operatorId: string;
  operatorName: string;
};

function QuoteRequestForm({ operatorId, operatorName }: QuoteFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!fullName || !email || !operatorId) {
      setStatus("❌ Please fill in your name and email.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.from("operator_quotes").insert({
        operator_id: operatorId,
        full_name: fullName,
        email,
        travel_start_date: travelStart || null,
        travel_end_date: travelEnd || null,
        group_size: groupSize ? Number(groupSize) : null,
        message: message || null,
      });

      if (error) {
        console.error("quote insert error:", error);
        setStatus("❌ Failed to send your request. Please try again.");
      } else {
        setStatus("✅ Your request has been sent to the operator.");
        setFullName("");
        setEmail("");
        setTravelStart("");
        setTravelEnd("");
        setGroupSize("");
        setMessage("");
      }
    } catch (err: any) {
      console.error("quote insert exception:", err);
      setStatus("❌ Unexpected error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      style={{
        marginTop: 20,
        borderRadius: 20,
        border: "1px solid #E5E7EB",
        background: "#FFFFFF",
        padding: 16,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 800,
          color: "#0b2e24",
        }}
      >
        Request a quote from {operatorName}
      </h2>
      <p
        style={{
          margin: 0,
          marginTop: 4,
          fontSize: 13,
          color: "#6B7280",
        }}
      >
        Share a few details about your trip and this operator will reply with a
        personalised safari proposal.
      </p>

      {status && (
        <div
          style={{
            marginTop: 10,
            borderRadius: 10,
            padding: "6px 10px",
            fontSize: 13,
            backgroundColor: status.startsWith("✅") ? "#ECFDF5" : "#FEF2F2",
            color: status.startsWith("✅") ? "#166534" : "#B91C1C",
            border: `1px solid ${
              status.startsWith("✅") ? "#BBF7D0" : "#FECACA"
            }`,
          }}
        >
          {status}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "#374151" }}>Full name *</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            style={{
              padding: "7px 9px",
              borderRadius: 10,
              border: "1px solid #D1D5DB",
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "#374151" }}>Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "7px 9px",
              borderRadius: 10,
              border: "1px solid #D1D5DB",
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "#374151" }}>
            Travel start date
          </label>
          <input
            type="date"
            value={travelStart}
            onChange={(e) => setTravelStart(e.target.value)}
            style={{
              padding: "7px 9px",
              borderRadius: 10,
              border: "1px solid #D1D5DB",
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "#374151" }}>
            Travel end date
          </label>
          <input
            type="date"
            value={travelEnd}
            onChange={(e) => setTravelEnd(e.target.value)}
            style={{
              padding: "7px 9px",
              borderRadius: 10,
              border: "1px solid #D1D5DB",
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "#374151" }}>
            Group size (number of travellers)
          </label>
          <input
            type="number"
            min={1}
            value={groupSize}
            onChange={(e) => setGroupSize(e.target.value)}
            style={{
              padding: "7px 9px",
              borderRadius: 10,
              border: "1px solid #D1D5DB",
              fontSize: 13,
            }}
          />
        </div>

        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <label style={{ fontSize: 12, color: "#374151" }}>
            Tell us about your safari plans
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Example: 7 days in July, 2 adults + 1 child, focus on big cats and Serengeti."
            style={{
              padding: "7px 9px",
              borderRadius: 10,
              border: "1px solid #D1D5DB",
              fontSize: 13,
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            gridColumn: "1 / -1",
            marginTop: 4,
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
              backgroundColor: "#0B6B3A",
              color: "#FFFFFF",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              opacity: busy ? 0.8 : 1,
            }}
          >
            {busy ? "Sending request…" : "Send quote request"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ───────────────── Review Form ───────────────── */

type ReviewFormProps = {
  operatorId: string;
  onCreated?: (review: ReviewRow) => void;
};

function ReviewForm({ operatorId, onCreated }: ReviewFormProps) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!operatorId) {
      setStatus("❌ Operator not found.");
      return;
    }
    if (!rating) {
      setStatus("❌ Please select a rating.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        operator_id: operatorId,
        rating_overall: Number(rating),
        title: title || null,
        comment: comment || null,
        guest_name: name || null,
      };

      const { data, error } = await supabase
        .from("operator_reviews")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        console.error("review insert error:", error);
        setStatus("❌ Failed to submit review. Please try again.");
      } else {
        setStatus("✅ Thank you! Your review has been submitted.");
        setName("");
        setRating("5");
        setTitle("");
        setComment("");

        if (data && onCreated) {
          onCreated(data as ReviewRow);
        }
      }
    } catch (err: any) {
      console.error("review insert exception:", err);
      setStatus("❌ Unexpected error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      style={{
        marginTop: 16,
        borderRadius: 16,
        border: "1px dashed #E5E7EB",
        background: "#F9FAFB",
        padding: 12,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 700,
          color: "#111827",
        }}
      >
        Leave a review
      </h3>
      <p
        style={{
          margin: 0,
          marginTop: 2,
          fontSize: 12,
          color: "#6B7280",
        }}
      >
        Share your experience to help other travellers.
      </p>

      {status && (
        <div
          style={{
            marginTop: 8,
            borderRadius: 8,
            padding: "6px 9px",
            fontSize: 12,
            backgroundColor: status.startsWith("✅") ? "#ECFDF5" : "#FEF2F2",
            color: status.startsWith("✅") ? "#166534" : "#B91C1C",
            border: `1px solid ${
              status.startsWith("✅") ? "#BBF7D0" : "#FECACA"
            }`,
          }}
        >
          {status}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: 8,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 8,
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ color: "#374151" }}>Your name</label>
          <input
            type="text"
            placeholder="Optional"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              fontSize: 12,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ color: "#374151" }}>Rating *</label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              fontSize: 12,
            }}
          >
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Very good</option>
            <option value="3">3 - Good</option>
            <option value="2">2 - Fair</option>
            <option value="1">1 - Poor</option>
          </select>
        </div>

        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <label style={{ color: "#374151" }}>Title</label>
          <input
            type="text"
            placeholder="Example: Amazing migration safari"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              fontSize: 12,
            }}
          />
        </div>

        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <label style={{ color: "#374151" }}>Your review</label>
          <textarea
            rows={3}
            placeholder="Tell other travellers about your safari with this operator."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              fontSize: 12,
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            justifyContent: "flex-start",
            marginTop: 4,
          }}
        >
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
              backgroundColor: "#111827",
              color: "#FFFFFF",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              opacity: busy ? 0.8 : 1,
            }}
          >
            {busy ? "Sending…" : "Submit review"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ───────────────── Main Page ───────────────── */

export default function PublicOperatorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const rawParam = (params?.id as string | undefined) ?? "";
  const slug = rawParam.trim().toLowerCase();

  // ✅ NEW: if slug is a section (trips/quotes/etc) redirect to operator panel route
  useEffect(() => {
    if (!slug) return;
    if (OPERATOR_SECTIONS.has(slug)) {
      router.replace(`/${slug}`);
    }
  }, [router, slug]);

  // ✅ keep your original states
  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [primaryOperatorId, setPrimaryOperatorId] = useState<string | null>(
    null
  );
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gallerySelected, setGallerySelected] = useState<PhotoRow | null>(null);

  // ✅ operatorId is ONLY valid if UUID
  const operatorIdFromUrl = useMemo(() => {
    return isUUID(rawParam) ? rawParam : null;
  }, [rawParam]);

  useEffect(() => {
    // If this is a section slug, we are redirecting; don't show invalid.
    if (OPERATOR_SECTIONS.has(slug)) return;

    // ✅ handle missing OR non-UUID id BEFORE calling Supabase
    if (!operatorIdFromUrl) {
      console.warn("Invalid operator id in URL:", rawParam);
      setOperator(null);
      setTrips([]);
      setReviews([]);
      setPhotos([]);
      setPrimaryOperatorId(null);
      setErrorMsg("Invalid operator link.");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1) Load operator from operators_view
        let operatorRow: OperatorRow | null = null;

        const { data: opViewRows, error: opViewErr } = await supabase
          .from("operators_view")
          .select("*")
          .eq("id", operatorIdFromUrl);

        if (opViewErr) {
          console.error(
            "operators_view load error:",
            opViewErr,
            "message:",
            (opViewErr as any)?.message,
            "details:",
            (opViewErr as any)?.details,
            "code:",
            (opViewErr as any)?.code
          );
        }

        if (opViewRows && opViewRows.length > 0) {
          operatorRow = opViewRows[0] as OperatorRow;
        }

        if (!operatorRow) {
          setOperator(null);
          setTrips([]);
          setReviews([]);
          setPhotos([]);
          setPrimaryOperatorId(null);
          setLoading(false);
          return;
        }

        setOperator(operatorRow);

        // 2) Build operator_id candidates (UUID only!)
        const idCandidates: string[] = [];
        if (typeof operatorRow.id === "string" && isUUID(operatorRow.id)) {
          idCandidates.push(operatorRow.id);
        }
        if (
          typeof operatorRow.operator_id === "string" &&
          isUUID(operatorRow.operator_id)
        ) {
          idCandidates.push(operatorRow.operator_id);
        }
        if (typeof operatorRow.user_id === "string" && isUUID(operatorRow.user_id)) {
          // NOTE: only include this if your DB uses user_id as operator_id anywhere
          // else remove this line to be extra strict
          idCandidates.push(operatorRow.user_id);
        }

        const uniqueIds = Array.from(new Set(idCandidates)).filter(Boolean);
        const operatorIdList = uniqueIds.length > 0 ? uniqueIds : [operatorIdFromUrl];

        setPrimaryOperatorId(operatorIdList[0]);

        // 3) Load trips, reviews, photos
        const [tripsRes, reviewsRes, photosRes] = await Promise.all([
          supabase
            .from("trips")
            .select(
              "id,title,duration,style,price_from,price_to,operator_id,created_at"
            )
            .in("operator_id", operatorIdList)
            .order("created_at", { ascending: false }),
          supabase
            .from("operator_reviews")
            .select("*")
            .in("operator_id", operatorIdList)
            .order("created_at", { ascending: false }),
          supabase
            .from("operator_photos")
            .select("*")
            .in("operator_id", operatorIdList)
            .order("created_at", { ascending: false }),
        ]);

        if (tripsRes.error) {
          console.error("public operator trips load error:", tripsRes.error);
          setErrorMsg("Could not load trips for this operator.");
          setTrips([]);
        } else {
          setTrips((tripsRes.data || []) as TripRow[]);
        }

        if (reviewsRes.error) {
          console.warn("operator_reviews load error:", reviewsRes.error);
          setReviews([]);
        } else {
          setReviews((reviewsRes.data || []) as ReviewRow[]);
        }

        if (photosRes.error) {
          console.warn("operator_photos load error:", photosRes.error);
          setPhotos([]);
        } else {
          setPhotos((photosRes.data || []) as PhotoRow[]);
        }
      } catch (err: any) {
        console.error("public operator page load exception:", err);
        setErrorMsg("Unexpected error while loading operator profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [operatorIdFromUrl, rawParam, slug]);

  // If redirecting to /trips etc, show nothing heavy
  if (OPERATOR_SECTIONS.has(slug)) {
    return (
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 16px",
          color: "#6B7280",
          fontSize: 14,
        }}
      >
        Loading…
      </main>
    );
  }

  if (!operatorIdFromUrl) {
    return (
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 16px",
        }}
      >
        Invalid operator link.
      </main>
    );
  }

  if (loading) {
    return (
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 16px",
          fontSize: 14,
          color: "#6B7280",
        }}
      >
        Loading operator profile…
      </main>
    );
  }

  if (!operator) {
    return (
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 16px",
          fontSize: 14,
          color: "#B91C1C",
        }}
      >
        Operator profile not found.
      </main>
    );
  }

  /* ───────── Derived values (same idea as yours) ───────── */

  const name =
    (operator.name as string) ||
    (operator.company_name as string) ||
    "Safari operator";

  const country =
    (operator.country as string) ||
    (operator.operator_country as string) ||
    "Africa";

  const city =
    (operator.city as string) || (operator.location as string) || "";

  const location = city ? `${city}, ${country}` : country;

  const contactPerson =
    (operator.contact_person as string) || (operator.contact_name as string);

  const email =
    (operator.email as string) ||
    (operator.contact_email as string) ||
    (operator.operator_email as string);

  const statusLabel = "Active";
  const isApproved = true;

  const description =
    (operator.description as string) ||
    `${name} is a licensed safari company working with Safari Connector to host travellers across Africa. This profile will later include more details about vehicles, guides and preferred routes.`;

  const tripsCount = trips.length;

  const overallRatings = reviews
    .map((r) => r.rating_overall)
    .filter((v): v is number => typeof v === "number");
  const avgOverall =
    overallRatings.length > 0
      ? overallRatings.reduce((a, b) => a + b, 0) / overallRatings.length
      : null;

  const formatStars = (value: number | null) => {
    if (value === null) return "No rating";
    return `${value.toFixed(1)}★`;
  };

  const gallerySource: PhotoRow[] =
    photos.length > 0
      ? photos
      : [
          {
            id: "default-1",
            operator_id: primaryOperatorId || "default",
            image_url:
              "https://images.pexels.com/photos/2403207/pexels-photo-2403207.jpeg",
            caption: "Game drive on the Serengeti plains",
            created_at: null,
          },
          {
            id: "default-2",
            operator_id: primaryOperatorId || "default",
            image_url:
              "https://images.pexels.com/photos/1270209/pexels-photo-1270209.jpeg",
            caption: "Sunset over acacia trees",
            created_at: null,
          },
        ];

  /* ───────── Render (replace your "...rest of JSX" with your real JSX) ───────── */

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 16px 64px" }}>
      {errorMsg && (
        <div
          style={{
            marginBottom: 14,
            borderRadius: 12,
            padding: "8px 12px",
            fontSize: 13,
            backgroundColor: "#FEF3C7",
            color: "#92400E",
            border: "1px solid #FDE68A",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* HERO / HEADER (keep your original JSX here) */}
      <section
        style={{
          borderRadius: 24,
          overflow: "hidden",
          border: "1px solid #E5E7EB",
          background: "#020617",
          color: "#F9FAFB",
          marginBottom: 24,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>{location}</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 900 }}>
              {name} {isApproved ? "✅" : ""}
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.9, maxWidth: 700 }}>
              {description}
            </p>
            {contactPerson || email ? (
              <p style={{ margin: "10px 0 0", fontSize: 12, opacity: 0.9 }}>
                {contactPerson ? <span>Contact: {contactPerson}</span> : null}
                {contactPerson && email ? <span> · </span> : null}
                {email ? <span>Email: {email}</span> : null}
              </p>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              {statusLabel} · {tripsCount} trips · {formatStars(avgOverall)}
            </span>

            <Link
              href="/"
              style={{
                fontSize: 12,
                color: "#E5E7EB",
                textDecoration: "underline",
              }}
            >
              Back to main site
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery (basic) */}
      <section style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111827" }}>
          Gallery
        </h2>
        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          {gallerySource.slice(0, 6).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setGallerySelected(p)}
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: 14,
                overflow: "hidden",
                background: "#fff",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ height: 120, background: "#F3F4F6" }}>
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.caption || "Operator photo"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : null}
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 12, color: "#111827", fontWeight: 700 }}>
                  {p.caption || "Photo"}
                </div>
              </div>
            </button>
          ))}
        </div>

        {gallerySelected && (
          <div
            onClick={() => setGallerySelected(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 60,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 960,
                width: "100%",
                borderRadius: 18,
                background: "#fff",
                overflow: "hidden",
                border: "1px solid #E5E7EB",
              }}
            >
              <div style={{ height: 520, background: "#111827" }}>
                {gallerySelected.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={gallerySelected.image_url}
                    alt={gallerySelected.caption || "Selected photo"}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : null}
              </div>
              <div style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 13, color: "#111827", fontWeight: 700 }}>
                  {gallerySelected.caption || "Photo"}
                </div>
                <button
                  type="button"
                  onClick={() => setGallerySelected(null)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid #D1D5DB",
                    background: "#fff",
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Trips (basic list) */}
      <section style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111827" }}>
          Trips
        </h2>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {trips.length === 0 ? (
            <div style={{ fontSize: 13, color: "#6B7280" }}>No trips published yet.</div>
          ) : (
            trips.map((t) => (
              <div
                key={t.id}
                style={{
                  borderRadius: 16,
                  border: "1px solid #E5E7EB",
                  background: "#fff",
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>
                    {t.title || "Untitled trip"}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>
                    {t.duration ? `${t.duration} days` : "Duration N/A"} · {t.style || "Style N/A"}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#111827", fontWeight: 700 }}>
                  {t.price_from != null ? `$${t.price_from}` : ""}
                  {t.price_to != null ? ` – $${t.price_to}` : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Quote request + Review form */}
      {primaryOperatorId ? (
        <>
          <QuoteRequestForm operatorId={primaryOperatorId} operatorName={name} />
          <ReviewForm
            operatorId={primaryOperatorId}
            onCreated={(r) => setReviews((prev) => [r, ...prev])}
          />
        </>
      ) : null}
    </main>
  );
}
