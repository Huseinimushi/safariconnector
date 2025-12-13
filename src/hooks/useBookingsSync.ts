"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useBookingsSync(params: {
  bookingId?: string;
  operatorId?: string;
  travellerId?: string; // ✅ changed
  enabled?: boolean;
  pollIntervalMs?: number;
  onChange: (payload?: any) => void;
}) {
  const {
    bookingId,
    operatorId,
    travellerId,
    enabled = true,
    pollIntervalMs = 15000,
    onChange,
  } = params;

  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const filters: string[] = [];
    if (bookingId) filters.push(`id=eq.${bookingId}`);
    if (operatorId) filters.push(`operator_id=eq.${operatorId}`);
    if (travellerId) filters.push(`traveller_id=eq.${travellerId}`); // ✅ changed

    const filter = filters.join(",");

    const channel = supabase
      .channel(`bookings-sync:${bookingId || operatorId || travellerId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: filter || undefined,
        },
        (payload) => {
          onChange(payload);
        }
      )
      .subscribe();

    const startPolling = () => {
      stopPolling();
      pollTimerRef.current = window.setInterval(() => onChange(), pollIntervalMs);
    };

    const stopPolling = () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") startPolling();
      else stopPolling();
    };

    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, [bookingId, operatorId, travellerId, enabled, pollIntervalMs, onChange]);
}
