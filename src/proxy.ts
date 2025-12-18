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
     - Main app routes live under /admin/*
     - Accept BOTH:
       - /login  (clean)
       - /admin/login  (direct)
     - Avoid ALL redirects inside this subdomain to prevent loops
  ===================================================== */
  if (isAdminHost) {
    // 1) Root: show /admin (internal)
    if (pathname === "/") {
      url.pathname = "/admin";
      return NextResponse.rewrite(url); // URL stays "/"
    }

    // 2) Clean login URL -> use internal /admin/login, BUT keep URL as "/login"
    if (pathname === "/login") {
      const internal = url.clone();
      internal.pathname = "/admin/login";
      return NextResponse.rewrite(internal); // no redirect, no URL change
    }

    // 3) If someone types /admin/login or any /admin/* directly, DO NOT touch it
    if (pathname.startsWith("/admin")) {
      return NextResponse.next(); // let Next.js render the real page, no proxy redirect
    }

    // 4) Any other path on admin subdomain -> map into /admin/*
    url.pathname = `/admin${pathname}`;
    return NextResponse.rewrite(url);
  }

  /* =============== OPERATOR SUBDOMAIN =================
     operator.safariconnector.com
     - Internal app under /operators/*
     - Clean URLs: "/", "/login"
  ===================================================== */
  if (isOperatorHost) {
    if (pathname === "/") {
      url.pathname = "/operators";
      return NextResponse.rewrite(url);
    }

    if (pathname === "/login") {
      const internal = url.clone();
      internal.pathname = "/operators/login";
      return NextResponse.rewrite(internal);
    }

    if (pathname.startsWith("/operators")) {
      return NextResponse.next();
    }

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
