// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const hostHeader = req.headers.get("host") || "";
  const host = hostHeader.split(":")[0].toLowerCase();

  const isAdminHost = host.startsWith("admin.");
  const isOperatorHost = host.startsWith("operator.");

  const p = url.pathname;

  // ADMIN subdomain: user-facing URLs should NOT include /admin
  if (isAdminHost) {
    // Normalize accidental /admin/* to clean path
    if (p.startsWith("/admin")) {
      const clean = p.replace(/^\/admin/, "") || "/";
      url.pathname = clean;
      return NextResponse.redirect(url);
    }

    // Clean login URL
    if (p === "/login") {
      url.pathname = "/admin/login";
      return NextResponse.rewrite(url);
    }

    // Default admin landing
    if (p === "/") {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }

    // Everything else -> /admin/*
    url.pathname = `/admin${p}`;
    return NextResponse.rewrite(url);
  }

  // OPERATOR subdomain: user-facing URLs should NOT include /operators
  if (isOperatorHost) {
    // Normalize accidental /operators/* to clean path
    if (p.startsWith("/operators")) {
      const clean = p.replace(/^\/operators/, "") || "/";
      url.pathname = clean;
      return NextResponse.redirect(url);
    }

    // Clean login URL
    if (p === "/login") {
      url.pathname = "/operators/login";
      return NextResponse.rewrite(url);
    }

    // Default operator landing
    if (p === "/") {
      url.pathname = "/operators";
      return NextResponse.rewrite(url);
    }

    // Everything else -> /operators/*
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
