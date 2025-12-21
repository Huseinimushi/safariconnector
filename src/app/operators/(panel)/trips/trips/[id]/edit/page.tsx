"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

type OperatorRow = {
  id: string;
  company_name: string | null;
};

type TripRow = {
  id: string;
  title: string;
  duration: number | null;
  style: "value" | "balanced" | "premium" | null;
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
};

type TripForm = {
  title: string;
  duration: string;
  style: "value" | "balanced" | "premium";
  parksCsv: string;
  priceFrom: string;
  priceTo: string;
  overview: string;
  description: string;
  highlightsText: string;
  includesText: string;
  excludesText: string;
  heroUrl: string;
  extra1: string;
  extra2: string;
  extra3: string;
};

type DayBlock = { id?: string; title: string; desc: string };

const BG = "#F4F3ED";
const GREEN = "#0B6B3A";
const RED = "#B91C1C";

const toLines = (arr: string[] | null | undefined) => (arr ?? []).join("\n");
const fromCsv = (parks: string[] | null) => (parks ?? []).join(", ");

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = supabaseBrowser;
  const tripId = (params?.id as string) || "";

  const [operator, setOperator] = useState<OperatorRow | null>(null);
  const [form, setForm] = useState<TripForm | null>(null);
  const [days, setDays] = useState<DayBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  /* ───────── Load trip + operator + days ───────── */
  useEffect(() => {
    if (!tripId) return;

    let isMounted = true;

    (async () => {
      setLoading(true);
      setMsg(null);

      // current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data: op, error: opError } = await supabase
        .from("operators")
        .select("id, company_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (opError || !op) {
        if (!isMounted) return;
        setMsg("❌ You must have an operator profile to edit trips.");
        setLoading(false);
        return;
      }

      if (!isMounted) return;
      setOperator(op as OperatorRow);

      // Trip must belong to this operator
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select(
          "id,title,duration,style,parks,price_from,price_to,overview,description,highlights,includes,excludes,images,hero_url,operator_id"
        )
        .eq("id", tripId)
        .eq("operator_id", (op as any).id)
        .maybeSingle();

      if (tripError || !trip) {
        if (!isMounted) return;
        setMsg("❌ Trip not found or not owned by your operator.");
        setLoading(false);
        return;
      }

      const t = trip as TripRow;

      const imgs = t.images ?? [];
      const [hero, ex1, ex2, ex3] = [
        t.hero_url || imgs[0] || "",
        imgs[1] || "",
        imgs[2] || "",
        imgs[3] || "",
      ];

      const initialForm: TripForm = {
        title: t.title,
        duration: t.duration ? String(t.duration) : "",
        style: (t.style ?? "balanced") as TripForm["style"],
        parksCsv: fromCsv(t.parks),
        priceFrom: t.price_from != null ? String(t.price_from) : "",
        priceTo: t.price_to != null ? String(t.price_to) : "",
        overview: t.overview ?? "",
        description: t.description ?? "",
        highlightsText: toLines(t.highlights),
        includesText: toLines(t.includes),
        excludesText: toLines(t.excludes),
        heroUrl: hero,
        extra1: ex1,
        extra2: ex2,
        extra3: ex3,
      };

      if (!isMounted) return;
      setForm(initialForm);

      // Load trip_days
      const { data: dayRows, error: dayErr } = await supabase
        .from("trip_days")
        .select("id,day_index,title,desc")
        .eq("trip_id", tripId)
        .order("day_index", { ascending: true });

      if (dayErr) {
        console.error("trip_days load error:", dayErr);
      }

      if (!isMounted) return;
      setDays(
        (dayRows || []).map((d: any) => ({
          id: d.id,
          title: d.title ?? "",
          desc: d.desc ?? "",
        }))
      );

      setLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [router, supabase, tripId]);

  /* ───────── Helpers ───────── */
  const onChange = (field: keyof TripForm, value: string) => {
    setForm((f) => (f ? { ...f, [field]: value } : f));
  };

  const parseList = (text: string) =>
    text
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);

  const addDay = () => {
    setDays((d) => [...d, { title: "", desc: "" }]);
  };

  const updateDay = (index: number, key: keyof DayBlock, value: string) => {
    setDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [key]: value } : d))
    );
  };

  const removeDay = (index: number) => {
    setDays((prev) => prev.filter((_, i) => i !== index));
  };

  /* ───────── Save changes ───────── */
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!form || !operator || !tripId) return;

    setSaving(true);
    setMsg(null);

    const durationNum = form.duration ? Number(form.duration) : null;
    const priceFromNum = form.priceFrom ? Number(form.priceFrom) : null;
    const priceToNum = form.priceTo ? Number(form.priceTo) : null;

    const parksArray = parseList(form.parksCsv.replace(/,/g, "\n"));
    const highlightsArr = parseList(form.highlightsText);
    const includesArr = parseList(form.includesText);
    const excludesArr = parseList(form.excludesText);

    const imagesArray = [
      form.heroUrl.trim(),
      form.extra1.trim(),
      form.extra2.trim(),
      form.extra3.trim(),
    ].filter(Boolean);

    try {
      const { error: updateError } = await supabase
        .from("trips")
        .update({
          title: form.title.trim(),
          duration: durationNum,
          style: form.style,
          parks: parksArray.length ? parksArray : null,
          price_from: priceFromNum,
          price_to: priceToNum,
          overview: form.overview.trim() || null,
          description: form.description.trim() || null,
          highlights: highlightsArr.length ? highlightsArr : null,
          includes: includesArr.length ? includesArr : null,
          excludes: excludesArr.length ? excludesArr : null,
          images: imagesArray.length ? imagesArray : null,
          hero_url: form.heroUrl.trim() || null,
          // do NOT touch `status` here
        })
        .eq("id", tripId)
        .eq("operator_id", operator.id);

      if (updateError) {
        console.error("trip update error:", updateError);
        setMsg(
          "❌ Failed to update trip. Please make sure style/status match DB enums."
        );
        setSaving(false);
        return;
      }

      // Replace trip_days with current list
      const cleanedDays = days
        .map((d) => ({
          title: d.title.trim(),
          desc: d.desc.trim(),
        }))
        .filter((d) => d.title || d.desc);

      const { error: delErr } = await supabase
        .from("trip_days")
        .delete()
        .eq("trip_id", tripId);

      if (delErr) {
        console.error("trip_days delete error:", delErr);
      }

      if (cleanedDays.length) {
        const rows = cleanedDays.map((d, idx) => ({
          trip_id: tripId,
          day_index: idx + 1,
          title: d.title || `Day ${idx + 1}`,
          desc: d.desc || null,
        }));

        const { error: insErr } = await supabase.from("trip_days").insert(rows);

        if (insErr) {
          console.error("trip_days insert error:", insErr);
        }
      }

      setMsg("✅ Trip updated successfully.");
      setSaving(false);
      router.push("/trips");
    } catch (err) {
      console.error(err);
      setMsg("❌ Unexpected error while saving changes.");
      setSaving(false);
    }
  };

  /* ───────── Delete trip ───────── */
  const handleDelete = async () => {
    if (!tripId || !operator) return;
    const ok = window.confirm(
      "Are you sure you want to delete this trip? This cannot be undone."
    );
    if (!ok) return;

    setSaving(true);
    setMsg(null);

    try {
      await supabase.from("trip_days").delete().eq("trip_id", tripId);

      const { error } = await supabase
        .from("trips")
        .delete()
        .eq("id", tripId)
        .eq("operator_id", operator.id);

      if (error) {
        console.error("delete trip error:", error);
        setMsg("❌ Failed to delete trip.");
        setSaving(false);
        return;
      }

      router.push("/trips");
    } finally {
      setSaving(false);
    }
  };

  /* ───────── Render ───────── */
  if (loading || !form) {
    return (
      <main
        style={{
          backgroundColor: BG,
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6B7280",
        }}
      >
        Loading trip…
      </main>
    );
  }

  return (
    <div style={{ backgroundColor: BG, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 1180,
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
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6B7280",
              }}
            >
              Operator / Edit trip
            </p>
            <h1
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 24,
                fontWeight: 800,
                color: GREEN,
              }}
            >
              Edit safari itinerary
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 13,
                color: "#4B5563",
              }}
            >
              Update details, images or day-by-day itinerary. Changes are saved
              immediately for travellers.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              style={{
                alignSelf: "flex-end",
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: saving ? "wait" : "pointer",
                backgroundColor: "#FEE2E2",
                color: RED,
              }}
            >
              Delete trip
            </button>
          </div>
        </section>

        {msg && (
          <div
            style={{
              marginBottom: 16,
              borderRadius: 12,
              padding: "8px 12px",
              fontSize: 13,
              backgroundColor: msg.startsWith("❌") ? "#FEE2E2" : "#ECFDF3",
              color: msg.startsWith("❌") ? RED : "#166534",
              border: `1px solid ${
                msg.startsWith("❌") ? "#FECACA" : "#A7F3D0"
              }`,
            }}
          >
            {msg}
          </div>
        )}

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          style={{
            borderRadius: 24,
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            padding: 20,
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.2fr)",
            gap: 18,
            alignItems: "flex-start",
          }}
        >
          {/* LEFT */}
          <div style={{ display: "grid", gap: 14 }}>
            {/* Basic info */}
            <section>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                Basic trip details
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0,2.5fr) minmax(0,1fr) minmax(0,1.2fr)",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div>
                  <label style={labelStyle}>Trip title*</label>
                  <input
                    value={form.title}
                    onChange={(e) => onChange("title", e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Duration (days)*</label>
                  <input
                    type="number"
                    min={1}
                    value={form.duration}
                    onChange={(e) => onChange("duration", e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Style*</label>
                  <select
                    value={form.style}
                    onChange={(e) =>
                      onChange("style", e.target.value as TripForm["style"])
                    }
                    style={inputStyle}
                  >
                    <option value="value">Value</option>
                    <option value="balanced">Balanced</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>

              <label style={labelStyle}>
                Parks & regions (comma or line separated)
              </label>
              <textarea
                value={form.parksCsv}
                onChange={(e) => onChange("parksCsv", e.target.value)}
                rows={2}
                style={textareaStyle}
              />
            </section>

            {/* Pricing */}
            <section>
              <h2 style={h2Style}>Pricing</h2>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>From (USD)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.priceFrom}
                    onChange={(e) => onChange("priceFrom", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Up to (USD)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.priceTo}
                    onChange={(e) => onChange("priceTo", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </section>

            {/* Overview & description */}
            <section>
              <h2 style={h2Style}>Overview</h2>
              <textarea
                value={form.overview}
                onChange={(e) => onChange("overview", e.target.value)}
                rows={4}
                style={textareaStyle}
              />
              <label style={{ ...labelStyle, marginTop: 6 }}>
                Detailed description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => onChange("description", e.target.value)}
                rows={4}
                style={textareaStyle}
              />
            </section>

            {/* Highlights, includes, excludes */}
            <section>
              <h2 style={h2Style}>Highlights & What&apos;s Included</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr)",
                  gap: 10,
                }}
              >
                <div>
                  <label style={labelStyle}>Trip highlights</label>
                  <textarea
                    value={form.highlightsText}
                    onChange={(e) => onChange("highlightsText", e.target.value)}
                    rows={5}
                    style={textareaStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Included</label>
                  <textarea
                    value={form.includesText}
                    onChange={(e) => onChange("includesText", e.target.value)}
                    rows={5}
                    style={textareaStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Excluded</label>
                  <textarea
                    value={form.excludesText}
                    onChange={(e) => onChange("excludesText", e.target.value)}
                    rows={5}
                    style={textareaStyle}
                  />
                </div>
              </div>
            </section>

            {/* Days */}
            <section>
              <h2 style={h2Style}>Day-by-day itinerary</h2>
              <div style={{ display: "grid", gap: 8 }}>
                {days.map((d, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #E5E7EB",
                      borderRadius: 10,
                      padding: 8,
                      background: "#F9FAFB",
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
                      <strong style={{ fontSize: 13 }}>Day {idx + 1}</strong>
                      <button
                        type="button"
                        onClick={() => removeDay(idx)}
                        style={{
                          border: "none",
                          background: "transparent",
                          fontSize: 11,
                          color: RED,
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      style={{ ...inputStyle, marginBottom: 4 }}
                      value={d.title}
                      onChange={(e) => updateDay(idx, "title", e.target.value)}
                    />
                    <textarea
                      rows={3}
                      style={textareaStyle}
                      value={d.desc}
                      onChange={(e) => updateDay(idx, "desc", e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addDay}
                style={{
                  marginTop: 8,
                  borderRadius: 999,
                  border: "1px dashed #9CA3AF",
                  padding: "6px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  background: "#FFFFFF",
                }}
              >
                + Add day
              </button>
            </section>
          </div>

          {/* RIGHT */}
          <div style={{ display: "grid", gap: 14 }}>
            {/* Images */}
            <section>
              <h2 style={h2Style}>Trip images</h2>
              <label style={labelStyle}>Featured image URL*</label>
              <input
                value={form.heroUrl}
                onChange={(e) => onChange("heroUrl", e.target.value)}
                required
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <label style={labelStyle}>Extra photos</label>
              <input
                value={form.extra1}
                onChange={(e) => onChange("extra1", e.target.value)}
                style={{ ...inputStyle, marginTop: 4 }}
              />
              <input
                value={form.extra2}
                onChange={(e) => onChange("extra2", e.target.value)}
                style={{ ...inputStyle, marginTop: 4 }}
              />
              <input
                value={form.extra3}
                onChange={(e) => onChange("extra3", e.target.value)}
                style={{ ...inputStyle, marginTop: 4 }}
              />
            </section>

            {/* Save */}
            <section>
              <button
                type="submit"
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: "none",
                  backgroundColor: GREEN,
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: saving ? "wait" : "pointer",
                  boxShadow: "0 6px 16px rgba(0,0,0,.25)",
                  marginBottom: 6,
                }}
              >
                {saving ? "Saving changes…" : "Save changes"}
              </button>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: "#6B7280",
                }}
              >
                Changes apply immediately on the public trip page.
              </p>
            </section>
          </div>
        </form>
      </main>
    </div>
  );
}

/* Small shared styles */
const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#4B5563",
  display: "block",
};

const h2Style: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: "#111827",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid #D1D5DB",
  padding: "6px 9px",
  fontSize: 13,
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
};
