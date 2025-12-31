// src/lib/pdf/itineraryPdf.ts
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";

export type ItineraryPdfInput = {
  title: string; // e.g. "Chemka Hot Springs Day Trip from Arusha"
  subtitle?: string; // e.g. "AI Trip Builder — Branded Itinerary"
  customerName?: string; // "Mauzo Arts"
  customerEmail?: string; // "mauzoarts@gmail.com"
  operatorName?: string; // "Impala Holidays Limited"
  operatorCountry?: string; // "Tanzania"
  website?: string; // "safariconnector.com"
  generatedAt?: string; // ISO or readable
  sections: Array<{
    heading: string; // e.g. "Overview", "Tour highlights", "Schedule", "Inclusions", "Notes"
    body: string; // plain text
    bullets?: string[]; // optional bullet list
  }>;
};

type Brand = {
  green: ReturnType<typeof rgb>;
  greenDark: ReturnType<typeof rgb>;
  sand: ReturnType<typeof rgb>;
  ink: ReturnType<typeof rgb>;
  muted: ReturnType<typeof rgb>;
  line: ReturnType<typeof rgb>;
};

const BRAND: Brand = {
  green: rgb(0.106, 0.302, 0.243), // ~ #1B4D3E
  greenDark: rgb(0.067, 0.216, 0.176),
  sand: rgb(0.965, 0.957, 0.922),
  ink: rgb(0.08, 0.10, 0.12),
  muted: rgb(0.35, 0.40, 0.45),
  line: rgb(0.86, 0.88, 0.90),
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeText(s?: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function measureTextWidth(font: PDFFont, text: string, size: number) {
  return font.widthOfTextAtSize(text, size);
}

/**
 * Wraps text into lines that fit within maxWidth.
 * Preserves explicit new lines.
 */
function wrapText(
  font: PDFFont,
  text: string,
  fontSize: number,
  maxWidth: number
): string[] {
  const paragraphs = (text || "").split(/\n+/);
  const lines: string[] = [];

  for (const p of paragraphs) {
    const words = p.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = line + " " + words[i];
      if (measureTextWidth(font, test, fontSize) <= maxWidth) {
        line = test;
      } else {
        lines.push(line);
        line = words[i];
      }
    }
    lines.push(line);
    lines.push(""); // paragraph spacing
  }

  // trim trailing empty
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function drawHR(page: PDFPage, x: number, y: number, w: number) {
  page.drawLine({
    start: { x, y },
    end: { x: x + w, y },
    thickness: 1,
    color: BRAND.line,
  });
}

function drawPill(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: ReturnType<typeof rgb>,
  stroke?: ReturnType<typeof rgb>
) {
  // pdf-lib has no rounded rect helper built-in, but it supports "borderRadius" only in some contexts;
  // to avoid runtime issues, keep it as a normal rect (clean, modern).
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: fill,
    borderColor: stroke,
    borderWidth: stroke ? 1 : 0,
  });
}

/**
 * Attempts to embed a custom TTF font; falls back to standard fonts if anything fails.
 */
async function loadFonts(doc: PDFDocument) {
  doc.registerFontkit(fontkit);

  const useStandard = async () => {
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    return { regular, bold, isCustom: false };
  };

  try {
    // If you have NotoSans files from your commits, keep them here.
    // Adjust filenames to match your repo.
    const fontDir = path.join(process.cwd(), "src", "assets", "fonts");
    const regularPath = path.join(fontDir, "NotoSans-Regular.ttf");
    const boldPath = path.join(fontDir, "NotoSans-Bold.ttf");

    const [regBytes, boldBytes] = await Promise.all([
      fs.readFile(regularPath),
      fs.readFile(boldPath),
    ]);

    const regular = await doc.embedFont(new Uint8Array(regBytes), {
      subset: true,
    });
    const bold = await doc.embedFont(new Uint8Array(boldBytes), { subset: true });

    return { regular, bold, isCustom: true };
  } catch {
    return useStandard();
  }
}

async function embedLogoPng(doc: PDFDocument) {
  try {
    const p = path.join(process.cwd(), "public", "logo.png");
    const bytes = await fs.readFile(p);
    return await doc.embedPng(bytes);
  } catch {
    return null;
  }
}

function drawHeader(args: {
  page: PDFPage;
  pageW: number;
  pageH: number;
  margin: number;
  logoImage: any | null;
  fonts: { regular: PDFFont; bold: PDFFont };
  input: ItineraryPdfInput;
}) {
  const { page, pageW, pageH, margin, logoImage, fonts, input } = args;

  const headerH = 92;

  // Header background (brand green)
  page.drawRectangle({
    x: 0,
    y: pageH - headerH,
    width: pageW,
    height: headerH,
    color: BRAND.green,
  });

  // Logo "card" — ensures logo never gets swallowed by header color
  const cardH = 54;
  const cardW = 180;
  const cardX = margin;
  const cardY = pageH - headerH + (headerH - cardH) / 2;

  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    color: rgb(1, 1, 1),
    borderColor: rgb(1, 1, 1),
    borderWidth: 0,
  });

  if (logoImage) {
    const pad = 10;
    const targetH = cardH - pad * 2;
    const scale = targetH / logoImage.height;
    const targetW = logoImage.width * scale;

    page.drawImage(logoImage, {
      x: cardX + pad,
      y: cardY + pad,
      width: clamp(targetW, 0, cardW - pad * 2),
      height: targetH,
    });
  } else {
    // fallback text logo
    page.drawText("SAFARI CONNECTOR", {
      x: cardX + 12,
      y: cardY + 18,
      size: 12,
      font: fonts.bold,
      color: BRAND.green,
    });
  }

  // Title + subtitle (right side)
  const title = safeText(input.title) || "Branded Itinerary";
  const subtitle =
    safeText(input.subtitle) || "AI Trip Builder — Branded Itinerary";

  const titleSize = 18;
  const subtitleSize = 10;

  const textX = cardX + cardW + 16;
  const titleY = pageH - 44;

  page.drawText(title, {
    x: textX,
    y: titleY,
    size: titleSize,
    font: fonts.bold,
    color: rgb(1, 1, 1),
    maxWidth: pageW - textX - margin,
  });

  page.drawText(subtitle, {
    x: textX,
    y: titleY - 18,
    size: subtitleSize,
    font: fonts.regular,
    color: rgb(0.92, 0.95, 0.95),
    maxWidth: pageW - textX - margin,
  });
}

function drawMetaStrip(args: {
  page: PDFPage;
  pageW: number;
  pageH: number;
  margin: number;
  fonts: { regular: PDFFont; bold: PDFFont };
  input: ItineraryPdfInput;
  yTop: number;
}) {
  const { page, pageW, margin, fonts, input, yTop } = args;

  const stripH = 54;
  const y = yTop - stripH;

  // sand strip
  page.drawRectangle({
    x: 0,
    y,
    width: pageW,
    height: stripH,
    color: BRAND.sand,
  });

  const leftX = margin;
  const rightX = pageW / 2 + 8;
  const labelSize = 8.5;
  const valueSize = 10.5;

  const customer = safeText(input.customerName);
  const email = safeText(input.customerEmail);
  const op = safeText(input.operatorName);
  const opC = safeText(input.operatorCountry);
  const website = safeText(input.website) || "safariconnector.com";
  const genAt = safeText(input.generatedAt);

  const row1Y = y + stripH - 18;
  const row2Y = y + 14;

  // Left column
  page.drawText("Prepared for", {
    x: leftX,
    y: row1Y,
    size: labelSize,
    font: fonts.regular,
    color: BRAND.muted,
  });
  page.drawText(customer || "Client", {
    x: leftX,
    y: row1Y - 12,
    size: valueSize,
    font: fonts.bold,
    color: BRAND.ink,
    maxWidth: pageW / 2 - margin - 16,
  });

  page.drawText("Email", {
    x: leftX,
    y: row2Y + 12,
    size: labelSize,
    font: fonts.regular,
    color: BRAND.muted,
  });
  page.drawText(email || "—", {
    x: leftX,
    y: row2Y,
    size: valueSize,
    font: fonts.regular,
    color: BRAND.ink,
    maxWidth: pageW / 2 - margin - 16,
  });

  // Right column
  page.drawText("Selected operator", {
    x: rightX,
    y: row1Y,
    size: labelSize,
    font: fonts.regular,
    color: BRAND.muted,
  });
  page.drawText(op ? `${op}${opC ? ` — ${opC}` : ""}` : "Verified Operator", {
    x: rightX,
    y: row1Y - 12,
    size: valueSize,
    font: fonts.bold,
    color: BRAND.ink,
    maxWidth: pageW / 2 - margin - 16,
  });

  page.drawText("Generated", {
    x: rightX,
    y: row2Y + 12,
    size: labelSize,
    font: fonts.regular,
    color: BRAND.muted,
  });
  page.drawText(genAt || website, {
    x: rightX,
    y: row2Y,
    size: valueSize,
    font: fonts.regular,
    color: BRAND.ink,
    maxWidth: pageW / 2 - margin - 16,
  });

  drawHR(page, margin, y, pageW - margin * 2);

  return y; // new yTop for content
}

function drawSectionBox(args: {
  page: PDFPage;
  x: number;
  yTop: number;
  w: number;
  h: number;
  heading: string;
  fonts: { regular: PDFFont; bold: PDFFont };
}) {
  const { page, x, yTop, w, h, heading, fonts } = args;

  // box
  page.drawRectangle({
    x,
    y: yTop - h,
    width: w,
    height: h,
    color: rgb(1, 1, 1),
    borderColor: BRAND.line,
    borderWidth: 1,
  });

  // heading pill
  const pillH = 18;
  const pillW = Math.min(w, 220);
  drawPill(page, x + 12, yTop - 28, pillW, pillH, BRAND.sand);

  page.drawText(heading.toUpperCase(), {
    x: x + 18,
    y: yTop - 24,
    size: 9,
    font: fonts.bold,
    color: BRAND.greenDark,
  });
}

function drawFooter(args: {
  page: PDFPage;
  pageW: number;
  margin: number;
  fonts: { regular: PDFFont; bold: PDFFont };
  website: string;
  pageNumber: number;
  totalPages: number;
}) {
  const { page, pageW, margin, fonts, website, pageNumber, totalPages } = args;

  const y = 26;

  page.drawLine({
    start: { x: margin, y: 44 },
    end: { x: pageW - margin, y: 44 },
    thickness: 1,
    color: BRAND.line,
  });

  page.drawText(website, {
    x: margin,
    y,
    size: 9,
    font: fonts.regular,
    color: BRAND.muted,
  });

  const rightText = `Page ${pageNumber} / ${totalPages}`;
  const w = measureTextWidth(fonts.regular, rightText, 9);
  page.drawText(rightText, {
    x: pageW - margin - w,
    y,
    size: 9,
    font: fonts.regular,
    color: BRAND.muted,
  });
}

/**
 * Main generator (A4 portrait).
 * Brochure-inspired layout WITHOUT photo:
 * - Brand header with logo card
 * - Meta strip
 * - Two-column content blocks (highlights + schedule, etc)
 */
export async function generateBrandedItineraryPdf(input: ItineraryPdfInput) {
  const doc = await PDFDocument.create();
  const fonts = await loadFonts(doc);
  const logo = await embedLogoPng(doc);

  // A4 size (points)
  const pageW = 595.28;
  const pageH = 841.89;
  const margin = 42;

  const website = safeText(input.website) || "safariconnector.com";

  // Helper to add pages if needed
  const pages: PDFPage[] = [];
  const addPage = () => {
    const p = doc.addPage([pageW, pageH]);
    pages.push(p);
    return p;
  };

  let page = addPage();

  // Header
  drawHeader({
    page,
    pageW,
    pageH,
    margin,
    logoImage: logo,
    fonts,
    input,
  });

  // Meta strip
  let yTop = pageH - 92; // header bottom
  yTop = drawMetaStrip({
    page,
    pageW,
    pageH,
    margin,
    fonts,
    input,
    yTop,
  });

  // Content area
  const contentTop = yTop - 18;
  const contentBottom = 58;
  const contentH = contentTop - contentBottom;

  const colGap = 16;
  const colW = (pageW - margin * 2 - colGap) / 2;
  const leftX = margin;
  const rightX = margin + colW + colGap;

  const bodyFontSize = 10.5;
  const lineH = 14;

  // We’ll place sections in two columns in order:
  // left: section 0,2,4... ; right: section 1,3,5...
  let leftY = contentTop;
  let rightY = contentTop;

  const placeSection = (col: "left" | "right", s: ItineraryPdfInput["sections"][number]) => {
    const x = col === "left" ? leftX : rightX;
    let y = col === "left" ? leftY : rightY;

    // Build content lines
    const heading = safeText(s.heading) || "Section";
    const body = safeText(s.body);
    const bullets = (s.bullets || []).map(safeText).filter(Boolean);

    const maxTextW = colW - 24;
    const lines: string[] = [];

    if (body) {
      lines.push(...wrapText(fonts.regular, body, bodyFontSize, maxTextW));
      lines.push("");
    }

    if (bullets.length) {
      for (const b of bullets) {
        const wrapped = wrapText(fonts.regular, b, bodyFontSize, maxTextW - 14);
        if (wrapped.length) {
          // bullet first line
          lines.push(`• ${wrapped[0]}`);
          // remaining lines indented
          for (let i = 1; i < wrapped.length; i++) {
            lines.push(`  ${wrapped[i]}`);
          }
          lines.push("");
        }
      }
    }

    while (lines.length && lines[lines.length - 1] === "") lines.pop();

    const textH = lines.length * lineH + 8;
    const boxH = Math.max(84, textH + 34); // includes heading area

    // If not enough space, start a new page and reset columns
    const minSpace = 90;
    if (y - boxH < contentBottom + minSpace) {
      // New page
      page = addPage();

      drawHeader({
        page,
        pageW,
        pageH,
        margin,
        logoImage: logo,
        fonts,
        input: { ...input, subtitle: safeText(input.subtitle) || "AI Trip Builder — Branded Itinerary" },
      });

      yTop = pageH - 92;
      yTop = drawMetaStrip({
        page,
        pageW,
        pageH,
        margin,
        fonts,
        input: { ...input, subtitle: safeText(input.subtitle) || "AI Trip Builder — Branded Itinerary" },
        yTop,
      });

      leftY = yTop - 18;
      rightY = yTop - 18;
      y = col === "left" ? leftY : rightY;
    }

    // Draw section box
    drawSectionBox({
      page,
      x,
      yTop: y,
      w: colW,
      h: boxH,
      heading,
      fonts,
    });

    // Draw section content
    let textY = y - 52;
    for (const ln of lines) {
      if (ln === "") {
        textY -= lineH * 0.55;
        continue;
      }
      page.drawText(ln, {
        x: x + 12,
        y: textY,
        size: bodyFontSize,
        font: fonts.regular,
        color: BRAND.ink,
        maxWidth: maxTextW,
      });
      textY -= lineH;
    }

    // Update column cursor
    const newY = y - boxH - 14;
    if (col === "left") leftY = newY;
    else rightY = newY;
  };

  input.sections.forEach((s, idx) => {
    const col = idx % 2 === 0 ? "left" : "right";
    placeSection(col, s);
  });

  // Footer with page numbers
  const totalPages = doc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = doc.getPage(i);
    drawFooter({
      page: p,
      pageW,
      margin,
      fonts,
      website,
      pageNumber: i + 1,
      totalPages,
    });
  }

  const pdfBytes = await doc.save();
  return pdfBytes;
}
