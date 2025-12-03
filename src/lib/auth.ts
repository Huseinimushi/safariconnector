// src/lib/auth.ts
import { supabaseServer } from "@/lib/supabaseServer";

export async function getSessionAndRole() {
const supabase = supabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  let role: "client" | "operator" | "admin" | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (data?.role as any) ?? "client";
  }

  return { user, role };
}
