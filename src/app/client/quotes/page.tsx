// src/app/client/quotes/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Role = "client" | "operator" | "admin" | null;

type Quote = {
  id: string;
  lead_id: string;
  operator_id: string;
  total_price: number | string;
  currency: string | null;
  status: string | null; // "sent" | "accepted" | "declined"
  created_at: string;
  inclusions?: any;
  exclusions?: any;
};

function toList(value: any): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string")
    return value.split(/[,;\n]/g).map((s) => s.trim()).filter(Boolean);
  if (typeof value === "object") {
    try { return Object.values(value).map(v => String(v)); } catch { return []; }
  }
  return [];
}

export default function ClientQuotesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [acting, setActing] = useState<string | null>(null);

  // decline modal
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  // 1) Load session + role
  useEffect(() => {
    (async () => {
      const supa = supabaseBrowser();
      const { data: { session } } = await supa.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data } = await supa
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();
        setRole((data?.role as Role) ?? "client");
      }
      setCheckingAuth(false);
    })();
  }, []);

  // 2) Load quotes for this user — server reads session, so include cookies
  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/by-user`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load quotes");
      setQuotes(data.quotes || []);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (userId) reload(); /* eslint-disable-next-line */ }, [userId]);

  const totalValue = useMemo(
    () => quotes.reduce((sum, q) => sum + (Number(q.total_price) || 0), 0),
    [quotes]
  );

  // 3) Accept / Decline — send only { quote_id, decision, reason } and include cookies
  async function decide(quoteId: string, decision: "accept" | "decline", reason?: string) {
    try {
      if (!userId) throw new Error("Not authenticated");
      setActing(quoteId);
      const res = await fetch("/api/quotes/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ quote_id: quoteId, decision, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to submit decision");
      if (decision === "decline") {
        setDeclineFor(null);
        setDeclineReason("");
      }
      await reload();
      alert(decision === "accept" ? "Quote accepted ✔" : "Quote declined ✔");
    } catch (e: any) {
      alert(e.message || "Could not submit decision");
    } finally {
      setActing(null);
    }
  }

  // --------- Guards ---------
  if (checkingAuth) {
    return <main className="max-w-6xl mx-auto p-6"><p>Checking session…</p></main>;
  }

  if (!userId) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <p>Please <a className="underline" href="/auth/login">log in</a> to view your quotes.</p>
      </main>
    );
  }

  if (role && role !== "client") {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <p className="text-red-600">
          Your account role is <b>{role}</b>. Only <b>client</b> accounts can view this page.
        </p>
      </main>
    );
  }

  // --------- UI ---------
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Quotes</h1>
        <button onClick={reload} className="px-3 py-1 rounded border" disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Viewing quotes for user <code className="bg-gray-100 px-1 rounded">{userId}</code>.
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
                  <th className="p-3 border-b">Operator</th>
                  <th className="p-3 border-b">Total</th>
                  <th className="p-3 border-b">Currency</th>
                  <th className="p-3 border-b">Status</th>
                  <th className="p-3 border-b">Inclusions</th>
                  <th className="p-3 border-b">Exclusions</th>
                  <th className="p-3 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const inc = toList(q.inclusions);
                  const exc = toList(q.exclusions);
                  const status = (q.status || "sent") as "sent" | "accepted" | "declined";
                  const isSent = status === "sent";
                  const isAccepted = status === "accepted";
                  const isDeclined = status === "declined";

                  return (
                    <tr key={q.id} className="text-sm">
                      <td className="p-3 border-b">{new Date(q.created_at).toLocaleString()}</td>
                      <td className="p-3 border-b"><code className="text-xs">{q.operator_id}</code></td>
                      <td className="p-3 border-b">
                        {new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: q.currency || "USD",
                          maximumFractionDigits: 0,
                        }).format(Number(q.total_price))}
                      </td>
                      <td className="p-3 border-b">{q.currency || "—"}</td>
                      <td className="p-3 border-b">
                        <span className={`inline-block rounded px-2 py-0.5 border ${
                          isAccepted ? "bg-green-50" : isDeclined ? "bg-red-50" : ""
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-3 border-b max-w-[240px] truncate" title={inc.join(", ")}>
                        {inc.join(", ") || "—"}
                      </td>
                      <td className="p-3 border-b max-w-[240px] truncate" title={exc.join(", ")}>
                        {exc.join(", ") || "—"}
                      </td>
                      <td className="p-3 border-b">
                        {isSent ? (
                          <div className="flex gap-2">
                            <button
                              disabled={acting === q.id}
                              onClick={() => decide(q.id, "accept")}
                              className="px-3 py-1 rounded border disabled:opacity-50"
                            >
                              {acting === q.id ? "Accepting…" : "Accept"}
                            </button>
                            <button
                              disabled={acting === q.id}
                              onClick={() => { setDeclineFor(q.id); setDeclineReason(""); }}
                              className="px-3 py-1 rounded border disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Decline dialog */}
      {declineFor && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center">
          <div className="bg-white rounded-lg p-5 w-full max-w-md space-y-3">
            <h3 className="text-lg font-semibold">Decline Quote</h3>
            <p className="text-sm text-gray-600">Choose a reason or type your own.</p>
            <div className="flex flex-wrap gap-2">
              {["Too expensive", "Dates not available", "Changed my mind", "Found another operator"].map(r => (
                <button
                  key={r}
                  onClick={() => setDeclineReason(r)}
                  className="px-2 py-1 rounded border text-sm"
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              className="border rounded p-2 w-full"
              rows={3}
              placeholder="Add details (optional)"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeclineFor(null)} className="px-3 py-2 border rounded">
                Cancel
              </button>
              <button
                onClick={() => decide(declineFor, "decline", declineReason || undefined)}
                className="px-3 py-2 rounded bg-black text-white"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
