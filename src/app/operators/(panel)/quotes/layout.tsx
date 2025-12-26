// src/app/operators/(panel)/quotes/layout.tsx
import React, { type ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function OperatorQuotesLayout({ children }: { children: ReactNode }) {
  // Sidebar/topbar iko kwenye (panel) layout tayari.
  return <>{children}</>;
}
