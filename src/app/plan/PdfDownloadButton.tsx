// src/app/plan/PdfDownloadButton.tsx
"use client";

import React, { useState } from "react";

type Props = {
  disabled?: boolean;
  title?: string; // optional now
  itineraryText?: string; // IMPORTANT: raw full text shown on right panel
  customerName?: string;
  customerEmail?: string;
  operatorName?: string;
  operatorCountry?: string;
  sections?: Array<{ heading: string; body: string; bullets?: string[] }>; // optional
};

export default function PdfDownloadButton({
  disabled,
  title,
  itineraryText,
  customerName,
  customerEmail,
  operatorName,
  operatorCountry,
  sections,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function onDownload() {
    setLoading(true);
    try {
      const payload = {
        title: title || "Safari itinerary",
        subtitle: "AI Trip Builder — Branded Itinerary",
        customerName,
        customerEmail,
        operatorName,
        operatorCountry,
        website: "safariconnector.com",
        generatedAt: new Date().toISOString().slice(0, 10),
        sections, // if present, route uses it
        itineraryText, // fallback if sections missing
      };

      const res = await fetch("/api/itinerary/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "PDF generation failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${payload.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || "PDF generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={disabled || loading}
      className="w-full rounded-full bg-[#1B4D3E] text-white font-semibold py-3 hover:opacity-95 disabled:opacity-50"
    >
      {loading ? "Generating PDF..." : "Download branded PDF"}
    </button>
  );
}
