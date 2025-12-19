// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostHeader = req.headers.get("host") || "";
  const host = hostHeader.split(":")[0].toLowerCase();
  const pathname = url.pathname;

  const isAdminHost = host.startsWith("admin.");
  const isOperatorHost = host.startsWith("operator.");

  /* ========== ADMIN SUBDOMAIN (SAFE MODE) ==========
     admin.safariconnector.com
     → NO special rewrites, NO redirects.
     → You MUST use real paths: /admin, /admin/login, etc.
  ==================================================== */
  if (isAdminHost) {
    return NextResponse.next();
  }

  /* =============== OPERATOR SUBDOMAIN ===============
     operator.safariconnector.com
     - "/"       → /operators
     - "/login"  → /operators/login
     - any other → /operators/<path>
  ==================================================== */
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
     (optional) block direct /admin, /operators on main site
  ===================================================== */
  if (pathname.startsWith("/admin") || pathname.startsWith("/operators")) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
