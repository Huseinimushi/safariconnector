// src/lib/authServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type RequireUserResult = {
  user: {
    id: string;
    email?: string | null;
    [key: string]: any;
  };
  supabase: ReturnType<typeof createServerClient>;
};

export async function requireUser(): Promise<RequireUserResult> {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  // ✅ KEY CHANGE: throw if not authenticated (no null user returned)
  if (error || !data?.user) {
    throw new Error("Not authenticated");
  }

  return { user: data.user, supabase };
}
