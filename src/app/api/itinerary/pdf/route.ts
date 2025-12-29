// src/app/api/itinerary/pdf/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";

type ItineraryResult = {
  title: string;
  summary: string;
  destination: string;
  daysCount: number;
  travelDate: string | null;
  budgetRange: string;
  style: string;
  groupType: string;
  experiences: string[];
  days: string[];
  includes: string[];
  excludes: string[];
};

function sanitizeFileName(name: string) {
  return (name || "Traveller")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

function safeText(v: any) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return await new Promise((resolve, reject) => {
    stream.on("data", (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const itinerary: ItineraryResult | null = body?.itinerary ?? null;
    const travellerName: string = body?.travellerName ?? "Traveller";
    const email: string = body?.email ?? "";

    if (!itinerary || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
      return NextResponse.json({ error: "Invalid itinerary payload" }, { status: 400 });
    }

    const BRAND = {
      green: "#0B6B3A",
      green2: "#064A28",
      gold: "#D4A017",
      ink: "#0B1220",
      muted: "#55677C",
      line: "#E6EDF5",
      soft: "#F6FAF8",
      soft2: "#F3F7FB",
      bg: "#FFFFFF",
    };

    const styles = StyleSheet.create({
      page: { padding: 36, fontSize: 11, color: BRAND.ink, backgroundColor: BRAND.bg },
      header: {
        padding: 16,
        borderRadius: 16,
        backgroundColor: BRAND.soft,
        borderWidth: 1,
        borderColor: BRAND.line,
        marginBottom: 14,
      },
      brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
      brandLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
      mark: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: BRAND.green,
        alignItems: "center",
        justifyContent: "center",
      },
      markText: { color: "#fff", fontSize: 12, fontWeight: 900 },
      brandName: { fontSize: 12, fontWeight: 900 },
      brandSub: { fontSize: 9.5, color: BRAND.muted, marginTop: 1 },
      pill: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: BRAND.line,
        backgroundColor: "#fff",
        fontSize: 9.5,
        color: BRAND.green,
        fontWeight: 900,
      },

      title: { fontSize: 18, fontWeight: 900, marginTop: 10, lineHeight: 1.2 },
      summary: { marginTop: 6, color: BRAND.muted, lineHeight: 1.5 },

      metaGrid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
      metaCard: {
        width: "31%",
        borderWidth: 1,
        borderColor: BRAND.line,
        borderRadius: 12,
        padding: 10,
        backgroundColor: "#fff",
      },
      metaLabel: { fontSize: 8.5, color: BRAND.muted, fontWeight: 900, letterSpacing: 0.7 },
      metaValue: { marginTop: 6, fontSize: 11, fontWeight: 900 },

      sectionTitle: { marginTop: 14, fontSize: 12, fontWeight: 900, color: BRAND.ink },
      dayCard: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: BRAND.line,
        borderRadius: 12,
        padding: 10,
        backgroundColor: "#fff",
      },
      dayHead: { color: BRAND.green, fontWeight: 900, fontSize: 10.5 },
      dayText: { marginTop: 6, color: BRAND.muted, lineHeight: 1.55 },

      twoCol: { marginTop: 12, flexDirection: "row", gap: 10 },
      box: {
        flex: 1,
        borderWidth: 1,
        borderColor: BRAND.line,
        borderRadius: 12,
        padding: 10,
        backgroundColor: BRAND.soft2,
      },
      boxTitle: { fontSize: 11, fontWeight: 900, marginBottom: 8 },
      li: { marginBottom: 5, color: BRAND.muted, lineHeight: 1.4 },

      footer: {
        marginTop: 16,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: BRAND.line,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
      },
      footLeft: { maxWidth: "70%" },
      footTitle: { fontSize: 10.5, fontWeight: 900 },
      footText: { marginTop: 4, fontSize: 9.5, color: BRAND.muted, lineHeight: 1.4 },
      footRight: { fontSize: 9.5, color: BRAND.muted, textAlign: "right" },
      goldDot: { color: BRAND.gold, fontWeight: 900 },
    });

    const destination = safeText(itinerary.destination);
    const title = safeText(itinerary.title);
    const summary = safeText(itinerary.summary);

    const meta = [
      { label: "FOR", value: safeText(travellerName) },
      { label: "DESTINATION", value: destination || "Not specified" },
      { label: "DAYS", value: String(itinerary.daysCount || itinerary.days.length || 1) },
      { label: "WHEN", value: safeText(itinerary.travelDate) || "Any time" },
      { label: "BUDGET", value: safeText(itinerary.budgetRange) || "Not specified" },
      { label: "CONTACT", value: safeText(email) || "Not provided" },
    ];

    // --- IMPORTANT: no JSX here ---
    const pdfElement = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },
        // Header
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(
            View,
            { style: styles.brandRow },
            React.createElement(
              View,
              { style: styles.brandLeft },
              React.createElement(View, { style: styles.mark }, React.createElement(Text, { style: styles.markText }, "SC")),
              React.createElement(
                View,
                null,
                React.createElement(Text, { style: styles.brandName }, "Safari Connector"),
                React.createElement(Text, { style: styles.brandSub }, "AI Studio • Itinerary Draft")
              )
            ),
            React.createElement(Text, { style: styles.pill }, "Operator-ready")
          ),

          React.createElement(Text, { style: styles.title }, title),
          React.createElement(Text, { style: styles.summary }, summary),

          React.createElement(
            View,
            { style: styles.metaGrid },
            ...meta.map((m, idx) =>
              React.createElement(
                View,
                { key: `m-${idx}`, style: styles.metaCard },
                React.createElement(Text, { style: styles.metaLabel }, m.label),
                React.createElement(Text, { style: styles.metaValue }, m.value)
              )
            )
          )
        ),

        // Day by day
        React.createElement(Text, { style: styles.sectionTitle }, "Day-by-day plan"),
        ...itinerary.days.map((d, i) =>
          React.createElement(
            View,
            { key: `d-${i}`, style: styles.dayCard },
            React.createElement(Text, { style: styles.dayHead }, `Day ${i + 1}`),
            React.createElement(Text, { style: styles.dayText }, safeText(d))
          )
        ),

        // Included / Not included
        React.createElement(
          View,
          { style: styles.twoCol },
          React.createElement(
            View,
            { style: styles.box },
            React.createElement(Text, { style: styles.boxTitle }, "Included"),
            ...(itinerary.includes || []).slice(0, 18).map((x, idx) =>
              React.createElement(Text, { key: `in-${idx}`, style: styles.li }, `• ${safeText(x)}`)
            )
          ),
          React.createElement(
            View,
            { style: styles.box },
            React.createElement(Text, { style: styles.boxTitle }, "Not included"),
            ...(itinerary.excludes || []).slice(0, 18).map((x, idx) =>
              React.createElement(Text, { key: `ex-${idx}`, style: styles.li }, `• ${safeText(x)}`)
            )
          )
        ),

        // Footer
        React.createElement(
          View,
          { style: styles.footer },
          React.createElement(
            View,
            { style: styles.footLeft },
            React.createElement(Text, { style: styles.footTitle }, "Next step: send to operators"),
            React.createElement(
              Text,
              { style: styles.footText },
              "Use this draft to request quotes from verified operators. We recommend confirming dates, pickup points, and accommodation preferences."
            )
          ),
          React.createElement(
            Text,
            { style: styles.footRight },
            `Safari Connector ${"\n"}AI Studio ${"\n"}${new Date().toISOString().slice(0, 10)} ${"\n"}`,
            React.createElement(Text, { style: styles.goldDot }, "•"),
            " Draft"
          )
        )
      )
    );

    const stream = await renderToStream(pdfElement as any);
    const buffer = await streamToBuffer(stream);

    const fileName = `SafariConnector-Itinerary-${sanitizeFileName(travellerName)}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    console.error("PDF route error:", err);
    return NextResponse.json(
      { error: err?.message || "PDF generation failed" },
      { status: 500 }
    );
  }
}
