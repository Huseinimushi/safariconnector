// src/app/operators/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/rolesServer";

export default async function OperatorsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const role = await getUserRole();

  // Not logged in OR wrong role → send to operator login
  if (role !== "operator") {
    redirect("/operators/login");
  }

  return <>{children}</>;
}
