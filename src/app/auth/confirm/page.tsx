import { getSessionAndRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ConfirmPage() {
  const { user, role } = await getSessionAndRole();
  if (!user) redirect("/auth/login");
  if (role === "operator") redirect("/operator/leads");
  redirect("/client/quotes");
}
