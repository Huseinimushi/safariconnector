// src/lib/rolesServer.ts
import { supabaseServer } from "@/lib/supabaseServer";

export type AppRole = "admin" | "operator" | "traveller";

export async function getUserRole(): Promise<AppRole | null> {
  const supabase = await supabaseServer();

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) return null;

  // OPTION A: role from user_metadata
  const metaRole =
    (user.user_metadata?.role as string | undefined) ||
    (user.app_metadata?.role as string | undefined);

  if (metaRole === "admin" || metaRole === "operator" || metaRole === "traveller") {
    return metaRole;
  }

  // OPTION B (optional): role from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profile?.role === "admin" ||
    profile?.role === "operator" ||
    profile?.role === "traveller"
  ) {
    return profile.role;
  }

  return null;
}
