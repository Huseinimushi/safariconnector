// src/app/api/itinerary/pdf/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";

/**
 * FIX: Prevent title/heading from being clipped on the right edge by:
 * - Always wrapping title within maxWidth
 * - Auto-reducing font size (min 18) until it fits
 * - Drawing text with safe margins and measured widths
 */

type ItineraryPayload = {
  itinerary: {
    title?: string;
    summary?: string;
    destination?: string;
    daysCount?: number;
    travelDate?: string | null;
    budgetRange?: string;
    style?: string;
    groupType?: string;
    experiences?: string[];
    days?: string[];
    includes?: string[];
    excludes?: string[];
  };
  travellerName?: string;
  email?: string;
  title?: string;
  subtitle?: string;
};

const BRAND = {
  green: rgb(0.043, 0.42, 0.23), // ~ #0B6B3A
  greenDark: rgb(0.024, 0.29, 0.16),
  gold: rgb(0.83, 0.63, 0.09), // ~ #D4A017
  ink: rgb(0.04, 0.07, 0.13),
  muted: rgb(0.33, 0.40, 0.49),
  line: rgb(0.90, 0.93, 0.96),
  soft: rgb(0.96, 0.98, 0.97),
  white: rgb(1, 1, 1),
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeText(v: any, fallback = "") {
  const s = typeof v === "string" ? v : v == null ? "" : String(v);
  return s.trim() || fallback;
}

function measure(font: PDFFont, text: string, size: number) {
  return font.widthOfTextAtSize(text, size);
}

/**
 * Wrap text by words into lines not exceeding maxWidth.
 */
function wrapText(font: PDFFont, text: string, size: number, maxWidth: number) {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let line = words[0];

  for (let i = 1; i < words.length; i++) {
    const next = `${line} ${words[i]}`;
    if (measure(font, next, size) <= maxWidth) {
      line = next;
    } else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

/**
 * Draw wrapped text with optional bold label.
 */
function drawParagraph(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  maxWidth: number,
  lineHeight: number,
  color = BRAND.ink
) {
  const lines = wrapText(font, text, size, maxWidth);
  let cy = y;
  for (const ln of lines) {
    page.drawText(ln, { x, y: cy, size, font, color });
    cy -= lineHeight;
  }
  return cy;
}

/**
 * Draw title: auto-fit and wrap so it NEVER clips.
 */
function drawSafeTitle(
  page: PDFPage,
  fontBold: PDFFont,
  title: string,
  x: number,
  y: number,
  maxWidth: number,
  initialSize: number
) {
  let size = initialSize;
  size = clamp(size, 18, 34);

  // Reduce size until a reasonable wrap occurs (<= 2 lines) OR size hits min.
  while (size > 18) {
    const lines = wrapText(fontBold, title, size, maxWidth);
    // Also ensure each line is within maxWidth
    const ok = lines.every((ln) => measure(fontBold, ln, size) <= maxWidth);
    if (ok && lines.length <= 2) break;
    size -= 1;
  }

  const lines = wrapText(fontBold, title, size, maxWidth);

  // If still too many lines, keep wrapping but with smaller size cap
  let lineHeight = Math.round(size * 1.18);
  let cy = y;

  for (const ln of lines) {
    page.drawText(ln, { x, y: cy, size, font: fontBold, color: BRAND.white });
    cy -= lineHeight;
  }

  return { nextY: cy, usedSize: size, linesCount: lines.length };
}

/**
 * Basic date formatting (keeps ISO, or prints as-is)
 */
function fmtDate(v: string | null | undefined) {
  const s = safeText(v || "");
  if (!s) return "-";
  // If yyyy-mm-dd, show dd/mm/yyyy
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

function okJson(res: any, status = 200) {
  return NextResponse.json(res, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ItineraryPayload;

    const itinerary = body?.itinerary || {};
    const travellerName = safeText(body?.travellerName, "");
    const email = safeText(body?.email, "");
    const title = safeText(body?.title || itinerary?.title, "Safari Connector Itinerary");
    const subtitle = safeText(body?.subtitle, "Prepared by Safari Connector");

    const destination = safeText(itinerary?.destination, "-");
    const daysCount = Number(itinerary?.daysCount || (itinerary?.days?.length ?? 0) || 0) || 0;
    const budgetRange = safeText(itinerary?.budgetRange, "-");
    const style = safeText(itinerary?.style, "-");
    const groupType = safeText(itinerary?.groupType, "-");
    const when = fmtDate(itinerary?.travelDate ?? null);

    const summary = safeText(itinerary?.summary, "");
    const focus = Array.isArray(itinerary?.experiences) ? itinerary!.experiences! : [];
    const days = Array.isArray(itinerary?.days) ? itinerary!.days! : [];
    const includes = Array.isArray(itinerary?.includes) ? itinerary!.includes! : [];
    const excludes = Array.isArray(itinerary?.excludes) ? itinerary!.excludes! : [];

    const pdf = await PDFDocument.create();

    const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // A4 portrait
    const page = pdf.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // Safe margins
    const M = 44;
    const contentW = width - M * 2;

    // Header band (green)
    const headerH = 120;
    page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: BRAND.green });

    // Sub header stripe
    page.drawRectangle({ x: 0, y: height - headerH - 10, width, height: 10, color: BRAND.greenDark });

    // "Prepared by..."
    page.drawText(subtitle, {
      x: M,
      y: height - 42,
      font: fontRegular,
      size: 12,
      color: BRAND.white,
    });

    // Title (FIXED — no clipping)
    const titleMaxW = contentW; // full width within margins
    const titleX = M;
    const titleY = height - 78;

    const titleBlock = drawSafeTitle(page, fontBold, title, titleX, titleY, titleMaxW, 28);

    // If title took more space, keep header clean by ensuring enough headroom
    // (No-op for now; we already draw inside header band with safe y.)

    // Info cards grid
    let y = height - headerH - 30;

    const cardGap = 14;
    const cardH = 68;
    const cardW = (contentW - cardGap) / 2;

    function drawCard(ix: number, iy: number, label: string, value: string) {
      const x = M + ix * (cardW + cardGap);
      const topY = iy;

      page.drawRectangle({
        x,
        y: topY - cardH,
        width: cardW,
        height: cardH,
        color: BRAND.soft,
        borderColor: BRAND.line,
        borderWidth: 1,
      });

      page.drawText(label.toUpperCase(), {
        x: x + 14,
        y: topY - 22,
        size: 10,
        font: fontBold,
        color: BRAND.muted,
      });

      // Value can wrap (so it never clips)
      const maxW = cardW - 28;
      const lines = wrapText(fontBold, safeText(value, "-"), 14, maxW);
      const vYStart = topY - 44;
      let cy = vYStart;

      for (const ln of lines.slice(0, 2)) {
        page.drawText(ln, {
          x: x + 14,
          y: cy,
          size: 14,
          font: fontBold,
          color: BRAND.ink,
        });
        cy -= 16;
      }
    }

    // 3 rows x 2 columns
    drawCard(0, y, "Destination", destination);
    drawCard(1, y, "Budget", budgetRange);

    y -= cardH + cardGap;

    drawCard(0, y, "Days", daysCount ? String(daysCount) : "-");
    drawCard(1, y, "Style", style);

    y -= cardH + cardGap;

    drawCard(0, y, "When", when);
    drawCard(1, y, "Group", groupType || (travellerName ? "Private" : "-"));

    y -= cardH + 22;

    // Divider
    page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: BRAND.line });
    y -= 22;

    // Summary
    page.drawText("Summary", { x: M, y, size: 18, font: fontBold, color: BRAND.ink });
    y -= 18;
    page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: BRAND.line });
    y -= 16;

    y = drawParagraph(page, fontRegular, summary || "-", M, y, 12, contentW, 16, BRAND.ink);
    y -= 8;

    // Focus Areas
    if (focus.length) {
      page.drawText("Focus Areas", { x: M, y, size: 16, font: fontBold, color: BRAND.ink });
      y -= 14;
      page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: BRAND.line });
      y -= 14;

      const pillPadX = 10;
      const pillPadY = 6;
      const pillGap = 10;
      const pillH = 26;

      let px = M;
      let py = y;

      for (const itemRaw of focus.slice(0, 12)) {
        const item = safeText(itemRaw, "");
        if (!item) continue;

        const pillTextSize = 11;
        const pillMaxW = contentW;
        const textW = measure(fontBold, item, pillTextSize);
        const pillW = clamp(textW + pillPadX * 2, 80, pillMaxW);

        if (px + pillW > M + contentW) {
          px = M;
          py -= pillH + 10;
        }

        page.drawRectangle({
          x: px,
          y: py - pillH,
          width: pillW,
          height: pillH,
          color: BRAND.white,
          borderColor: BRAND.line,
          borderWidth: 1,
        });

        // If very long, wrap inside pill with ellipsis-like cut
        let text = item;
        const maxTextW = pillW - pillPadX * 2;
        while (measure(fontBold, text, pillTextSize) > maxTextW && text.length > 10) {
          text = text.slice(0, -2);
        }
        if (text !== item) text = text.trimEnd() + "…";

        page.drawText(text, {
          x: px + pillPadX,
          y: py - 18,
          size: pillTextSize,
          font: fontBold,
          color: BRAND.green,
        });

        px += pillW + pillGap;
      }

      y = py - pillH - 18;
    }

    // Day-by-day (new page if needed)
    function ensureSpace(min: number) {
      if (y < min) {
        const np = pdf.addPage([595.28, 841.89]);
        y = np.getSize().height - M;
        // return new page
        return np;
      }
      return page;
    }

    let currentPage = page;

    if (days.length) {
      currentPage = ensureSpace(200);

      currentPage.drawText("Day-by-day", { x: M, y, size: 16, font: fontBold, color: BRAND.ink });
      y -= 14;
      currentPage.drawLine({
        start: { x: M, y },
        end: { x: currentPage.getSize().width - M, y },
        thickness: 1,
        color: BRAND.line,
      });
      y -= 14;

      for (let i = 0; i < days.length; i++) {
        const dayText = safeText(days[i], "");
        if (!dayText) continue;

        // Estimate height needed (rough wrap count)
        const lines = wrapText(fontRegular, dayText, 12, contentW - 28);
        const blockH = 18 + lines.length * 16 + 20;

        if (y - blockH < 80) {
          currentPage = pdf.addPage([595.28, 841.89]);
          y = currentPage.getSize().height - M;
        }

        // Card
        currentPage.drawRectangle({
          x: M,
          y: y - blockH,
          width: contentW,
          height: blockH,
          color: BRAND.white,
          borderColor: BRAND.line,
          borderWidth: 1,
        });

        currentPage.drawText(`Day ${i + 1}`, {
          x: M + 14,
          y: y - 22,
          size: 12,
          font: fontBold,
          color: BRAND.green,
        });

        let ty = y - 44;
        for (const ln of lines) {
          currentPage.drawText(ln, {
            x: M + 14,
            y: ty,
            size: 12,
            font: fontRegular,
            color: BRAND.muted,
          });
          ty -= 16;
        }

        y = y - blockH - 12;
      }
    }

    // Included / Not included
    if (includes.length || excludes.length) {
      if (y < 220) {
        currentPage = pdf.addPage([595.28, 841.89]);
        y = currentPage.getSize().height - M;
      }

      const colGap = 14;
      const colW = (contentW - colGap) / 2;

      const boxTop = y;
      const boxMinH = 160;

      function drawListBox(x: number, top: number, title: string, items: string[]) {
        const maxItems = 14;
        const trimmed = items.map((x) => safeText(x, "")).filter(Boolean).slice(0, maxItems);

        // compute height based on wraps
        let listLines = 0;
        for (const it of trimmed) {
          listLines += wrapText(fontRegular, it, 11, colW - 34).length;
        }
        const h = Math.max(boxMinH, 44 + listLines * 14 + 14);

        currentPage.drawRectangle({
          x,
          y: top - h,
          width: colW,
          height: h,
          color: BRAND.soft,
          borderColor: BRAND.line,
          borderWidth: 1,
        });

        currentPage.drawText(title, {
          x: x + 14,
          y: top - 22,
          size: 12,
          font: fontBold,
          color: BRAND.ink,
        });

        let cy = top - 44;
        for (const it of trimmed) {
          const lines = wrapText(fontRegular, it, 11, colW - 34);
          for (const ln of lines) {
            currentPage.drawText(`• ${ln}`, {
              x: x + 16,
              y: cy,
              size: 11,
              font: fontRegular,
              color: BRAND.muted,
            });
            cy -= 14;
          }
          cy -= 2;
          if (cy < top - h + 18) break;
        }

        return h;
      }

      const h1 = drawListBox(M, boxTop, "Included", includes);
      const h2 = drawListBox(M + colW + colGap, boxTop, "Not included", excludes);
      y = boxTop - Math.max(h1, h2) - 18;
    }

    // Footer
    const pages = pdf.getPages();
    pages.forEach((p, idx) => {
      const pw = p.getSize().width;
      p.drawLine({ start: { x: M, y: 58 }, end: { x: pw - M, y: 58 }, thickness: 1, color: BRAND.line });

      const left = travellerName ? `Prepared for: ${travellerName}` : "Prepared by Safari Connector";
      const right = email ? email : "safariconnector.com";

      p.drawText(left, { x: M, y: 40, size: 10, font: fontRegular, color: BRAND.muted });
      const rightW = measure(fontRegular, right, 10);
      p.drawText(right, { x: pw - M - rightW, y: 40, size: 10, font: fontRegular, color: BRAND.muted });

      const pageLabel = `Page ${idx + 1} of ${pages.length}`;
      const plW = measure(fontRegular, pageLabel, 10);
      p.drawText(pageLabel, { x: pw / 2 - plW / 2, y: 24, size: 10, font: fontRegular, color: BRAND.muted });
    });

    const bytes = await pdf.save();

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="SafariConnector-Itinerary.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return okJson({ error: e?.message || "PDF generation failed." }, 500);
  }
}
