// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const host = hostname.split(":")[0].toLowerCase();

  const isAdminHost = host.startsWith("admin.");
  const isOperatorHost = host.startsWith("operator.");

  const p = url.pathname;

  // ADMIN subdomain
  if (isAdminHost) {
    // If someone tries to access operators namespace on admin subdomain, force to /admin
    if (p.startsWith("/operators")) {
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    // Rewrite everything to /admin/*
    if (!p.startsWith("/admin")) {
      url.pathname = `/admin${p}`;
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // OPERATOR subdomain
  if (isOperatorHost) {
    // If someone tries to access admin namespace on operator subdomain, force to /operators
    if (p.startsWith("/admin")) {
      url.pathname = "/operators";
      return NextResponse.redirect(url);
    }

    // Rewrite everything to /operators/*
    if (!p.startsWith("/operators")) {
      url.pathname = `/operators${p}`;
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // ROOT domain: block direct access to /admin and /operators
  // (admin/operator must be accessed via their subdomains)
  if (p.startsWith("/admin") || p.startsWith("/operators")) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // MAIN domain (travellers/public)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
