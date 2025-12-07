"use client";

import React, { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/AuthProvider";

type MiniOperator = {
  id: string;
  name: string;
  country?: string | null;
  city?: string | null;
  logo_url?: string | null;
};

type QuoteModalProps = {
  open: boolean;
  onClose: () => void;
  /** When opened from a profile page we pass the operator to preselect */
  operator?: { id: string; name: string } | null;
  /** AI Trip Builder prefill */
  prefillPlan?: any | null;
  prefillForm?: any | null;
  sourcePage?: string;
};

export default function QuoteModal({
  open,
  onClose,
  operator,
  prefillPlan,
  prefillForm,
  sourcePage = "operators-list",
}: QuoteModalProps) {
  // supabaseBrowser is already a configured client
  const supabase = supabaseBrowser;
  const { user } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // traveler fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const defaultMessage = buildDefaultMessage(prefillPlan, prefillForm);
  const [message, setMessage] = useState(defaultMessage);

  // operator search + multi select
  const [q, setQ] = useState("");
  const [loadingOps, setLoadingOps] = useState(false);
  const [ops, setOps] = useState<MiniOperator[]>([]);
  const [selected, setSelected] = useState<Record<string, MiniOperator>>({});

  const selectedList = Object.values(selected);
  const selectedNames = selectedList.map((o) => o.name);

  // Auto-fill traveller info when modal opens & user is logged in
  useEffect(() => {
    if (!open || !user) return;

    const meta: any = user.user_metadata || {};

    setFullName((prev) => {
      if (prev) return prev;
      const composed =
        meta.full_name ||
        meta.name ||
        `${meta.first_name ?? ""} ${meta.last_name ?? ""}`.trim();
      return composed || "";
    });

    setEmail((prev) => {
      if (prev) return prev;
      return user.email || meta.email || "";
    });

    setPhone((prev) => {
      if (prev) return prev;
      return meta.phone || meta.phone_number || "";
    });
  }, [user, open]);

  // preselect when coming from profile page
  useEffect(() => {
    if (operator) {
      setSelected({ [operator.id]: { id: operator.id, name: operator.name } });
    }
  }, [operator]);

  // load operators list
  useEffect(() => {
    if (!open) return;

    let active = true;

    (async () => {
      setLoadingOps(true);
      try {
        let query = supabase
          .from("operators_view")
          .select("id, name, country, city, logo_url")
          .limit(40);

        if (q.trim()) {
          query = query.ilike("name", `%${q.trim()}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error("load operators list error:", error);
          if (active) setOps([]);
          return;
        }

        if (active) setOps(data ?? []);
      } catch (e) {
        console.error("load operators list exception:", e);
        if (active) setOps([]);
      } finally {
        active && setLoadingOps(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, q, supabase]);

  if (!open) return null;

  const toggle = (op: MiniOperator) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[op.id]) delete next[op.id];
      else next[op.id] = op;
      return next;
    });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!fullName.trim() || !email.trim()) {
      setSubmitError("Please provide your name and email.");
      return;
    }

    if (selectedList.length === 0) {
      setSubmitError("Please choose at least one operator.");
      return;
    }

    setSubmitting(true);

    const operatorHeader = `\n\nOperators selected: ${selectedNames.join(
      ", "
    )}`;
    const finalMessage = message.includes("Operators selected:")
      ? message
      : message + operatorHeader;

    const payload = {
      operator_id: selectedList.length === 1 ? selectedList[0].id : null,
      operator_name: selectedList.length === 1 ? selectedList[0].name : null,
      traveler_name: fullName || null,
      traveler_email: email || null,
      traveler_phone: phone || null,
      message: finalMessage || null,
      source_page: sourcePage,
      plan: prefillPlan ?? null,
      form: prefillForm ?? null,
      created_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from("quote_requests").insert([payload]);

      if (error) {
        console.warn("quote_requests insert failed:", error);
        setSubmitError("We couldn't submit your request. Please try again.");
      } else {
        alert(
          "Request sent. Our operators will get back to you shortly."
        );
        onClose();
      }
    } catch (err) {
      console.error("quote submit exception:", err);
      setSubmitError("Unexpected error. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,24,39,0.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 920,
          background: "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #E5E7EB",
            background: "#F9FAFB",
          }}
        >
          <div style={{ fontWeight: 900, color: "#0B7A53" }}>
            Request a Quote
          </div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #E5E7EB",
              background: "#fff",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 0,
          }}
        >
          {/* LEFT: form + operator picker */}
          <div style={{ padding: 20, borderRight: "1px solid #E5E7EB" }}>
            {/* Multi-operator picker */}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#374151",
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Choose Operators (one or many)
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Input
                  placeholder="Search operators by name…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div
                style={{
                  marginTop: 8,
                  maxHeight: 180,
                  overflow: "auto",
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                }}
              >
                {loadingOps ? (
                  <div style={{ padding: 12, fontSize: 13, color: "#6B7280" }}>
                    Loading…
                  </div>
                ) : ops.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 13, color: "#6B7280" }}>
                    No operators found.
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {ops.map((o) => {
                      const checked = !!selected[o.id];
                      return (
                        <li
                          key={o.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 12px",
                            borderBottom: "1px solid #F3F4F6",
                            cursor: "pointer",
                          }}
                          onClick={() => toggle(o)}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(o)}
                            style={{ cursor: "pointer" }}
                          />
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#111827",
                            }}
                          >
                            {o.name}
                          </div>
                          <div
                            style={{
                              marginLeft: "auto",
                              fontSize: 12,
                              color: "#6B7280",
                            }}
                          >
                            {(o.city ? `${o.city}, ` : "") + (o.country ?? "")}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {selectedList.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {selectedList.map((o) => (
                    <span
                      key={o.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "#D6EFE5",
                        color: "#0B7A53",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {o.name}
                      <button
                        onClick={() => toggle(o)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#0B7A53",
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                        aria-label={`Remove ${o.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Traveler info + message */}
            <form onSubmit={submit} style={{ display: "grid", rowGap: 12 }}>
              <Input
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                placeholder="Phone (incl. country code)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <textarea
                placeholder="Tell us more (dates, group size, preferred parks, budget)…"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  outline: "none",
                  fontSize: 14,
                  color: "#111827",
                }}
              />

              {submitError && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#b91c1c",
                    marginTop: 2,
                  }}
                >
                  {submitError}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Button
                  type="submit"
                  disabled={submitting || selectedList.length === 0}
                  style={{ borderRadius: 12 }}
                >
                  {submitting ? "Sending…" : "Send Request"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  style={{ borderRadius: 12 }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>

          {/* RIGHT: AI plan summary */}
          <aside style={{ padding: 20, background: "#FAFAFA" }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 14,
                color: "#111827",
              }}
            >
              Trip Request Summary
            </div>

            {prefillForm && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#374151",
                }}
              >
                <div>
                  <strong>Dates:</strong> {prefillForm.start_date || "Flexible"} ·{" "}
                  {prefillForm.duration || "?"} day(s)
                </div>
                <div>
                  <strong>Group:</strong> {prefillForm.adults ?? 0} adult(s),{" "}
                  {prefillForm.children ?? 0} child(ren)
                </div>
                <div>
                  <strong>Style:</strong> {prefillForm.style || "Standard"}
                </div>
                {Array.isArray(prefillForm.interests) &&
                  prefillForm.interests.length > 0 && (
                    <div>
                      <strong>Interests:</strong>{" "}
                      {prefillForm.interests.join(", ")}
                    </div>
                  )}
              </div>
            )}

            {prefillPlan?.estimated_rate && (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  padding: "10px 12px",
                  marginTop: 12,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  💰 Estimated Total:&nbsp;
                  <span style={{ color: "#0B7A53" }}>
                    $
                    {Number(
                      prefillPlan.estimated_rate.min
                    ).toLocaleString()}{" "}
                    – $
                    {Number(
                      prefillPlan.estimated_rate.max
                    ).toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6B7280",
                    marginTop: 4,
                  }}
                >
                  Estimate based on your selections; final quote may vary by
                  season & availability.
                </div>
              </div>
            )}

            {Array.isArray(prefillPlan?.highlights) &&
              prefillPlan.highlights.length > 0 && (
                <>
                  <div
                    style={{
                      marginTop: 12,
                      fontWeight: 700,
                    }}
                  >
                    Highlights
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      marginTop: 6,
                      paddingLeft: 16,
                      color: "#374151",
                      fontSize: 13,
                    }}
                  >
                    {prefillPlan.highlights.slice(0, 6).map((h: string) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </>
              )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/* Helper to build a nice default message */
function buildDefaultMessage(plan: any, form: any) {
  const parts: string[] = [];
  if (form?.duration) parts.push(`Duration: ${form.duration} day(s)`);
  const group =
    typeof form?.adults === "number" || typeof form?.children === "number"
      ? `Group: ${form?.adults ?? 0} adult(s), ${form?.children ?? 0} child(ren)`
      : "";
  if (group) parts.push(group);
  if (form?.style) parts.push(`Style: ${form.style}`);
  if (Array.isArray(form?.interests) && form.interests.length > 0) {
    parts.push(`Interests: ${form.interests.join(", ")}`);
  }
  if (plan?.estimated_rate) {
    parts.push(
      `Estimated total: $${Number(plan.estimated_rate.min).toLocaleString()} – $${Number(
        plan.estimated_rate.max
      ).toLocaleString()}`
    );
  }

  const header = "Hello Safari Connector,\n\nI'd like a quote for this trip:\n";
  const body = parts.length
    ? `• ${parts.join("\n• ")}`
    : "• (Trip details attached)";
  const footer =
    "\n\nPlease advise availability and an itemized quote.\nThanks!";
  return `${header}${body}${footer}`;
}
