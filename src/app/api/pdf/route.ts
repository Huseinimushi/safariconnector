export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { parseItineraryToPdfPayload } from "@/lib/pdf/parseItinerary";
import { generateItineraryPdf } from "@/lib/pdf/generateItineraryPdf";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // we accept either raw AI text or already structured payload
    // preferred: body.itineraryText
    const itineraryText: string =
      typeof body?.itineraryText === "string"
        ? body.itineraryText
        : typeof body?.itinerary === "string"
        ? body.itinerary
        : "";

    const clientName = body?.clientName || body?.full_name || body?.name || "";
    const clientEmail = body?.clientEmail || body?.email || "";
    const operatorName = body?.operatorName || body?.operator || "";

    const payload = parseItineraryToPdfPayload({
      itineraryText,
      clientName,
      clientEmail,
      operatorName,
      date: new Date().toISOString().slice(0, 10),
      fallbackTitle: body?.title || "Safari Itinerary",
    });

    const pdfBytes = await generateItineraryPdf(payload);

    const filename = `${payload.title}`.replace(/[^\w\s\-]/g, "").slice(0, 80) || "Safari-Itinerary";

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "PDF generation failed", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
