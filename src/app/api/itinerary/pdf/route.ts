// src/app/api/itinerary/pdf/route.ts
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

export const runtime = "nodejs";

type ItineraryResult = {
  title: string;
  summary: string;
  destination: string;
  daysCount: number;
  travelDate: string | null;
  budgetRange: string;
  style?: string;
  groupType?: string;
  experiences?: string[];
  days: string[];
  includes?: string[];
  excludes?: string[];
};

type ItineraryDay = {
  day: number;
  title: string;
  date?: string;
  locations?: string[];
  bullets?: string[];
  lodge?: string;
  meals?: string;
};

type RequestPayload =
  | {
      travellerName?: string;
      email?: string;
      title?: string;
      subtitle?: string;
      operatorName?: string;
      contactPhone?: string;
      contactEmail?: string;
      itinerary?: ItineraryResult;
    }
  | {
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
  dark: rgb(0.106, 0.302, 0.243), // #1B4D3E-ish
  mid: rgb(0.251, 0.404, 0.271), // #406745-ish
  light: rgb(0.92, 0.96, 0.94),
  card: rgb(1, 1, 1),
  ink: rgb(0.10, 0.12, 0.16),
  muted: rgb(0.42, 0.45, 0.50),
  line: rgb(0.88, 0.90, 0.92),
  soft: rgb(0.96, 0.98, 0.97),
};

function replaceAllCompat(input: string, search: string, replacement: string) {
  return input.split(search).join(replacement);
}

function safeText(v: unknown) {
  let s = String(v ?? "");

  // kill typical encoding offenders
  s = replaceAllCompat(s, "→", ">");
  s = replaceAllCompat(s, "➜", ">");
  s = replaceAllCompat(s, "–", "-");
  s = replaceAllCompat(s, "—", "-");
  s = replaceAllCompat(s, "•", "-");
  s = replaceAllCompat(s, "\u00A0", " "); // non-breaking space

  return s.trim();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function measure(font: PDFFont, size: number, text: string) {
  return font.widthOfTextAtSize(text, size);
}

function wrap(font: PDFFont, text: string, size: number, maxW: number) {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";

  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (measure(font, size, t) <= maxW) {
      line = t;
    } else {
      if (line) out.push(line);
      // hard-break very long token
      if (measure(font, size, w) > maxW) {
        let chunk = "";
        for (const ch of w) {
          const tt = chunk + ch;
          if (measure(font, size, tt) <= maxW) chunk = tt;
          else {
            if (chunk) out.push(chunk);
            chunk = ch;
          }
        }
        line = chunk;
      } else {
        line = w;
      }
    }
  }
  if (line) out.push(line);
  return out;
}

function A4(doc: PDFDocument) {
  return doc.addPage([595.28, 841.89]);
}

// Rounded rectangle via SVG path (pdf-lib supports drawSvgPath)
function roundedRect(
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
    color: opts?.fill ?? BRAND.card,
    opacity: opts?.opacity ?? 1,
    borderColor: opts?.borderColor,
    borderWidth: opts?.borderWidth,
    borderOpacity: opts?.borderOpacity,
  });
}

function footer(page: PDFPage, font: PDFFont, idx: number, total: number) {
  const { width } = page.getSize();
  const y = 26;

  page.drawLine({
    start: { x: 48, y: 44 },
    end: { x: width - 48, y: 44 },
    thickness: 1,
    color: BRAND.line,
  });

  page.drawText("Safari Connector", { x: 48, y, size: 9, font, color: BRAND.muted });

  const right = `Page ${idx} / ${total}`;
  const rw = measure(font, 9, right);
  page.drawText(right, { x: width - 48 - rw, y, size: 9, font, color: BRAND.muted });
}

function uint8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

/** Convert ItineraryResult -> printable sections */
function toPrintableFromResult(it: ItineraryResult) {
  const title = safeText(it.title || "Safari Itinerary");
  const destination = safeText(it.destination || "");
  const summary = safeText(it.summary || "");
  const when = safeText(it.travelDate || "Any time");
  const budget = safeText(it.budgetRange || "");
  const daysCount = Number(it.daysCount || (Array.isArray(it.days) ? it.days.length : 0) || 1);

  const days = (it.days || []).map((d, i) => ({
    label: `Day ${i + 1}`,
    text: safeText(d),
  }));

  const includes = (it.includes || []).map(safeText).filter(Boolean);
  const excludes = (it.excludes || []).map(safeText).filter(Boolean);

  return { title, destination, summary, when, budget, daysCount, days, includes, excludes };
}

/** Convert old ItineraryDay[] -> printable days */
function toPrintableFromOld(days: ItineraryDay[]) {
  const out = (days || []).map((d) => {
    const title = safeText(d.title || "");
    const date = safeText(d.date || "");
    const locs = (d.locations || []).map(safeText).filter(Boolean);
    const bullets = (d.bullets || []).map(safeText).filter(Boolean);
    const lodge = safeText(d.lodge || "");
    const meals = safeText(d.meals || "");

    const metaParts: string[] = [];
    if (date) metaParts.push(date);
    if (locs.length) metaParts.push(locs.join(" - "));
    if (lodge) metaParts.push(`Lodge: ${lodge}`);
    if (meals) metaParts.push(`Meals: ${meals}`);

    const meta = metaParts.length ? metaParts.join(" | ") + "\n" : "";
    const bulletText = bullets.length ? bullets.map((b) => `- ${b}`).join("\n") : "";
    const body = safeText(`${meta}${bulletText}`) || "No details provided.";

    return { label: `Day ${Number(d.day || 1)}`, text: title ? `${title}\n${body}` : body };
  });

  return { days: out, daysCount: out.length };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestPayload;

    // Identify payload type
    const maybeItinerary = (body as any)?.itinerary as ItineraryResult | undefined;
    const oldDays = (body as any)?.days as ItineraryDay[] | undefined;

    const travellerName = safeText((body as any)?.travellerName || (body as any)?.customerName || (body as any)?.itineraryFor || "Guest");
    const email = safeText((body as any)?.email || "");
    const operatorName = safeText((body as any)?.operatorName || "");
    const contactPhone = safeText((body as any)?.contactPhone || "");
    const contactEmail = safeText((body as any)?.contactEmail || "");

    let title = safeText((body as any)?.title || "");
    let subtitle = safeText((body as any)?.subtitle || "Prepared by Safari Connector");

    let printable: ReturnType<typeof toPrintableFromResult> & { includes: string[]; excludes: string[]; days: { label: string; text: string }[]; };
    if (maybeItinerary && Array.isArray(maybeItinerary.days) && maybeItinerary.days.length) {
      printable = toPrintableFromResult(maybeItinerary);
      if (!title) title = printable.title;
    } else if (Array.isArray(oldDays) && oldDays.length) {
      // fallback old format
      const old = toPrintableFromOld(oldDays);
      printable = {
        title: title || "Safari Itinerary",
        destination: "",
        summary:
          "This itinerary is a proposed plan. Times and sequencing may adjust based on weather, park regulations, and operational conditions.",
        when: "",
        budget: "",
        daysCount: old.daysCount,
        days: old.days,
        includes: [],
        excludes: [],
      };
      if (!title) title = printable.title;
    } else {
      return NextResponse.json({ error: "Missing itinerary.days[] (or legacy days[])" }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`${title} - ${travellerName}`.slice(0, 120));
    pdfDoc.setAuthor("Safari Connector");

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Layout
    const M = 48;
    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const W = PAGE_W - M * 2;

    let page = A4(pdfDoc);
    const pages: PDFPage[] = [page];

    function newPage() {
      page = A4(pdfDoc);
      pages.push(page);
      return page;
    }

    // Header band
    page.drawRectangle({ x: 0, y: PAGE_H - 132, width: PAGE_W, height: 132, color: BRAND.dark });
    page.drawRectangle({ x: 0, y: PAGE_H - 136, width: PAGE_W, height: 4, color: BRAND.mid, opacity: 0.95 });

    // Logo badge
    roundedRect(page, M, PAGE_H - 96, 56, 44, 12, { fill: rgb(1, 1, 1), opacity: 0.14 });
    page.drawText("SC", { x: M + 16, y: PAGE_H - 83, size: 18, font: bold, color: rgb(1, 1, 1) });

    // Title
    const mainTitle = safeText(title || "Safari Itinerary");
    const tLines = wrap(bold, mainTitle, 22, W - 70);
    page.drawText(tLines[0] || mainTitle, { x: M + 70, y: PAGE_H - 68, size: 22, font: bold, color: rgb(1, 1, 1) });

    // Subtitle
    page.drawText(subtitle || "Prepared by Safari Connector", {
      x: M + 70,
      y: PAGE_H - 92,
      size: 11,
      font,
      color: rgb(0.92, 0.96, 0.94),
    });

    // Info chips row
    const chipY = PAGE_H - 124;
    const chipH = 22;

    function chip(x: number, text: string) {
      const s = safeText(text);
      const pad = 10;
      const cw = measure(font, 10.2, s) + pad * 2;
      roundedRect(page, x, chipY, cw, chipH, 11, { fill: rgb(1, 1, 1), opacity: 0.12 });
      page.drawText(s, { x: x + pad, y: chipY + 6, size: 10.2, font, color: rgb(1, 1, 1) });
      return x + cw + 10;
    }

    let cx = M;
    cx = chip(cx, `Itinerary for: ${travellerName}`);
    if (email) cx = chip(cx, `Email: ${email}`);

    // Right side contact block (optional)
    const infoLines: string[] = [];
    if (operatorName) infoLines.push(`Operator: ${operatorName}`);
    if (contactPhone) infoLines.push(`Phone: ${contactPhone}`);
    if (contactEmail) infoLines.push(`Email: ${contactEmail}`);

    let iy = PAGE_H - 124 + 6;
    for (const ln of infoLines.slice(0, 3)) {
      const wln = measure(font, 9.3, ln);
      page.drawText(ln, {
        x: PAGE_W - M - wln,
        y: iy,
        size: 9.3,
        font,
        color: rgb(0.92, 0.96, 0.94),
      });
      iy -= 12;
    }

    // Cursor start
    let y = PAGE_H - 160;

    function ensure(h: number) {
      if (y - h < 70) {
        newPage();
        y = PAGE_H - 64;
      }
    }

    // Summary card
    ensure(110);
    roundedRect(page, M, y - 98, W, 98, 16, { fill: BRAND.soft, borderColor: BRAND.line, borderWidth: 1, borderOpacity: 1 });
    page.drawText("Trip Summary", { x: M + 16, y: y - 28, size: 12.5, font: bold, color: BRAND.dark });

    const summaryText = printable.summary || "Proposed itinerary. Times may adjust based on weather and operations.";
    const sLines = wrap(font, summaryText, 10.8, W - 32);
    let sy = y - 46;
    for (const ln of sLines.slice(0, 4)) {
      page.drawText(ln, { x: M + 16, y: sy, size: 10.8, font, color: BRAND.ink });
      sy -= 14;
    }

    // Meta row (destination/when/budget/days)
    const meta = [
      printable.destination ? `Destination: ${printable.destination}` : "",
      printable.when ? `When: ${printable.when}` : "",
      printable.budget ? `Budget: ${printable.budget}` : "",
      printable.daysCount ? `Days: ${printable.daysCount}` : "",
    ].filter(Boolean);

    if (meta.length) {
      const metaText = meta.join("   •   ");
      const mLines = wrap(font, metaText, 9.8, W - 32);
      let my = y - 88;
      for (const ln of mLines.slice(0, 2)) {
        page.drawText(ln, { x: M + 16, y: my, size: 9.8, font, color: BRAND.muted });
        my -= 12;
      }
    }

    y -= 118;

    // Day cards
    for (const d of printable.days) {
      const label = safeText(d.label);
      const text = safeText(d.text);

      const headerH = 28;
      const lines = wrap(font, text, 10.7, W - 32);
      const bodyH = Math.max(18, lines.length * 14);
      const cardH = headerH + bodyH + 22;

      ensure(cardH);

      roundedRect(page, M, y - cardH, W, cardH, 16, {
        fill: BRAND.card,
        borderColor: BRAND.line,
        borderWidth: 1,
        borderOpacity: 1,
      });

      // label pill
      const pill = label;
      const pillW = measure(bold, 10.2, pill) + 22;
      roundedRect(page, M + 16, y - 28, pillW, 18, 9, { fill: BRAND.light });
      page.drawText(pill, { x: M + 16 + 11, y: y - 24, size: 10.2, font: bold, color: BRAND.dark });

      // day text
      let ty = y - 52;
      for (const ln of lines) {
        page.drawText(ln, { x: M + 16, y: ty, size: 10.7, font, color: BRAND.ink });
        ty -= 14;
      }

      y -= cardH + 14;
    }

    // Included / Not included sections (if present)
    function listSection(title: string, items: string[]) {
      if (!items || !items.length) return;

      const headH = 22;
      const lines = items.slice(0, 28).map((x) => `- ${safeText(x)}`);
      const wrapped: string[] = [];
      for (const ln of lines) wrapped.push(...wrap(font, ln, 10.2, (W - 32) / 2));

      const h = headH + wrapped.length * 14 + 18;
      ensure(h);

      roundedRect(page, M, y - h, W, h, 16, {
        fill: BRAND.soft,
        borderColor: BRAND.line,
        borderWidth: 1,
        borderOpacity: 1,
      });

      page.drawText(title, { x: M + 16, y: y - 22, size: 12, font: bold, color: BRAND.dark });

      let ly = y - 44;
      for (const ln of wrapped) {
        page.drawText(ln, { x: M + 16, y: ly, size: 10.2, font, color: BRAND.ink });
        ly -= 14;
      }

      y -= h + 14;
    }

    listSection("Included", printable.includes || []);
    listSection("Not Included", printable.excludes || []);

    // Footer on all pages
    const total = pages.length;
    for (let i = 0; i < total; i++) footer(pages[i], font, i + 1, total);

    const bytes = await pdfDoc.save();
    const ab = uint8ToArrayBuffer(bytes);

    const filename = `${safeText(title)} - ${safeText(travellerName)}`.slice(0, 80);

    return new NextResponse(ab, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate PDF" }, { status: 500 });
  }
}
