// src/lib/authServer.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabaseServer";

export type AuthUser = {
  id: string;
  email: string | null;
};

export type RequireUserResult = {
  supabase: SupabaseClient;
  user: AuthUser;
};

/**
 * requireUser()
 * - Inatumika kwenye API routes (quotes, leads, etc)
 * - Inarudisha supabase client + user aliye-login
 * - Ikiwa hakuna user, inatupa error "Not authenticated"
 */
export async function requireUser(): Promise<RequireUserResult> {
  const supabase = supabaseServer();

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Not authenticated");
  }

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email ?? null, // 🔧 ensure null, not undefined
  };

  return { supabase, user };
}
