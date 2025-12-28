"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/trips") return pathname === "/trips" || pathname.startsWith("/trips/");
    if (href === "/tour-operators")
      return pathname === "/tour-operators" || pathname.startsWith("/tour-operators/");
    return pathname === href;
  };

  return (
    <header
      style={{
        borderBottom: "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      <div
        className="nav-inner"
        style={{
          minHeight: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: "0 16px",
        }}
      >
        {/* LEFT: Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" aria-label="Safari Connector home">
            <img
              src="/logo.png"
              alt="Safari Connector"
              style={{ height: 34, width: "auto", display: "block" }}
            />
          </Link>
        </div>

        {/* CENTER: Links */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
          aria-label="Main navigation"
        >
          <Link
            href="/trips"
            className={`nav-link${isActive("/trips") ? " active" : ""}`}
          >
            Browse Trips
          </Link>

          <Link
            href="/tour-operators"
            className={`nav-link${isActive("/tour-operators") ? " active" : ""}`}
          >
            Tour Operators
          </Link>

          <Link
            href="/plan"
            className={`nav-link${isActive("/plan") ? " active" : ""}`}
          >
            AI Trip Builder
          </Link>

          <Link
            href="/about"
            className={`nav-link${isActive("/about") ? " active" : ""}`}
          >
            About
          </Link>
        </nav>

        {/* RIGHT: Operator Login */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <a
            href="https://operator.safariconnector.com/login"
            style={{
              border: "1px solid #1B4D3E",
              color: "#1B4D3E",
              padding: "8px 16px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
              lineHeight: 1,
            }}
          >
            Login as Operator
          </a>
        </div>
      </div>
    </header>
  );
}
