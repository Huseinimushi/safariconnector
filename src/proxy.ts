// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const host = hostname.split(":")[0].toLowerCase();

  const isAdminHost = host.startsWith("admin.");
  const isOperatorHost = host.startsWith("operator.");

  const p = url.pathname;

  // ADMIN subdomain: clean URLs (no /admin in browser)
  if (isAdminHost) {
    // If user hits /admin/*, redirect to clean path
    if (p.startsWith("/admin")) {
      const clean = p.replace(/^\/admin/, "") || "/";
      url.pathname = clean;
      return NextResponse.redirect(url);
    }

    // Default route on admin subdomain
    if (p === "/") {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }

    // Clean login route
    if (p === "/login") {
      url.pathname = "/admin/login";
      return NextResponse.rewrite(url);
    }

    // Everything else maps to /admin/*
    url.pathname = `/admin${p}`;
    return NextResponse.rewrite(url);
  }

  // OPERATOR subdomain: clean URLs (no /operators in browser)
  if (isOperatorHost) {
    // If user hits /operators/*, redirect to clean path
    if (p.startsWith("/operators")) {
      const clean = p.replace(/^\/operators/, "") || "/";
      url.pathname = clean;
      return NextResponse.redirect(url);
    }

    // Default route on operator subdomain
    if (p === "/") {
      url.pathname = "/operators";
      return NextResponse.rewrite(url);
    }

    // Clean login route
    if (p === "/login") {
      url.pathname = "/operators/login";
      return NextResponse.rewrite(url);
    }

    // Everything else maps to /operators/*
    url.pathname = `/operators${p}`;
    return NextResponse.rewrite(url);
  }

  // ROOT domain: block direct access to /admin and /operators
  if (p.startsWith("/admin") || p.startsWith("/operators")) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
