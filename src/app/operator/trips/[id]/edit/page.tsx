"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function EditTrip({ params }: any) {
  const { id } = params;
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("trips").select("*").eq("id", id).single();
      setTrip(data);
    };
    load();
  }, []);

  const updateTrip = async () => {
    const res = await fetch(`/api/trips/${id}/update`, {
      method: "PUT",
      body: JSON.stringify(trip),
    });

    const result = await res.json();

    if (result.success) {
      alert("Updated!");
      router.push("/operator/trips");
    } else {
      alert("Error: " + result.error);
    }
  };

  if (!trip) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Edit Trip</h2>

      <label>Title</label>
      <input
        className="border p-2 rounded w-full"
        value={trip.title}
        onChange={(e) => setTrip({ ...trip, title: e.target.value })}
      />

      <label className="mt-3">Price</label>
      <input
        className="border p-2 rounded w-full"
        type="number"
        value={trip.price}
        onChange={(e) => setTrip({ ...trip, price: Number(e.target.value) })}
      />

      <button
        onClick={updateTrip}
        className="mt-5 bg-green-600 text-white px-4 py-2 rounded"
      >
        Save Changes
      </button>
    </div>
  );
}
