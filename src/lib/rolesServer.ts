// src/lib/rolesServer.ts
import { requireUser } from "@/lib/authServer";

export type AppRole = "admin" | "operator" | "traveller";

export async function getUserRole(): Promise<AppRole | null> {
  try {
    const { user, supabase } = await requireUser();

    // Option A: role from profiles table (preferred)
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return null;

    const r = String(data?.role || "").toLowerCase();
    if (r === "admin" || r === "operator" || r === "traveller") return r;

    // Option B fallback: from user metadata
    const metaRole =
      (user.user_metadata?.role as string | undefined) ||
      (user.app_metadata?.role as string | undefined) ||
      "";

    const mr = metaRole.toLowerCase();
    if (mr === "admin" || mr === "operator" || mr === "traveller") return mr;

    return null;
  } catch {
    // covers Not authenticated (requireUser throws)
    return null;
  }
}
