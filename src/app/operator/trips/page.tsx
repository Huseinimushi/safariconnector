"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Trip = {
  id: string;
  title: string | null;
  destination?: string | null;
  days?: number | null;
  price_from?: number | null;
  status?: string | null;
  created_at?: string | null;
};

export default function OperatorTripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrips = async () => {
      setLoading(true);
      setError(null);

      // 1. Pata current user (operator)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please log in again as an operator.");
        setLoading(false);
        return;
      }

      // 2. Fetch trips za huyo operator pekee
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("operator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setTrips(data || []);
      }

      setLoading(false);
    };

    loadTrips();
  }, []);

  // 🔴 DELETE FUNCTION – hapa ndipo Delete inafanyika
  const handleDelete = async (id: string) => {
    const ok = confirm("Are you sure you want to delete this trip?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/trips/${id}/delete`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok || !result?.success) {
        alert("Error: " + (result?.error || "Failed to delete trip"));
        return;
      }

      // Ondoa trip kwenye state bila kurefresh page nzima
      setTrips((prev) => prev.filter((trip) => trip.id !== id));
      alert("Trip deleted successfully.");
    } catch (err: any) {
      alert("Unexpected error deleting trip.");
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            My Trips
          </h1>
          <p className="text-sm text-gray-500">
            Manage, edit and delete trips you have posted.
          </p>
        </div>

        <Link
          href="/operator/trips/new"
          className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Add New Trip
        </Link>
      </div>

      {/* Errors */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-sm text-gray-500">Loading your trips...</p>
      )}

      {/* Empty state */}
      {!loading && trips.length === 0 && !error && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
          <p className="text-sm text-gray-600">
            You haven&apos;t posted any trips yet.
          </p>
          <Link
            href="/operator/trips/new"
            className="mt-3 inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Create your first trip
          </Link>
        </div>
      )}

      {/* Trips table */}
      {!loading && trips.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Trip
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Days
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  From (USD)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {trip.title || "Untitled trip"}
                      </span>
                      {trip.destination && (
                        <span className="text-xs text-gray-500">
                          {trip.destination}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                    {trip.days ?? "-"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                    {trip.price_from != null ? trip.price_from.toLocaleString() : "-"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        trip.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : trip.status === "draft"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {trip.status || "—"}
                    </span>
                  </td>

                  {/* 🔧 ACTIONS (EDIT + DELETE) */}
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                    <div className="inline-flex items-center gap-3">
                      {/* Edit link */}
                      <Link
                        href={`/operator/trips/${trip.id}/edit`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </Link>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDelete(trip.id)}
                        className="font-medium text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
