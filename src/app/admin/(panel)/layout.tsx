export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import React from "react";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
