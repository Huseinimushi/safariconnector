// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Protect only /admin/*
  const isAdminRoute = pathname.startsWith("/admin");
  if (!isAdminRoute) return NextResponse.next();

  // Public admin routes
  const isAdminLogin = pathname === "/admin/login";
  const isAdminPublicAsset =
    pathname.startsWith("/admin/_next") ||
    pathname.startsWith("/admin/favicon") ||
    pathname.startsWith("/admin/assets");

  if (isAdminPublicAsset) return NextResponse.next();

  // We need a response object so we can attach refreshed cookies
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, {
              ...options,
              // Key for subdomain session sharing (admin.safariconnector.com)
              domain: ".safariconnector.com",
              path: "/",
              secure: true,
              sameSite: "lax",
            });
          });
        },
      },
    }
  );

  // IMPORTANT: getUser() validates the JWT and is the recommended check for auth gating
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If NOT logged in:
  // - allow /admin/login
  // - redirect everything else in /admin/* to /admin/login
  if (!user) {
    if (isAdminLogin) return res;
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    // optional: keep where they tried to go
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // If logged in and trying to visit /admin/login -> send to /admin home
  if (user && isAdminLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Logged in and normal admin route
  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
