"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

/* ───────────────── Types ───────────────── */

type OperatorRow = {
  [key: string]: any; // tunaruhusu fields zote (kutoka operators_view au operators)
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
            backgroundColor: status.startsWith("✅")
              ? "#ECFDF5"
              : "#FEF2F2",
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

/* ───────────────── Review Form (customer writes review) ───────────────── */

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
            backgroundColor: status.startsWith("✅")
              ? "#ECFDF5"
              : "#FEF2F2",
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
  const params = useParams<{ id: string }>();
  const operatorIdFromUrl = params?.id as string | undefined;

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

  useEffect(() => {
    if (!operatorIdFromUrl) return;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1) Pata operator: jaribu operators_view, kisha operators
        let operatorRow: OperatorRow | null = null;

        const { data: opView, error: opViewErr } = await supabase
          .from("operators_view")
          .select("*")
          .eq("id", operatorIdFromUrl)
          .maybeSingle();

        if (opViewErr) {
          console.warn("operators_view load error:", opViewErr);
        }

        if (opView) {
          operatorRow = opView as OperatorRow;
        } else {
          const { data: opTable, error: opTableErr } = await supabase
            .from("operators")
            .select("*")
            .eq("id", operatorIdFromUrl)
            .maybeSingle();

          if (opTableErr) {
            console.error("operators table load error:", opTableErr);
          }
          if (opTable) operatorRow = opTable as OperatorRow;
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

        // 2) Build operator_id candidates
        const idCandidates: string[] = [];
        if (typeof operatorRow.id === "string") idCandidates.push(operatorRow.id);
        if (typeof operatorRow.operator_id === "string")
          idCandidates.push(operatorRow.operator_id);
        if (typeof operatorRow.user_id === "string")
          idCandidates.push(operatorRow.user_id);

        const uniqueIds = Array.from(new Set(idCandidates)).filter(Boolean);
        const operatorIdList =
          uniqueIds.length > 0 ? uniqueIds : [operatorIdFromUrl];

        // Primary operator_id ya kutumia kwenye inserts
        setPrimaryOperatorId(operatorIdList[0]);

        // 3) Load trips, reviews, photos in parallel (faster)
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
  }, [operatorIdFromUrl]);

  /* ───────── Derived values ───────── */

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

  const name =
    (operator.name as string) ||
    (operator.company_name as string) ||
    "Safari operator";

  const country =
    (operator.country as string) ||
    (operator.operator_country as string) ||
    "Africa";

  const city =
    (operator.city as string) ||
    (operator.location as string) ||
    "";

  const location = city ? `${city}, ${country}` : country;

  const contactPerson =
    (operator.contact_person as string) || (operator.contact_name as string);

  const email =
    (operator.email as string) ||
    (operator.contact_email as string) ||
    (operator.operator_email as string);

  // 👉 Override: status iwe Active by default
  const statusLabel = "Active";
  const isApproved = true; // always show verification badge for now

  const description =
    (operator.description as string) ||
    `${name} is a licensed safari company working with Safari Connector to host travellers across Africa. This profile will later include more details about vehicles, guides and preferred routes.`;

  const tripsCount = trips.length;

  // Ratings
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

  // Gallery fallback images (if no operator_photos yet)
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

  /* ───────── Render ───────── */

  return (
    <main
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "24px 16px 64px",
      }}
    >
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

      {/* ───────── HERO / HEADER ───────── */}
      <section
        style={{
          borderRadius: 24,
          overflow: "hidden",
          border: "1px solid #E5E7EB",
          background: "#020617",
          color: "#F9FAFB",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            padding: "22px 22px 18px",
            background:
              "linear-gradient(120deg, #022c22 0%, #0369a1 40%, #0f172a 100%)",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              background:
                "linear-gradient(135deg, #0B6B3A 0%, #D4A017 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
              color: "#FFFFFF",
              border: "2px solid rgba(15,23,42,0.6)",
              flexShrink: 0,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 900,
                  letterSpacing: 0.2,
                }}
              >
                {name}
              </h1>
              {isApproved && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 999,
                    backgroundColor: "#ECFDF5",
                    color: "#065F46",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  ✓ Verified operator
                </span>
              )}
            </div>

            <div
              style={{
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                fontSize: 13,
                color: "#E5E7EB",
              }}
            >
              <span>📍 {location}</span>
              <span>•</span>
              <span>{formatStars(avgOverall)} ({reviews.length} reviews)</span>
              <span>•</span>
              <span>
                {tripsCount} listed trip{tripsCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        {/* About + quick contact */}
        <div
          style={{
            background: "#0b1120",
            padding: "16px 22px 20px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)",
            gap: 18,
          }}
        >
          {/* About */}
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#E5E7EB",
              }}
            >
              About {name}
            </h2>
            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                fontSize: 13,
                color: "#CBD5F5",
                lineHeight: 1.6,
              }}
            >
              {description}
            </p>
          </div>

          {/* Work with this operator */}
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.4)",
              background: "rgba(15,23,42,0.9)",
              padding: 14,
              fontSize: 13,
              color: "#E5E7EB",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#A5B4FC",
                marginBottom: 6,
                fontWeight: 700,
              }}
            >
              Work with this operator
            </div>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              Pick any itinerary below and send a trip request. Your message
              goes directly to <strong>{name}</strong> so you can fine-tune
              details and confirm when you&apos;re ready.
            </p>

            {(contactPerson || email) && (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: "1px dashed rgba(148,163,184,0.4)",
                  fontSize: 12,
                  color: "#CBD5F5",
                }}
              >
                {contactPerson && (
                  <div>
                    <strong>Contact:</strong> {contactPerson}
                  </div>
                )}
                {email && (
                  <div style={{ marginTop: 2 }}>
                    <strong>Email:</strong> {email}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───────── SNAPSHOT + MAP ───────── */}
      <section
        style={{
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        {/* Snapshot cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #E5E7EB",
              background: "#FFFFFF",
              padding: 10,
              fontSize: 12,
            }}
          >
            <div style={{ color: "#6B7280", marginBottom: 4 }}>Based in</div>
            <div style={{ fontWeight: 600, color: "#111827" }}>{location}</div>
          </div>
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #E5E7EB",
              background: "#FFFFFF",
              padding: 10,
              fontSize: 12,
            }}
          >
            <div style={{ color: "#6B7280", marginBottom: 4 }}>
              Account status
            </div>
            <div
              style={{
                fontWeight: 600,
                color: "#166534",
                textTransform: "capitalize",
              }}
            >
              {statusLabel}
            </div>
          </div>
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #E5E7EB",
              background: "#FFFFFF",
              padding: 10,
              fontSize: 12,
            }}
          >
            <div style={{ color: "#6B7280", marginBottom: 4 }}>Total trips</div>
            <div
              style={{ fontWeight: 700, color: "#111827", fontSize: 16 }}
            >
              {tripsCount}
            </div>
          </div>
        </div>

        {/* Map */}
        <div
          style={{
            borderRadius: 16,
            border: "1px solid #E5E7EB",
            overflow: "hidden",
            background: "#FFFFFF",
          }}
        >
          <div
            style={{
              padding: "8px 10px",
              borderBottom: "1px solid #E5E7EB",
              fontSize: 12,
              color: "#374151",
              fontWeight: 600,
            }}
          >
            Service area & office
          </div>
          <div style={{ height: 200 }}>
            <iframe
              title={`${name} location`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                location
              )}&output=embed`}
            />
          </div>
        </div>
      </section>

      {/* ───────── GALLERY ───────── */}
      <section
        style={{
          borderRadius: 20,
          border: "1px solid #E5E7EB",
          background: "#FFFFFF",
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: "#0b2e24",
              }}
            >
              Photo gallery
            </h2>
            <p
              style={{
                margin: 0,
                marginTop: 3,
                fontSize: 13,
                color: "#6B7280",
              }}
            >
              A glimpse into safaris operated by {name}.
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 8,
          }}
        >
          {gallerySource.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setGallerySelected(photo)}
              style={{
                border: "none",
                padding: 0,
                cursor: "pointer",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "relative",
                  paddingBottom: "70%",
                  width: "100%",
                  overflow: "hidden",
                }}
              >
                <img
                  src={photo.image_url!}
                  alt={photo.caption || name}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* Lightbox modal */}
        {gallerySelected && (
          <div
            onClick={() => setGallerySelected(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                borderRadius: 16,
                overflow: "hidden",
                background: "#020617",
                boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              }}
            >
              <img
                src={gallerySelected.image_url!}
                alt={gallerySelected.caption || name}
                style={{
                  display: "block",
                  maxWidth: "90vw",
                  maxHeight: "80vh",
                  objectFit: "contain",
                }}
              />
              {gallerySelected.caption && (
                <div
                  style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    color: "#E5E7EB",
                  }}
                >
                  {gallerySelected.caption}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ───────── TRIPS LIST ───────── */}
      <section
        style={{
          borderRadius: 20,
          backgroundColor: "#FFFFFF",
          border: "1px solid #E5E7EB",
          padding: "16px 16px 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: "#0b2e24",
              }}
            >
              Trips & itineraries by {name}
            </h2>
            <p
              style={{
                margin: 0,
                marginTop: 3,
                fontSize: 13,
                color: "#6B7280",
              }}
            >
              {tripsCount === 0
                ? "This operator hasn’t listed any trips yet."
                : "Pick a safari below to see full details and request a quote."}
            </p>
          </div>
        </div>

        {tripsCount === 0 ? (
          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              border: "1px dashed #E5E7EB",
              padding: 18,
              fontSize: 13,
              color: "#6B7280",
              background: "#F9FAFB",
            }}
          >
            No itineraries are currently listed for this operator.
          </div>
        ) : (
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid #E5E7EB",
                    padding: "10px 11px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 120,
                    backgroundColor: "#FFFFFF",
                    boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: 4,
                      }}
                    >
                      {trip.title || "Untitled trip"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      {trip.duration ? (
                        <span>{trip.duration} days</span>
                      ) : (
                        <span>Duration not set</span>
                      )}
                      {trip.style && (
                        <>
                          <span style={{ fontSize: 10 }}>•</span>
                          <span>{trip.style}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div>
                      {trip.price_from ? (
                        <>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#0B6B3A",
                            }}
                          >
                            From ${trip.price_from.toLocaleString()}
                          </div>
                          {trip.price_to && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "#6B7280",
                              }}
                            >
                              up to ${trip.price_to.toLocaleString()}
                            </div>
                          )}
                        </>
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
                    </div>

                    <div
                      style={{
                        borderRadius: 999,
                        padding: "5px 9px",
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: "#EEF2FF",
                        color: "#3730A3",
                      }}
                    >
                      View details →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ───────── REVIEWS + REVIEW FORM ───────── */}
      <section
        style={{
          marginTop: 20,
          borderRadius: 20,
          border: "1px solid #E5E7EB",
          background: "#FFFFFF",
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: "#0b2e24",
              }}
            >
              Guest reviews
            </h2>
            <p
              style={{
                margin: 0,
                marginTop: 3,
                fontSize: 13,
                color: "#6B7280",
              }}
            >
              What travellers say about their experiences with {name}.
            </p>
          </div>
          {avgOverall && (
            <div
              style={{
                borderRadius: 999,
                padding: "6px 10px",
                backgroundColor: "#ECFDF5",
                border: "1px solid #BBF7D0",
                fontSize: 12,
                color: "#166534",
                fontWeight: 600,
              }}
            >
              {avgOverall.toFixed(1)}★ overall
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <div
            style={{
              marginTop: 10,
              borderRadius: 14,
              padding: "10px 12px",
              backgroundColor: "#F9FAFB",
              border: "1px dashed #D1D5DB",
              fontSize: 12,
              color: "#4B5563",
            }}
          >
            This operator has not received any public reviews yet. Be the first
            to share your feedback.
          </div>
        ) : (
          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 10,
            }}
          >
            {reviews.slice(0, 4).map((review) => (
              <div
                key={review.id}
                style={{
                  borderRadius: 14,
                  border: "1px solid #E5E7EB",
                  padding: "10px 11px",
                  backgroundColor: "#FFFFFF",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {review.title || "Safari review"}
                  </div>
                  {review.rating_overall && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#92400E",
                        fontWeight: 600,
                      }}
                    >
                      {review.rating_overall.toFixed(1)}★
                    </div>
                  )}
                </div>
                {review.comment && (
                  <p
                    style={{
                      margin: 0,
                      marginTop: 4,
                      fontSize: 12,
                      color: "#4B5563",
                    }}
                  >
                    {review.comment}
                  </p>
                )}
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: "#6B7280",
                  }}
                >
                  {review.guest_name && (
                    <span>By {review.guest_name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {primaryOperatorId && (
          <ReviewForm
            operatorId={primaryOperatorId}
            onCreated={(newReview) =>
              setReviews((prev) => [newReview, ...prev])
            }
          />
        )}
      </section>

      {/* ───────── QUOTE REQUEST ───────── */}
      {primaryOperatorId && (
        <QuoteRequestForm operatorId={primaryOperatorId} operatorName={name} />
      )}
    </main>
  );
}
