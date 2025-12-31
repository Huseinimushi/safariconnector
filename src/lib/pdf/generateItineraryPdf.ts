import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import type { PdfPayload } from "./itinerarySchema";

function wrapText(text: string, maxChars: number) {
  const words = (text || "").split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = (line ? line + " " : "") + w;
    if (test.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateItineraryPdf(payload: PdfPayload) {
  if (!payload?.title || !payload?.sections?.length) {
    throw new Error("Missing required fields: title, sections[]");
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Brand colors
  const brand = rgb(0.11, 0.30, 0.23); // deep green
  const muted = rgb(0.35, 0.35, 0.35);
  const lightGray = rgb(0.92, 0.93, 0.94);
  const border = rgb(0.85, 0.86, 0.88);

  // Load logo (optional)
  let logoImage: any = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const bytes = fs.readFileSync(logoPath);
    logoImage = await pdf.embedPng(bytes);
  } catch {
    // kama hakuna logo.png, tunaendelea bila logo
    logoImage = null;
  }

  const pageSize: [number, number] = [595, 842]; // A4
  let page = pdf.addPage(pageSize);
  let { width, height } = page.getSize();

  const marginX = 40;
  const topY = height - 40;
  let cursorY = topY;

  function newPage() {
    page = pdf.addPage(pageSize);
    ({ width, height } = page.getSize());
    cursorY = height - 40;
    drawHeader();
    cursorY -= 20;
  }

  function drawHeader() {
    // Top brand strip (thin)
    page.drawRectangle({
      x: 0,
      y: height - 14,
      width,
      height: 14,
      color: brand,
    });

    // White header box (logo + company)
    page.drawRectangle({
      x: 0,
      y: height - 90,
      width,
      height: 76,
      color: rgb(1, 1, 1),
      borderColor: border,
      borderWidth: 0.5,
    });

    const logoH = 42;
    const logoW = logoImage ? (logoImage.width / logoImage.height) * logoH : 0;

    if (logoImage) {
      page.drawImage(logoImage, {
        x: marginX,
        y: height - 78,
        width: logoW,
        height: logoH,
      });
    }

    const titleX = logoImage ? marginX + logoW + 12 : marginX;

    page.drawText("Safari Connector", {
      x: titleX,
      y: height - 50,
      size: 16,
      font: bold,
      color: brand,
    });

    page.drawText("AI-Powered Safari Itineraries", {
      x: titleX,
      y: height - 68,
      size: 10,
      font,
      color: muted,
    });
  }

  function drawFooter() {
    page.drawLine({
      start: { x: marginX, y: 52 },
      end: { x: width - marginX, y: 52 },
      thickness: 0.6,
      color: border,
    });

    page.drawText("safariconnector.com", {
      x: marginX,
      y: 34,
      size: 9,
      font,
      color: muted,
    });

    page.drawText(`Generated: ${payload.date}`, {
      x: width - marginX - 140,
      y: 34,
      size: 9,
      font,
      color: muted,
    });
  }

  // First page header
  drawHeader();
  cursorY = height - 120;

  // PDF Title block
  page.drawText(payload.title, {
    x: marginX,
    y: cursorY,
    size: 20,
    font: bold,
    color: rgb(0, 0, 0),
  });
  cursorY -= 26;

  if (payload.subtitle) {
    page.drawText(payload.subtitle, {
      x: marginX,
      y: cursorY,
      size: 11,
      font,
      color: muted,
    });
    cursorY -= 20;
  }

  // Meta card
  const metaLines = [
    payload.clientName ? `Client: ${payload.clientName}` : null,
    payload.clientEmail ? `Email: ${payload.clientEmail}` : null,
    payload.operatorName ? `Operator: ${payload.operatorName}` : null,
  ].filter(Boolean) as string[];

  if (metaLines.length) {
    const cardH = 16 + metaLines.length * 14;
    page.drawRectangle({
      x: marginX,
      y: cursorY - cardH + 8,
      width: width - marginX * 2,
      height: cardH,
      color: lightGray,
      borderColor: border,
      borderWidth: 0.5,
    });

    let my = cursorY;
    for (const l of metaLines) {
      page.drawText(l, {
        x: marginX + 12,
        y: my - 14,
        size: 10,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      my -= 14;
    }

    cursorY -= cardH + 14;
  } else {
    cursorY -= 6;
  }

  // Sections
  for (const section of payload.sections) {
    if (cursorY < 120) newPage();

    // Section heading
    page.drawText(section.heading, {
      x: marginX,
      y: cursorY,
      size: 13,
      font: bold,
      color: brand,
    });
    cursorY -= 18;

    // content bullets with wrapping
    for (const item of section.content) {
      const wrapped = wrapText(item, 85);
      for (let i = 0; i < wrapped.length; i++) {
        if (cursorY < 90) newPage();

        const prefix = i === 0 ? "• " : "  ";
        page.drawText(prefix + wrapped[i], {
          x: marginX + 8,
          y: cursorY,
          size: 11,
          font,
          color: rgb(0, 0, 0),
        });
        cursorY -= 14;
      }
    }

    cursorY -= 10;
  }

  // footer for each page (simple: apply to last page; unaweza ku-loop if unataka)
  drawFooter();

  return await pdf.save();
}
