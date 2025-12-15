// src/hooks/useBookingsLive.ts
"use client";

import { useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type UseBookingsLiveArgs = {
  /**
   * Subscribe/poll bookings for a specific operator (best filter: bookings.operator_id).
   */
  operatorId?: string;

  /**
   * Subscribe/poll bookings for a specific traveller (best filter: bookings.traveller_id).
   * If your system doesn’t consistently set traveller_id, you can still pass travellerEmail
   * and rely on polling + payload checks (realtime has no JSON filter).
   */
  travellerId?: string;

  /**
   * Optional: used only for payload matching (JSON meta) when travellerId is not reliable.
   * Realtime cannot filter JSON fields, so this is not used in channel filter.
   */
  travellerEmail?: string;

  /**
   * Enable/disable the hook.
   */
  enabled?: boolean;

  /**
   * Called when any relevant booking row changes (insert/update/delete),
   * or when polling ticks.
   */
  onChange?: () => void;

  /**
   * Poll interval in ms (fallback for missed realtime, or for travellerEmail-only cases).
   * Default: 12 seconds.
   */
  pollMs?: number;

  /**
   * Debounce window in ms to avoid spamming reloads when multiple events arrive.
   * Default: 400ms.
   */
  debounceMs?: number;
};

export function useBookingsLive({
  operatorId,
  travellerId,
  travellerEmail,
  enabled = true,
  onChange,
  pollMs = 12_000,
  debounceMs = 400,
}: UseBookingsLiveArgs) {
  const onChangeRef = useRef<(() => void) | undefined>(onChange);
  const debounceTimerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const scope = useMemo(() => {
    if (operatorId) return `operator:${operatorId}`;
    if (travellerId) return `traveller:${travellerId}`;
    if (travellerEmail) return `travellerEmail:${travellerEmail}`;
    return "none";
  }, [operatorId, travellerId, travellerEmail]);

  const fireDebounced = () => {
    if (!enabled) return;

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      onChangeRef.current?.();
    }, Math.max(0, debounceMs));
  };

  useEffect(() => {
    if (!enabled) return;

    // If we have no scope identifiers, do nothing.
    if (!operatorId && !travellerId && !travellerEmail) return;

    // Build a realtime filter that Supabase supports (simple column filters).
    // Note: Supabase Realtime cannot filter JSONB meta.traveller_email, so we only
    // filter by operator_id or traveller_id when available.
    const channelName = `bookings_live:${scope}:${Math.random()
      .toString(16)
      .slice(2)}`;

    const channel = supabase.channel(channelName);

    // Realtime handler: debounce reloads.
    const handlePayload = (payload: any) => {
      // If we’re scoped by operatorId, the server-side filter already handles relevance.
      if (operatorId) {
        fireDebounced();
        return;
      }

      // If we’re scoped by travellerId, server-side filter handles relevance.
      if (travellerId) {
        fireDebounced();
        return;
      }

      // If we only have travellerEmail, we cannot filter server-side.
      // We attempt a lightweight payload match on meta.traveller_email if present,
      // otherwise we still debounce-refresh (safe fallback).
      if (travellerEmail) {
        const next = payload?.new || payload?.old || null;
        const emailFromMeta =
          (next?.meta && (next.meta.traveller_email || next.meta.traveler_email)) ||
          null;

        if (!emailFromMeta) {
          // Unknown relevance; still refresh (polling also covers this).
          fireDebounced();
          return;
        }

        if (
          typeof emailFromMeta === "string" &&
          emailFromMeta.toLowerCase() === travellerEmail.toLowerCase()
        ) {
          fireDebounced();
        }
      }
    };

    // Subscribe with the best possible filter.
    if (operatorId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `operator_id=eq.${operatorId}`,
        },
        handlePayload
      );
    } else if (travellerId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `traveller_id=eq.${travellerId}`,
        },
        handlePayload
      );
    } else {
      // travellerEmail-only: subscribe broadly (no filter possible), but we’ll match in handler.
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        handlePayload
      );
    }

    channel.subscribe((status) => {
      // If subscribe fails, polling still keeps things fresh.
      // (No UI changes requested, so no status surface here.)
      void status;
    });

    // Polling fallback
    intervalRef.current = window.setInterval(() => {
      fireDebounced();
    }, Math.max(2_000, pollMs));

    const onVis = () => {
      // When user returns to tab, refresh once.
      if (document.visibilityState === "visible") fireDebounced();
    };
    const onOnline = () => {
      // When connectivity returns, refresh once.
      fireDebounced();
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, operatorId, travellerId, travellerEmail, pollMs, debounceMs, scope]);
}
