// src/app/admin/(panel)/layout.tsx

import React from "react";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No redirect here; admin pages under (panel) should just render.
  return <>{children}</>;
}
