// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostHeader = req.headers.get("host") || "";
  const host = hostHeader.split(":")[0].toLowerCase();
  const pathname = url.pathname;

  // ✅ Never proxy internal Next routes OR API routes
  // If you rewrite /api -> /operators/api... you will break JSON endpoints.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  const isAdminHost = host.startsWith("admin.");
  const isOperatorHost = host.startsWith("operator.");

  /* ========== ADMIN SUBDOMAIN ============== */
  if (isAdminHost) {
    if (pathname === "/") {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }

    if (pathname === "/login") {
      url.pathname = "/admin/login";
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  /* =============== OPERATOR SUBDOMAIN =============== */
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

    // if already scoped to /operators, allow normally
    if (pathname.startsWith("/operators")) {
      return NextResponse.next();
    }

    // ✅ Important: do not rewrite anything else that should remain root-level
    // (we already excluded /api above)
    url.pathname = `/operators${pathname}`;
    return NextResponse.rewrite(url);
  }

  /* ================= ROOT DOMAIN ===================== */
  if (pathname.startsWith("/admin") || pathname.startsWith("/operators")) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ✅ Exclude /api from matcher as well (belt + suspenders)
export const config = {
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
