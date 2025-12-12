// src/lib/unreadClient.ts
"use client";

/**
 * Helper za kusave "nimeshaona hii conversation"
 * kwenye localStorage – upande wa operator na traveller.
 */

/* ------------ Operator side ------------ */

const OPERATOR_UNREAD_KEY = "sc_unread_operator";

export const getOperatorUnreadMap = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OPERATOR_UNREAD_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
};

const setOperatorUnreadMap = (map: Record<string, number>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OPERATOR_UNREAD_KEY, JSON.stringify(map));
  } catch {
    //
  }
};

export const markOperatorQuoteSeen = (quoteId: string) => {
  if (!quoteId) return;
  const map = getOperatorUnreadMap();
  map[quoteId] = Date.now();
  setOperatorUnreadMap(map);
};

/* ------------ Traveller side ------------ */

const TRAVELLER_UNREAD_KEY = "sc_unread_traveller";

export const getTravellerUnreadMap = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TRAVELLER_UNREAD_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
};

const setTravellerUnreadMap = (map: Record<string, number>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRAVELLER_UNREAD_KEY, JSON.stringify(map));
  } catch {
    //
  }
};

export const markTravellerQuoteSeen = (quoteId: string) => {
  if (!quoteId) return;
  const map = getTravellerUnreadMap();
  map[quoteId] = Date.now();
  setTravellerUnreadMap(map);
};
