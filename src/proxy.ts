// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const pathname = url.pathname;

  const isAdminHost = host.startsWith("admin.");

  if (isAdminHost) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Normalize accidental /admin/* in URL bar
    if (pathname.startsWith("/admin/")) {
      url.pathname = pathname.replace(/^\/admin/, "") || "/";
      return NextResponse.redirect(url);
    }

    // PUBLIC admin route = /login
    if (!user && pathname !== "/login") {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // USER logged in: hitting /login should redirect dashboard
    if (user && pathname === "/login") {
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    // "/" => dashboard rewrite
    if (pathname === "/") {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }

    // rewrite all other paths
    url.pathname = `/admin${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
