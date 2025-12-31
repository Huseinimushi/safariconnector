// src/lib/pdf/downloadItineraryPdf.ts

type DownloadArgs = {
  itinerary: any; // object or JSON string
  customerName?: string;
  customerEmail?: string;
  filename?: string; // optional override
};

export async function downloadItineraryPdf(args: DownloadArgs) {
  const res = await fetch("/api/itinerary/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itinerary: args.itinerary,
      customerName: args.customerName || "",
      customerEmail: args.customerEmail || "",
    }),
  });

  if (!res.ok) {
    let msg = `PDF generation failed (${res.status})`;
    try {
      const j = await res.json();
      msg = j?.error ? `${j.error}${j.details ? `: ${j.details}` : ""}` : msg;
    } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;

  const fallbackName = "itinerary.pdf";
  a.download = args.filename?.trim() || fallbackName;

  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}
