// src/app/operator/quotes/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

/** TEMP: your operator ID (replace with real auth later) */
const OPERATOR_ID = "8b15bb68-740f-496c-ac0d-5e4de05d50e8";

type Quote = {
  id: string;
  lead_id: string;
  operator_id: string;
  total_price: number | string;
  currency: string | null;
  status: string | null;
  created_at: string;
  inclusions?: any; // can be array | object | string | null (jsonb)
  exclusions?: any; // same as above
};

function toList(value: any): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/[,;\n]/g).map(s => s.trim()).filter(Boolean);
  if (typeof value === "object") {
    // jsonb sometimes returns as object with numeric keys; flatten values
    try { return Object.values(value).map(v => String(v)); } catch { return []; }
  }
  return [];
}

export default function OperatorQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/by-operator?operator_id=${OPERATOR_ID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load quotes");
      setQuotes(data.quotes || []);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const totalValue = useMemo(
    () => quotes.reduce((sum, q) => sum + (Number(q.total_price) || 0), 0),
    [quotes]
  );

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Operator Quotes</h1>
        <button onClick={reload} className="px-3 py-1 rounded border" disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Viewing quotes for operator <code className="bg-gray-100 px-1 rounded">{OPERATOR_ID}</code>.
      </p>

      {error && <p className="text-red-600">{error}</p>}
      {!loading && quotes.length === 0 && <p>No quotes yet.</p>}

      {quotes.length > 0 && (
        <>
          <div className="text-sm text-gray-700">
            <b>{quotes.length}</b> quotes · Total value{" "}
            <b>
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: quotes[0]?.currency || "USD",
                maximumFractionDigits: 0,
              }).format(totalValue)}
            </b>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border rounded">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm">
                  <th className="p-3 border-b">Created</th>
                  <th className="p-3 border-b">Lead</th>
                  <th className="p-3 border-b">Total</th>
                  <th className="p-3 border-b">Currency</th>
                  <th className="p-3 border-b">Status</th>
                  <th className="p-3 border-b">Inclusions</th>
                  <th className="p-3 border-b">Exclusions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const inc = toList(q.inclusions);
                  const exc = toList(q.exclusions);
                  return (
                    <tr key={q.id} className="text-sm">
                      <td className="p-3 border-b">
                        {new Date(q.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 border-b">
                        <code className="text-xs">{q.lead_id}</code>
                      </td>
                      <td className="p-3 border-b">
                        {new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: q.currency || "USD",
                          maximumFractionDigits: 0,
                        }).format(Number(q.total_price))}
                      </td>
                      <td className="p-3 border-b">{q.currency || "—"}</td>
                      <td className="p-3 border-b">
                        <span className="inline-block rounded px-2 py-0.5 border">
                          {q.status || "sent"}
                        </span>
                      </td>
                      <td
                        className="p-3 border-b max-w-[240px] truncate"
                        title={inc.join(", ")}
                      >
                        {inc.join(", ") || "—"}
                      </td>
                      <td
                        className="p-3 border-b max-w-[240px] truncate"
                        title={exc.join(", ")}
                      >
                        {exc.join(", ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
