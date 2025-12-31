export async function downloadBrandedPdf(params: {
  itineraryText: string;
  clientName?: string;
  clientEmail?: string;
  operatorName?: string;
}) {
  const res = await fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itineraryText: params.itineraryText,
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      operatorName: params.operatorName,
    }),
  });

  if (!res.ok) {
    let msg = "PDF generation failed";
    try {
      const j = await res.json();
      msg = j?.details || j?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Safari-Connector-Itinerary.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
