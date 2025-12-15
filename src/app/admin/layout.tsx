// src/app/admin/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/rolesServer";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const role = await getUserRole();

  // Not logged in OR wrong role → send to admin login
  if (role !== "admin") {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
