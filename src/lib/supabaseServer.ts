// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase server client
 * - Works in App Router (Next 16)
 * - Safe for Server Components & Route Handlers
 * - Guards against cookieStore.get not existing
 */
export function supabaseServer(): SupabaseClient {
  // ⚠️ Next.js types sometimes lie (Promise-like),
  // so we treat it defensively
  const cookieStore: any = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // ✅ SAFE: optional chaining prevents runtime crash
          return cookieStore?.get?.(name)?.value;
        },

        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore?.set?.(name, value, options);
          } catch {
            // Some runtimes (e.g. Server Components) disallow setting cookies
          }
        },

        remove(name: string, options: CookieOptions) {
          try {
            cookieStore?.set?.(name, "", { ...options, maxAge: 0 });
          } catch {
            // Ignore silently
          }
        },
      },
    }
  );
}
