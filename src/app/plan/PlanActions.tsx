// src/app/plan/PlanActions.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type VerifiedOperator = {
  id: string;
  company_name: string;
  location?: string | null;
  country?: string | null;
};

type ItineraryModel = {
  title?: string;
  summary?: string;
  destination?: string;
  days?: number;
  when?: string;
  budget?: string;
  travellers?: number;
  trip_type?: string;

  // Sometimes AI returns day-by-day structures; we keep a raw string too
  itinerary_text?: string;
  itinerary?: any;

  included?: string[];
  not_included?: string[];
};

function safeString(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Converts itinerary model into a readable string for PDF section.
 * This prevents [object Object].
 */
function itineraryToText(model: ItineraryModel): string {
  if (model.itinerary_text && model.itinerary_text.trim()) return model.itinerary_text.trim();

  const raw = model.itinerary;
  if (!raw) return "";

  // If it's already a string
  if (typeof raw === "string") return raw.trim();

  // Common shape: { days: [{ day: 1, items: [...] }], ... }
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return String(raw);
  }
}

export default function PlanActions() {
  // --- Operators
  const [operators, setOperators] = useState<VerifiedOperator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [operatorsError, setOperatorsError] = useState<string | null>(null);

  // IMPORTANT: start empty so "Choose operator" is default
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");

  // --- Contact fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // --- Itinerary output (your app already has generation; keep these hooks aligned to your existing state)
  // Replace these with your real state sources if they already exist in your page.
  const [itinerary, setItinerary] = useState<ItineraryModel | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const selectedOperator = useMemo(() => {
    return operators.find((o) => o.id === selectedOperatorId) || null;
  }, [operators, selectedOperatorId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setOperatorsLoading(true);
        setOperatorsError(null);

        const res = await fetch("/api/operators/verified", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || "Failed to load verified operators");

        const list: VerifiedOperator[] = Array.isArray(data?.operators) ? data.operators : [];
        if (!alive) return;

        setOperators(list);

        // DO NOT auto-select first operator
        setSelectedOperatorId("");
      } catch (e: any) {
        if (!alive) return;
        setOperatorsError(e?.message || "Failed to load verified operators");
      } finally {
        if (alive) setOperatorsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Demo: if your app sets itinerary elsewhere, remove this block.
  // This only helps avoid null while you test PDF quickly.
  useEffect(() => {
    if (!itinerary) {
      setItinerary({
        title: "Chemka Hot Springs Day Trip from Arusha",
        summary:
          "A relaxing same-day excursion to Chemka Hot Springs, featuring a scenic drive from Arusha, a refreshing swim in natural hot springs, and a picnic lunch by the water.",
        destination: "Tanzania (Arusha to Chemka Hot Springs)",
        days: 1,
        when: "Any time",
        budget: "$100 - $200 per person",
        travellers: 2,
        trip_type: "Day trip",
        itinerary_text:
          "Day 1\n06:30 AM: Pickup from your Arusha accommodation.\n07:00 AM: Depart for Chemka Hot Springs (approx. 1.5-hour drive).\n08:30 AM: Arrive and enjoy swimming & relaxation.\n12:00 PM: Picnic lunch by the springs.\n03:00 PM: Depart back to Arusha.\n04:30 PM: Drop-off at your accommodation.",
        included: [
          "Private transport (round-trip from Arusha)",
          "English-speaking driver/guide",
          "Picnic lunch and bottled water",
          "Entrance fees",
          "Parking fees",
        ],
        not_included: ["Tips", "Personal expenses", "Travel insurance"],
      });
    }
  }, [itinerary]);

  async function downloadPdf() {
    try {
      if (!itinerary) {
        setToast("Generate itinerary first.");
        return;
      }
      if (!email.trim()) {
        setToast("Email is required for PDF.");
        return;
      }

      setPdfBusy(true);
      setToast(null);

      const payload = {
        title: itinerary.title || "Safari itinerary",
        client_name: fullName || null,
        client_email: email || null,
        operator_name: selectedOperator
          ? `${selectedOperator.company_name}${selectedOperator.country ? ` — ${selectedOperator.country}` : ""}`
          : null,
        generated_at: todayISO(),

        summary: itinerary.summary || null,
        destination: itinerary.destination || null,
        days: itinerary.days ?? null,
        when: itinerary.when || null,
        budget: itinerary.budget || null,
        travellers: itinerary.travellers ?? null,
        trip_type: itinerary.trip_type || null,

        itinerary: itineraryToText(itinerary),
        included: itinerary.included || null,
        not_included: itinerary.not_included || null,
      };

      const res = await fetch("/api/itinerary/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "PDF generation failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${(payload.title || "itinerary").replace(/\s+/g, " ").trim()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setToast("PDF downloaded.");
    } catch (e: any) {
      setToast(e?.message || "PDF generation failed");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Operator select */}
      <div className="space-y-2">
        <div className="text-[12px] font-semibold tracking-[0.12em] text-slate-600">
          SELECT OPERATOR
        </div>

        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-[14px] font-semibold outline-none focus:border-slate-300"
          value={selectedOperatorId}
          onChange={(e) => setSelectedOperatorId(e.target.value)}
          disabled={operatorsLoading}
        >
          <option value="" disabled>
            {operatorsLoading ? "Loading operators…" : "Choose operator"}
          </option>

          {operators.map((op) => {
            const label = `${op.company_name}${op.country ? ` — ${op.country}` : ""}`;
            return (
              <option key={op.id} value={op.id}>
                {label}
              </option>
            );
          })}
        </select>

        {operatorsError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-900">
            {operatorsError}
          </div>
        ) : selectedOperator ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-600">
            Selected operator will receive your request.
          </div>
        ) : null}
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-[14px] outline-none focus:border-slate-300"
          placeholder="Full name (required to send)"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-[14px] outline-none focus:border-slate-300"
          placeholder="Email (required to send + PDF)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          className="w-full rounded-full bg-[#0F6B45] px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
          disabled={!selectedOperatorId || !fullName.trim() || !email.trim()}
          onClick={() => setToast("Send to operator (hook your existing handler here).")}
        >
          Send to operator
        </button>

        <div className="pt-2">
          <div className="text-[18px] font-bold text-slate-900">PDF download</div>
          <div className="text-[13px] text-slate-600">Email is required for PDF.</div>
        </div>

        <button
          className="w-full rounded-full bg-[#0B5A3C] px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
          disabled={pdfBusy || !email.trim() || !itinerary}
          onClick={downloadPdf}
        >
          {pdfBusy ? "Generating PDF…" : "Download branded PDF"}
        </button>
      </div>

      {/* Toast */}
      {toast ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700">
          {toast}
        </div>
      ) : null}

      {/* Debug (optional) */}
      <div className="hidden">
        <pre className="text-xs">{safeString(itinerary)}</pre>
      </div>
    </div>
  );
}
