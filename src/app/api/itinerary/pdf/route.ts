// src/app/api/itinerary/pdf/route.ts
import { NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";

export const runtime = "nodejs";

type ItineraryDay = {
  day: number;
  title: string;
  date?: string;
  locations?: string[];
  bullets?: string[];
  lodge?: string;
  meals?: string;
};

type ItineraryPdfPayload = {
  customerName?: string;
  itineraryFor?: string;
  title?: string;
  subtitle?: string;
  operatorName?: string;
  contactPhone?: string;
  contactEmail?: string;
  days: ItineraryDay[];
};

const BRAND = {
  dark: rgb(0.106, 0.302, 0.243), // ~ #1B4D3E
  mid: rgb(0.251, 0.404, 0.271),  // ~ #406745
  light: rgb(0.902, 0.945, 0.925),
  text: rgb(0.12, 0.12, 0.12),
  muted: rgb(0.42, 0.42, 0.42),
  white: rgb(1, 1, 1),
};

function replaceAllCompat(input: string, search: string, replacement: string) {
  return input.split(search).join(replacement);
}

function safeText(s: unknown) {
  let out = String(s ?? "");
  out = replaceAllCompat(out, "→", ">");
  out = replaceAllCompat(out, "➜", ">");
  out = replaceAllCompat(out, "–", "-");
  out = replaceAllCompat(out, "—", "-");
  return out;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Rounded rectangle via SVG path (pdf-lib supports drawSvgPath).
 * This replaces unsupported drawRectangle({ borderRadius }).
 */
function drawRoundedRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  opts?: {
    fill?: ReturnType<typeof rgb>;
    opacity?: number;
    borderColor?: ReturnType<typeof rgb>;
    borderWidth?: number;
    borderOpacity?: number;
  }
) {
  const radius = clamp(r, 0, Math.min(w, h) / 2);

  const x0 = x;
  const y0 = y;
  const x1 = x + w;
  const y1 = y + h;

  const p = [
    `M ${x0 + radius} ${y0}`,
    `L ${x1 - radius} ${y0}`,
    `C ${x1 - radius / 2} ${y0} ${x1} ${y0 + radius / 2} ${x1} ${y0 + radius}`,
    `L ${x1} ${y1 - radius}`,
    `C ${x1} ${y1 - radius / 2} ${x1 - radius / 2} ${y1} ${x1 - radius} ${y1}`,
    `L ${x0 + radius} ${y1}`,
    `C ${x0 + radius / 2} ${y1} ${x0} ${y1 - radius / 2} ${x0} ${y1 - radius}`,
    `L ${x0} ${y0 + radius}`,
    `C ${x0} ${y0 + radius / 2} ${x0 + radius / 2} ${y0} ${x0 + radius} ${y0}`,
    "Z",
  ].join(" ");

  page.drawSvgPath(p, {
    color: opts?.fill ?? BRAND.white,
    opacity: opts?.opacity ?? 1,
    borderColor: opts?.borderColor,
    borderWidth: opts?.borderWidth,
    borderOpacity: opts?.borderOpacity,
  });
}

function drawDivider(page: PDFPage, x: number, y: number, w: number) {
  page.drawLine({
    start: { x, y },
    end: { x: x + w, y },
    thickness: 1,
    color: rgb(0.87, 0.87, 0.87),
  });
}

function measureText(font: PDFFont, size: number, text: string) {
  return font.widthOfTextAtSize(text, size);
}

function wrapText(font: PDFFont, text: string, fontSize: number, maxWidth: number) {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (measureText(font, fontSize, test) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);

      // Hard-break a very long word if needed
      if (measureText(font, fontSize, w) > maxWidth) {
        let chunk = "";
        for (const ch of w) {
          const t = chunk + ch;
          if (measureText(font, fontSize, t) <= maxWidth) chunk = t;
          else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        line = chunk;
      } else {
        line = w;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function newPage(doc: PDFDocument) {
  return doc.addPage([595.28, 841.89]); // A4 portrait
}

function drawHeaderBand(page: PDFPage) {
  const { width, height } = page.getSize();

  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 120,
    color: BRAND.dark,
  });

  page.drawRectangle({
    x: 0,
    y: height - 124,
    width,
    height: 4,
    color: BRAND.mid,
    opacity: 0.9,
  });
}

function drawFooter(page: PDFPage, font: PDFFont, pageIndex: number, total: number) {
  const { width } = page.getSize();
  const y = 28;

  page.drawLine({
    start: { x: 48, y: 44 },
    end: { x: width - 48, y: 44 },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9),
  });

  const left = "Safari Connector";
  const right = `Page ${pageIndex} / ${total}`;

  page.drawText(left, { x: 48, y, size: 9, font, color: BRAND.muted });

  const rw = measureText(font, 9, right);
  page.drawText(right, {
    x: width - 48 - rw,
    y,
    size: 9,
    font,
    color: BRAND.muted,
  });
}

/**
 * CRITICAL FIX:
 * Convert pdf-lib Uint8Array<ArrayBufferLike> -> real ArrayBuffer (not SharedArrayBuffer-like)
 * by copying into a new ArrayBuffer.
 */
function uint8ToRealArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ItineraryPdfPayload;

    if (!body?.days || !Array.isArray(body.days) || body.days.length === 0) {
      return NextResponse.json({ error: "Missing days[] in payload." }, { status: 400 });
    }

    const customer = safeText(body.customerName || body.itineraryFor || "Guest");
    const title = safeText(body.title || "Safari Itinerary");
    const subtitle = safeText(body.subtitle || "Prepared by Safari Connector");
    const operatorName = safeText(body.operatorName || "");
    const contactPhone = safeText(body.contactPhone || "");
    const contactEmail = safeText(body.contactEmail || "");

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`${title} - ${customer}`);
    pdfDoc.setAuthor("Safari Connector");

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Layout constants
    const MARGIN_X = 48;
    const CONTENT_W = 595.28 - MARGIN_X * 2;
    const TOP_START = 841.89 - 140;

    // Page 1
    let page = newPage(pdfDoc);
    drawHeaderBand(page);

    // "SC" badge
    drawRoundedRect(page, MARGIN_X, 841.89 - 98, 46, 38, 10, {
      fill: BRAND.white,
      opacity: 0.14,
    });

    page.drawText("SC", {
      x: MARGIN_X + 12,
      y: 841.89 - 86,
      size: 16,
      font: fontBold,
      color: BRAND.white,
    });

    page.drawText(title, {
      x: MARGIN_X + 60,
      y: 841.89 - 70,
      size: 22,
      font: fontBold,
      color: BRAND.white,
    });

    page.drawText(subtitle, {
      x: MARGIN_X + 60,
      y: 841.89 - 92,
      size: 11,
      font: fontRegular,
      color: rgb(0.93, 0.96, 0.94),
    });

    // Customer chip
    const chipText = `Itinerary for: ${customer}`;
    const chipPadX = 10;
    const chipPadY = 6;
    const chipSize = 10.5;
    const chipW = measureText(fontRegular, chipSize, chipText) + chipPadX * 2;

    drawRoundedRect(page, MARGIN_X, 841.89 - 132, chipW, chipSize + chipPadY * 2, 12, {
      fill: BRAND.white,
      opacity: 0.12,
    });

    page.drawText(chipText, {
      x: MARGIN_X + chipPadX,
      y: 841.89 - 132 + chipPadY + 1,
      size: chipSize,
      font: fontRegular,
      color: BRAND.white,
    });

    // Operator/contact (right)
    const rightX = MARGIN_X + 330;
    const infoYTop = 841.89 - 132 + chipPadY + 1;

    const infoLines: string[] = [];
    if (operatorName) infoLines.push(`Operator: ${operatorName}`);
    if (contactPhone) infoLines.push(`Phone: ${contactPhone}`);
    if (contactEmail) infoLines.push(`Email: ${contactEmail}`);

    let infoY = infoYTop;
    for (const ln of infoLines) {
      page.drawText(ln, {
        x: rightX,
        y: infoY,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.93, 0.96, 0.94),
      });
      infoY -= 12;
    }

    // Intro card
    let cursorY = TOP_START - 10;

    drawRoundedRect(page, MARGIN_X, cursorY - 78, CONTENT_W, 78, 14, {
      fill: BRAND.light,
      opacity: 1,
      borderColor: rgb(0.82, 0.88, 0.85),
      borderWidth: 1,
      borderOpacity: 0.9,
    });

    page.drawText("Trip Summary", {
      x: MARGIN_X + 16,
      y: cursorY - 26,
      size: 12.5,
      font: fontBold,
      color: BRAND.dark,
    });

    const summaryText =
      "This itinerary is a proposed plan. Times and sequencing may adjust based on weather, park regulations, and operational conditions.";
    const summaryLines = wrapText(fontRegular, summaryText, 10.5, CONTENT_W - 32);

    let sy = cursorY - 44;
    for (const ln of summaryLines.slice(0, 3)) {
      page.drawText(ln, {
        x: MARGIN_X + 16,
        y: sy,
        size: 10.5,
        font: fontRegular,
        color: BRAND.text,
      });
      sy -= 14;
    }

    cursorY -= 100;

    // Day cards across pages
    const pages: PDFPage[] = [page];
    const CARD_PAD = 14;
    const CARD_R = 14;

    function ensureSpace(minNeeded: number) {
      if (cursorY - minNeeded < 70) {
        page = newPage(pdfDoc);
        pages.push(page);
        cursorY = 841.89 - 70;
      }
    }

    for (const d of body.days) {
      const dayLabel = `Day ${d.day}`;
      const dayTitle = safeText(d.title || "");
      const date = safeText(d.date || "");
      const locations = (d.locations || []).map(safeText).filter(Boolean);
      const bullets = (d.bullets || []).map(safeText).filter(Boolean);
      const lodge = safeText(d.lodge || "");
      const meals = safeText(d.meals || "");

      const headerH = 36;
      const metaH = date || locations.length || lodge || meals ? 18 : 0;
      const bulletsLines = bullets.length
        ? bullets.reduce(
            (acc, b) =>
              acc + wrapText(fontRegular, b, 10.5, CONTENT_W - 2 * CARD_PAD - 14).length,
            0
          )
        : 0;
      const bulletsH = bulletsLines * 14 + (bullets.length ? 8 : 0);
      const cardH = headerH + metaH + bulletsH + 22;

      ensureSpace(cardH);

      drawRoundedRect(page, MARGIN_X, cursorY - cardH, CONTENT_W, cardH, CARD_R, {
        fill: BRAND.white,
        opacity: 1,
        borderColor: rgb(0.88, 0.88, 0.88),
        borderWidth: 1,
        borderOpacity: 1,
      });

      // Day pill
      const pillText = dayLabel;
      const pillW = measureText(fontBold, 10.5, pillText) + 18;

      drawRoundedRect(page, MARGIN_X + CARD_PAD, cursorY - 30, pillW, 18, 9, {
        fill: BRAND.light,
        opacity: 1,
      });

      page.drawText(pillText, {
        x: MARGIN_X + CARD_PAD + 9,
        y: cursorY - 26,
        size: 10.5,
        font: fontBold,
        color: BRAND.dark,
      });

      // Title
      const titleX = MARGIN_X + CARD_PAD + pillW + 10;
      const titleLines = wrapText(
        fontBold,
        dayTitle,
        13,
        CONTENT_W - (titleX - MARGIN_X) - CARD_PAD
      );

      page.drawText(titleLines[0] || "", {
        x: titleX,
        y: cursorY - 26,
        size: 13,
        font: fontBold,
        color: BRAND.text,
      });

      // Meta
      let metaY = cursorY - 48;
      const metaParts: string[] = [];
      if (date) metaParts.push(date);
      if (locations.length) metaParts.push(locations.join(" - "));
      if (lodge) metaParts.push(`Lodge: ${lodge}`);
      if (meals) metaParts.push(`Meals: ${meals}`);

      if (metaParts.length) {
        const meta = metaParts.join("   |   ");
        const metaLines = wrapText(fontRegular, meta, 9.8, CONTENT_W - 2 * CARD_PAD);

        for (const ln of metaLines.slice(0, 2)) {
          page.drawText(ln, {
            x: MARGIN_X + CARD_PAD,
            y: metaY,
            size: 9.8,
            font: fontRegular,
            color: BRAND.muted,
          });
          metaY -= 12;
        }

        drawDivider(page, MARGIN_X + CARD_PAD, metaY - 6, CONTENT_W - 2 * CARD_PAD);
        metaY -= 18;
      } else {
        metaY = cursorY - 54;
      }

      // Bullets
      let by = metaY;
      if (bullets.length) {
        for (const b of bullets) {
          const wrapped = wrapText(fontRegular, b, 10.5, CONTENT_W - 2 * CARD_PAD - 14);

          // If bullet causes encoding issues, change "•" to "-"
          page.drawText("•", {
            x: MARGIN_X + CARD_PAD,
            y: by,
            size: 12,
            font: fontBold,
            color: BRAND.mid,
          });

          const lx = MARGIN_X + CARD_PAD + 14;
          let ly = by;

          for (const ln of wrapped) {
            page.drawText(ln, {
              x: lx,
              y: ly,
              size: 10.5,
              font: fontRegular,
              color: BRAND.text,
            });
            ly -= 14;
          }
          by = ly - 4;
        }
      } else {
        page.drawText("No details provided for this day.", {
          x: MARGIN_X + CARD_PAD,
          y: by,
          size: 10.5,
          font: fontRegular,
          color: BRAND.muted,
        });
      }

      cursorY = cursorY - cardH - 14;
    }

    // Footer on all pages
    const totalPages = pages.length;
    for (let i = 0; i < pages.length; i++) {
      drawFooter(pages[i], fontRegular, i + 1, totalPages);
    }

    // SAVE + return as REAL ArrayBuffer (kills the SharedArrayBuffer typing noise)
    const bytes = await pdfDoc.save();
    const arrayBuffer = uint8ToRealArrayBuffer(bytes);

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          `${title} - ${customer}`.slice(0, 80)
        )}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
