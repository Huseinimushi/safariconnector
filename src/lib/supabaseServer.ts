// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase server client for route handlers & server components
 */
export function supabaseServer(): SupabaseClient {
  // Next 16 types zinaonyesha kama Promise, so we cast to any for compatibility
  const cookieStore = cookies() as any;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore?.get?.(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore?.set?.(name, value, options);
          } catch {
            // ignore on runtimes where set is not available
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore?.set?.(name, "", { ...options, maxAge: 0 });
          } catch {
            // ignore
          }
        },
      },
    }
  );
}
