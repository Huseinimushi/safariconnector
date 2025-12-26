"use client";

import React, { type ReactNode } from "react";

export default function OperatorQuotesLayout({ children }: { children: ReactNode }) {
  // Simple wrapper. Sidebar iko kwenye layout ya (panel) juu already.
  return <>{children}</>;
}
