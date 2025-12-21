// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostHeader = req.headers.get("host") || "";
  const host = hostHeader.split(":")[0].toLowerCase();
  const pathname = url.pathname;

  const isAdminHost = host.startsWith("admin.");
  const isOperatorHost = host.startsWith("operator.");

  /* ========== ADMIN SUBDOMAIN ==============
     admin.safariconnector.com
     - "/"       → /admin        (dashboard)
     - "/login"  → /admin/login  (real admin login)
     - any other path → handled normally (/, /operators, /bookings, etc.)
  ============================================ */
  if (isAdminHost) {
    // Root of admin subdomain => admin dashboard
    if (pathname === "/") {
      url.pathname = "/admin";
      // REWRITE so hakuna redirect-loop; URL inabaki "/", content ni /admin
      return NextResponse.rewrite(url);
    }

    // Convenience: if anything sends user to /login on admin subdomain,
    // tumpeleke kwenye admin login halisi.
    if (pathname === "/login") {
      url.pathname = "/admin/login";
      return NextResponse.rewrite(url);
    }

    // All other paths on admin subdomain: endelea normally
    // (e.g. /operators, /bookings, /payments, /support, /analytics, /admin, etc.)
    return NextResponse.next();
  }

  /* =============== OPERATOR SUBDOMAIN ===============
     operator.safariconnector.com
     - "/"       → /operators
     - "/login"  → /operators/login
     - any other → /operators<path>  (unless already starts with /operators)
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
     - Block direct access to /admin and /operators
       on the main public site by redirecting to "/".
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
