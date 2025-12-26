"use client";

import React from "react";
import { usePathname } from "next/navigation";

/**
 * Huficha topbar ya root kwenye maeneo yenye layout yao (operator/admin),
 * ili kuepuka "double topbar".
 */
export default function SiteTopbarGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";

  const isOperatorArea = pathname.startsWith("/operators");
  const isAdminArea = pathname.startsWith("/admin"); // kama unatumia admin routes

  if (isOperatorArea || isAdminArea) return null;

  return <>{children}</>;
}
