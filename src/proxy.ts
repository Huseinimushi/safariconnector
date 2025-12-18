// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostHeader = req.headers.get("host") || "";
  const host = hostHeader.split(":")[0].toLowerCase();
  const pathname = url.pathname;

  const isAdminHost = host.startsWith("admin.");
  const isOperatorHost = host.startsWith("operator.");

  /* ================= ADMIN SUBDOMAIN =================
     admin.safariconnector.com
     - Public URL: /login
     - Internal app routes live under /admin/*
  ===================================================== */
  if (isAdminHost) {
    // Root of admin subdomain -> admin dashboard route in app
    if (pathname === "/") {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }

    // Admin login (clean URL) -> internal /admin/login page
    if (pathname === "/login") {
      url.pathname = "/admin/login";
      return NextResponse.rewrite(url);
    }

    // If request already points to /admin/* just let Next handle it
    if (pathname.startsWith("/admin")) {
      return NextResponse.next();
    }

    // Any other path on admin subdomain -> map into /admin/*
    url.pathname = `/admin${pathname}`;
    return NextResponse.rewrite(url);
  }

  /* =============== OPERATOR SUBDOMAIN =================
     operator.safariconnector.com
     - Public URL: /login
     - Internal app routes live under /operators/*
  ===================================================== */
  if (isOperatorHost) {
    // Root of operator subdomain -> operators root route
    if (pathname === "/") {
      url.pathname = "/operators";
      return NextResponse.rewrite(url);
    }

    // Operator login (clean URL) -> internal /operators/login
    if (pathname === "/login") {
      url.pathname = "/operators/login";
      return NextResponse.rewrite(url);
    }

    // Already under /operators/* -> let Next handle it
    if (pathname.startsWith("/operators")) {
      return NextResponse.next();
    }

    // Any other operator-subdomain path -> map into /operators/*
    url.pathname = `/operators${pathname}`;
    return NextResponse.rewrite(url);
  }

  /* ================= ROOT DOMAIN =====================
     safariconnector.com / www.safariconnector.com
     - Block direct access to /admin and /operators
  ===================================================== */
  if (pathname.startsWith("/admin") || pathname.startsWith("/operators")) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Normal main-site request
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
 