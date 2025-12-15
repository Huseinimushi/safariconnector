"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Lead = {
  id: string;
  source_type: "ai" | "trip";
  source_id: string;
  user_id: string;
  operator_id: string | null;
  start_date: string | null;
  end_date: string | null;
  pax: number;
  notes: string | null;
  status: string;
  created_at: string;
};

function parseList(input: string): string[] {
  return (input || "")
    .split(/[,;\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function OperatorLeadsPage() {
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [role, setRole] = useState<"client" | "operator" | "admin" | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openFor, setOpenFor] = useState<string | null>(null);
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState("USD");
  const [inclusions, setInclusions] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [validity, setValidity] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState(
    "30% deposit to confirm, balance 30 days before arrival."
  );

  useEffect(() => {
    (async () => {
      const supa = supabaseBrowser;

      const {
        data: { session },
      } = await supa.auth.getSession();

      const uid = session?.user?.id ?? null;
      setOperatorId(uid);

      if (uid) {
        const { data } = await supa.from("profiles").select("role").eq("id", uid).single();
        setRole((data?.role as any) ?? "client");
      }

      setCheckingAuth(false);
    })();
  }, []);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load leads");
      setLeads(data.leads || []);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (operatorId) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorId]);

  const pending = useMemo(
    () => leads.filter((l) => l.status === "open" || l.status === "quoted"),
    [leads]
  );

  const sendQuote = async (leadId: string | null) => {
    try {
      if (!leadId) throw new Error("No lead selected");
      if (!operatorId) throw new Error("Not authenticated");

      const total = Number(price);
      if (!Number.isFinite(total) || total <= 0) {
        throw new Error("Enter a valid total price (number)");
      }

      const payload = {
        lead_id: leadId,
        total_price: total,
        currency,
        inclusions: parseList(inclusions),
        exclusions: parseList(exclusions),
        status: "sent",
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send quote");

      setOpenFor(null);
      setPrice("");
      setInclusions("");
      setExclusions("");
      setValidity("");
      alert("Quote sent ✔");
      reload();
    } catch (e: any) {
      alert(e.message || "Could not send quote");
    }
  };

  if (checkingAuth) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <p>Checking session…</p>
      </main>
    );
  }

  if (!operatorId) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <p>
          Please{" "}
          <a href="/auth/login" className="underline">
            log in
          </a>{" "}
          to access Operator Leads.
        </p>
      </main>
    );
  }

  if (role && role !== "operator" && role !== "admin") {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <p className="text-red-600">
          Your account role is <b>{role}</b>. Only <b>operator</b> or <b>admin</b> can access this
          page.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Operator Leads</h1>
      <p className="text-sm text-gray-600">
        Leads routed to your operator account. Send quotes directly from here.
      </p>

      <div className="flex items-center gap-3">
        <button onClick={reload} className="px-3 py-1 rounded border" disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        <span className="text-xs text-gray-500">
          Operator ID: <code>{operatorId}</code>
        </span>
      </div>

      {loading && <p>Loading leads…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && pending.length === 0 && <p>No active leads yet.</p>}

      {pending.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm">
                <th className="p-3 border-b">Created</th>
                <th className="p-3 border-b">Source</th>
                <th className="p-3 border-b">Dates</th>
                <th className="p-3 border-b">Pax</th>
                <th className="p-3 border-b">Notes</th>
                <th className="p-3 border-b">Action</th>
              </tr>
            </thead>

            <tbody>
              {pending.map((l) => (
                <tr key={l.id} className="text-sm">
                  <td className="p-3 border-b">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3 border-b">{l.source_type.toUpperCase()}</td>
                  <td className="p-3 border-b">
                    {l.start_date || "—"} {l.end_date ? `→ ${l.end_date}` : ""}
                  </td>
                  <td className="p-3 border-b">{l.pax}</td>
                  <td className="p-3 border-b max-w-[240px] truncate" title={l.notes || ""}>
                    {l.notes || "—"}
                  </td>
                  <td className="p-3 border-b">
                    <button onClick={() => setOpenFor(l.id)} className="px-3 py-1 rounded border">
                      Send Quote
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openFor && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center">
          <div className="bg-white rounded-lg p-5 w-full max-w-xl space-y-3">
            <h2 className="text-lg font-semibold">Send Quote</h2>

            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm">
                Total price
                <input
                  className="border rounded p-2 w-full"
                  type="number"
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>

              <label className="text-sm">
                Currency
                <input
                  className="border rounded p-2 w-full"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </label>

              <label className="text-sm md:col-span-2">
                Inclusions (comma / newline)
                <textarea
                  className="border rounded p-2 w-full"
                  rows={2}
                  value={inclusions}
                  onChange={(e) => setInclusions(e.target.value)}
                />
              </label>

              <label className="text-sm md:col-span-2">
                Exclusions (comma / newline)
                <textarea
                  className="border rounded p-2 w-full"
                  rows={2}
                  value={exclusions}
                  onChange={(e) => setExclusions(e.target.value)}
                />
              </label>

              <label className="text-sm">
                Validity date
                <input
                  className="border rounded p-2 w-full"
                  type="date"
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                />
              </label>

              <label className="text-sm md:col-span-2">
                Payment terms
                <input
                  className="border rounded p-2 w-full"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setOpenFor(null)} className="px-3 py-2 border rounded">
                Cancel
              </button>
              <button
                onClick={() => sendQuote(openFor)}
                className="px-3 py-2 rounded bg-black text-white"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
