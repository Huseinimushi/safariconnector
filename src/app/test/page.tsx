"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Park = { id: string; name: string; country: string };

export default function TestPage() {
  const [parks, setParks] = useState<Park[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("parks").select("id,name,country").then(({ data, error }) => {
      if (error) setError(error.message);
      setParks(data || []);
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-3">Parks (from Supabase)</h1>
      {error && <p className="text-red-600">Error: {error}</p>}
      <ul className="list-disc pl-6">
        {parks.map((p) => <li key={p.id}>{p.name} — {p.country}</li>)}
      </ul>
    </div>
  );
}
