// src/app/admin/(protected)/layout.tsx
import { ReactNode } from "react";

export default function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
