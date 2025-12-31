/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

type Itinerary = {
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

function toStr(v: any) {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}
function safeArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}
function fmtDate(v: any) {
  if (!v) return "-";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toDateString();
  } catch {
    return "-";
  }
}
function clampInt(v: any, min: number, max: number) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : min;
  return Math.max(min, Math.min(max, n));
}

function splitLines(text: string, font: any, size: number, maxWidth: number) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return ["-"];

  const words = t.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const test = line ? line + " " + w : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ["-"];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const it: Itinerary =
      body?.itinerary ||
      body?.itineraryResult ||
      body?.data ||
      body?.it ||
      body?.payload ||
      {};

    const travellerName = toStr(body?.travellerName || body?.name || "");
    const email = toStr(body?.email || "");
    const subtitle = toStr(body?.subtitle || "AI Generated Itinerary");

    const daysArr = safeArray<string>(it.days)
      .map((x) => toStr(x).trim())
      .filter(Boolean);

    let daysCount = 1;
    if (typeof it.daysCount === "number" && Number.isFinite(it.daysCount) && it.daysCount > 0) {
      daysCount = clampInt(it.daysCount, 1, 21);
    } else if (daysArr.length > 0) {
      daysCount = clampInt(daysArr.length, 1, 21);
    }

    const title = toStr(it.title).trim() || "Safari Itinerary";
    const summary = toStr(it.summary).trim();
    const destination = toStr(it.destination).trim() || "-";

    const includes = safeArray<string>(it.includes).map((x) => toStr(x).trim()).filter(Boolean);
    const excludes = safeArray<string>(it.excludes).map((x) => toStr(x).trim()).filter(Boolean);
    const experiences = safeArray<string>(it.experiences).map((x) => toStr(x).trim()).filter(Boolean);

    // Brand palette (RGB 0..1)
    const BRAND = {
      green: rgb(0.043, 0.42, 0.227), // ~ #0B6B3A
      greenDark: rgb(0.024, 0.29, 0.157), // ~ #064A28
      ink: rgb(0.043, 0.071, 0.125), // #0B1220
      muted: rgb(0.333, 0.404, 0.486), // #55677C
      line: rgb(0.902, 0.929, 0.961), // #E6EDF5
      soft: rgb(0.965, 0.98, 0.973), // #F6FAF8
      card: rgb(0.953, 0.969, 0.984), // #F3F7FB
      white: rgb(1, 1, 1),
      danger: rgb(0.75, 0.15, 0.15),
    };

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // Optional logo (public/logo.png)
    let logoImg: any = null;
    try {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      const logoBytes = await fs.readFile(logoPath);
      logoImg = await pdf.embedPng(logoBytes);
    } catch {
      logoImg = null;
    }

    // Layout constants
    const PAGE_W = 595;
    const PAGE_H = 842;
    const M = 44;
    const CONTENT_W = PAGE_W - M * 2;

    const HEADER_H = 92;
    const FOOTER_SAFE = 58; // keep space for footer
    const SAFE_BOTTOM = M + FOOTER_SAFE;

    let page = pdf.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H;

    const drawHeader = () => {
      // header bar
      page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: BRAND.green });
      // subtle bottom strip
      page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 4, width: PAGE_W, height: 6, color: BRAND.greenDark });

      // logo badge (white) so logo never disappears into green
      const badgeX = M;
      const badgeY = PAGE_H - 76;
      const badgeW = 150;
      const badgeH = 44;

      page.drawRectangle({
        x: badgeX,
        y: badgeY,
        width: badgeW,
        height: badgeH,
        color: BRAND.white,
        borderColor: BRAND.line,
        borderWidth: 1,
      });

      if (logoImg) {
        const scale = Math.min(badgeW / logoImg.width, badgeH / logoImg.height) * 0.86;
        const w = logoImg.width * scale;
        const h = logoImg.height * scale;
        page.drawImage(logoImg, {
          x: badgeX + (badgeW - w) / 2,
          y: badgeY + (badgeH - h) / 2,
          width: w,
          height: h,
        });
      } else {
        page.drawText("Safari Connector", { x: badgeX + 12, y: badgeY + 15, size: 12, font: bold, color: BRAND.ink });
      }

      // right side title
      page.drawText(subtitle, { x: M + 170, y: PAGE_H - 56, size: 11, font, color: BRAND.white });
      page.drawText(title, { x: M + 170, y: PAGE_H - 78, size: 18, font: bold, color: BRAND.white });

      y = PAGE_H - HEADER_H - 24; // start content below header
    };

    const newPage = () => {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H;
      drawHeader();
    };

    // IMPORTANT: ensureSpace must be called BEFORE capturing any "topY/cardTop"
    const ensureSpace = (need: number) => {
      if (y - need >= SAFE_BOTTOM) return;
      newPage();
    };

    const drawFooter = (pageObj: any, pageIndex: number, total: number) => {
      const footerY = 26;
      pageObj.drawLine({
        start: { x: M, y: footerY + 16 },
        end: { x: PAGE_W - M, y: footerY + 16 },
        thickness: 1,
        color: BRAND.line,
      });
      pageObj.drawText("safariconnector.com", { x: M, y: footerY, size: 9, font, color: BRAND.muted });
      pageObj.drawText(`Page ${pageIndex} of ${total}`, { x: PAGE_W - M - 70, y: footerY, size: 9, font, color: BRAND.muted });
    };

    const drawSectionTitle = (t: string) => {
      ensureSpace(46);
      page.drawText(t, { x: M, y, size: 13, font: bold, color: BRAND.ink });
      y -= 10;
      page.drawLine({ start: { x: M, y }, end: { x: M + CONTENT_W, y }, thickness: 1, color: BRAND.line });
      y -= 18;
    };

    const drawCard = (x: number, topY: number, w: number, h: number, color = BRAND.card) => {
      page.drawRectangle({ x, y: topY - h, width: w, height: h, color, borderColor: BRAND.line, borderWidth: 1 });
    };

    const drawKeyValueCard = (x: number, topY: number, w: number, label: string, value: string) => {
      const pad = 12;
      const h = 58;
      drawCard(x, topY, w, h);

      page.drawText(label.toUpperCase(), { x: x + pad, y: topY - 18, size: 8.5, font: bold, color: BRAND.muted });

      const lines = splitLines(value || "-", font, 11.5, w - pad * 2);
      page.drawText(lines[0], { x: x + pad, y: topY - 38, size: 11.5, font: bold, color: BRAND.ink });

      return h;
    };

    const drawBulletListAt = (items: string[], x: number, startY: number, maxW: number, bulletColor = BRAND.green) => {
      const size = 10.5;
      const lineGap = 14;
      const padLeft = 14;

      let yy = startY;

      emphasizeNoItems: if (!items.length) {
        const minNeed = 18;
        if (yy - minNeed < SAFE_BOTTOM) break emphasizeNoItems;
        page.drawText("-", { x, y: yy, size, font, color: BRAND.muted });
        yy -= 18;
        return yy;
      }

      for (const raw of items) {
        const lines = splitLines(raw, font, size, maxW - padLeft);
        const need = 14 + lines.length * lineGap + 10;

        // if list would overflow page, move to new page but keep section continuity
        if (yy - need < SAFE_BOTTOM) {
          newPage();
          yy = y;
        }

        // bullet
        page.drawCircle({ x: x + 4, y: yy + 3, size: 2.2, color: bulletColor });

        // text
        let ty = yy;
        for (const ln of lines) {
          page.drawText(ln, { x: x + padLeft, y: ty, size, font, color: BRAND.ink });
          ty -= lineGap;
        }
        yy = ty - 6;
      }

      return yy;
    };

    // Build PDF
    drawHeader();

    // Top info cards (2 columns)
    const colGap = 12;
    const colW = (CONTENT_W - colGap) / 2;
    const leftX = M;
    const rightX = M + colW + colGap;

    const factsLeft: Array<[string, string]> = [
      ["Destination", destination],
      ["Days", String(daysCount)],
      ["When", fmtDate(it.travelDate || null)],
    ];

    const factsRight: Array<[string, string]> = [
      ["Budget", toStr(it.budgetRange) || "-"],
      ["Style", toStr(it.style) || "-"],
      ["Group", toStr(it.groupType) || "-"],
    ];

    ensureSpace(220);
    const topY = y;

    let usedH = 0;
    for (let i = 0; i < 3; i++) {
      usedH += drawKeyValueCard(leftX, topY - usedH, colW, factsLeft[i][0], factsLeft[i][1]) + 10;
    }

    let usedHR = 0;
    for (let i = 0; i < 3; i++) {
      usedHR += drawKeyValueCard(rightX, topY - usedHR, colW, factsRight[i][0], factsRight[i][1]) + 10;
    }

    y = topY - Math.max(usedH, usedHR) - 6;

    // Summary
    if (summary) {
      drawSectionTitle("Summary");
      const lines = splitLines(summary, font, 11, CONTENT_W);
      ensureSpace(18 + lines.length * 15);
      for (const ln of lines) {
        page.drawText(ln, { x: M, y, size: 11, font, color: BRAND.ink });
        y -= 15;
      }
      y -= 4;
    }

    // Focus areas (pills)
    if (experiences.length) {
      drawSectionTitle("Focus Areas");

      const pillPadX = 10;
      const pillH = 18;
      const rowGap = 8;

      let cx = M;
      let cy = y;

      for (const p of experiences.slice(0, 14)) {
        const txt = p.length > 52 ? p.slice(0, 51) + "…" : p;
        const tw = font.widthOfTextAtSize(txt, 9.5);
        const pw = tw + pillPadX * 2;

        // wrap to new row
        if (cx + pw > M + CONTENT_W) {
          cy -= (pillH + rowGap);
          cx = M;
        }

        // if row doesn't fit, new page and continue
        if (cy - (pillH + 18) < SAFE_BOTTOM) {
          newPage();
          cy = y;
          cx = M;
        }

        page.drawRectangle({
          x: cx,
          y: cy - pillH,
          width: pw,
          height: pillH,
          color: BRAND.soft,
          borderColor: BRAND.line,
          borderWidth: 1,
        });
        page.drawText(txt, { x: cx + pillPadX, y: cy - 12.5, size: 9.5, font: bold, color: BRAND.greenDark });

        cx += pw + 8;
      }

      y = cy - 30;
    }

    // Day-by-day
    drawSectionTitle("Day-by-day Plan");

    if (!daysArr.length) {
      ensureSpace(24);
      page.drawText("No detailed day plan provided by AI.", { x: M, y, size: 11, font, color: BRAND.muted });
      y -= 18;
    } else {
      for (let i = 0; i < daysArr.length; i++) {
        const dayTitle = `Day ${i + 1}`;
        const dayText = daysArr[i];

        const pad = 14;
        const cardW = CONTENT_W;

        const dayLines = splitLines(dayText, font, 10.5, cardW - pad * 2);
        const h = 44 + dayLines.length * 14;

        // ensure space FIRST, then set cardTop from current y (after possible page break)
        ensureSpace(h + 14);
        const cardTop = y;

        page.drawRectangle({
          x: M,
          y: cardTop - h,
          width: cardW,
          height: h,
          color: BRAND.white,
          borderColor: BRAND.line,
          borderWidth: 1,
        });

        page.drawRectangle({
          x: M,
          y: cardTop - h,
          width: 6,
          height: h,
          color: BRAND.green,
        });

        page.drawText(dayTitle, { x: M + pad, y: cardTop - 20, size: 11.5, font: bold, color: BRAND.ink });

        let ty = cardTop - 38;
        for (const ln of dayLines) {
          page.drawText(ln, { x: M + pad, y: ty, size: 10.5, font, color: BRAND.ink });
          ty -= 14;
        }

        y = cardTop - h - 12;
      }
    }

    // Included / Not included (2 columns)
    remindInclusions: {
      drawSectionTitle("Inclusions");

      const boxH = 190;
      const listColW = (CONTENT_W - colGap) / 2;

      // ensure space BEFORE setting colTop
      ensureSpace(boxH + 90);
      const colTop = y;

      // Included box
      drawCard(leftX, colTop, listColW, boxH);
      page.drawText("Included", { x: leftX + 12, y: colTop - 20, size: 11.5, font: bold, color: BRAND.ink });

      // Not Included box
      drawCard(rightX, colTop, listColW, boxH);
      page.drawText("Not included", { x: rightX + 12, y: colTop - 20, size: 11.5, font: bold, color: BRAND.ink });

      // render lists with local cursors (no global y jumping weirdness)
      const listStartY = colTop - 40;
      const leftEnd = drawBulletListAt(includes.slice(0, 18), leftX + 12, listStartY, listColW - 24, BRAND.green);
      const rightEnd = drawBulletListAt(excludes.slice(0, 18), rightX + 12, listStartY, listColW - 24, BRAND.danger);

      // restore y below boxes
      y = Math.min(leftEnd, rightEnd);
      y = Math.min(y, colTop - boxH - 16);
    }

    // Client line
    if (travellerName || email) {
      ensureSpace(70);
      page.drawText("Client", { x: M, y, size: 10, font: bold, color: BRAND.muted });
      y -= 14;
      const line = [travellerName || "-", email ? `(${email})` : ""].filter(Boolean).join(" ");
      page.drawText(line, { x: M, y, size: 11, font, color: BRAND.ink });
      y -= 18;
    }

    // Footer on all pages
    const pages = pdf.getPages();
    const total = pages.length;
    for (let i = 0; i < total; i++) {
      drawFooter(pages[i], i + 1, total);
    }

    const bytes = await pdf.save();

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="Safari-Itinerary.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "PDF generation failed" }, { status: 500 });
  }
}
