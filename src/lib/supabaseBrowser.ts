// src/lib/supabaseBrowser.ts
import { createBrowserClient } from "@supabase/ssr";

export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name) {
        if (typeof document === "undefined") return undefined;

        const match = document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${name}=`));

        return match
          ? decodeURIComponent(match.split("=").slice(1).join("="))
          : undefined;
      },

      set(name, value, options) {
        if (typeof document === "undefined") return;

        const isProd = process.env.NODE_ENV === "production";

        const cookieParts = [
          `${name}=${encodeURIComponent(value)}`,
          "Path=/",
          "SameSite=Lax",
        ];

        // 🔑 IMPORTANT: share cookie across subdomains
        if (isProd) {
          cookieParts.push("Domain=.safariconnector.com");
          cookieParts.push("Secure");
        }

        if (options?.maxAge) {
          cookieParts.push(`Max-Age=${options.maxAge}`);
        }

        if (options?.expires) {
          cookieParts.push(`Expires=${options.expires.toUTCString()}`);
        }

        document.cookie = cookieParts.join("; ");
      },

      remove(name) {
        document.cookie = `${name}=; Path=/; Max-Age=0`;
      },
    },
  }
);
