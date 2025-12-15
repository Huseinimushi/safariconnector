// src/lib/requireAdmin.ts
import { requireUser } from "@/lib/authServer";

const ADMIN_EMAILS = (process.env.SC_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export type RequireAdminResult = {
  userId: string;
  email: string;
  auth: any;
};

export async function requireAdmin(): Promise<RequireAdminResult> {
  const auth = await requireUser();

  const email = (
    (auth as any)?.user?.email ??
    (auth as any)?.email ??
    ""
  )
    .toString()
    .toLowerCase();

  const userId =
    (auth as any)?.user?.id ??
    (auth as any)?.id ??
    "";

  if (!email || !userId) {
    throw new Error("Not authenticated");
  }

  if (ADMIN_EMAILS.length === 0) {
    // Safer default: if env not set, deny everyone
    throw new Error("Admin not configured");
  }

  if (!ADMIN_EMAILS.includes(email)) {
    throw new Error("Admin only");
  }

  return { userId, email, auth };
}
