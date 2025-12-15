// src/app/operators/(panel)/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUserRole } from "@/lib/rolesServer";

export default async function OperatorPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const role = await getUserRole();

  if (role !== "operator") {
    const host = (await headers()).get("host")?.toLowerCase() || "";
    if (host.startsWith("operator.")) redirect("/login");
    redirect("/operators/login");
  }

  return <>{children}</>;
}
