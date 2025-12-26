// src/app/operators/(panel)/trips/layout.tsx
import React, { type ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function TripsLayout({ children }: { children: ReactNode }) {
  // IMPORTANT:
  // Sidebar + topbar already live in: src/app/operators/(panel)/layout.tsx
  // Hapa tunapass-through tu ili kuepuka duplicate sidebar.
  return <>{children}</>;
}
