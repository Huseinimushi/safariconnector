import React from "react";
import AdminGuard from "./AdminGuard";

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGuard>{children}</AdminGuard>;
}
