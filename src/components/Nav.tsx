"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const SOCIAL_LINKS = {
  facebook: "https://facebook.com/safariconnector",
  instagram: "https://instagram.com/safariconnector",
  x: "https://x.com/safariconnector",
  tiktok: "https://tiktok.com/@safariconnector",
};

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="nav-root">
      {/* TOP BAR */}
      <div
        style={{
          background: "#1B4D3E",
          color: "#ffffff",
          fontSize: "13px",
        }}
      >
        <div
          className="nav-inner"
          style={{
            padding: "6px 16px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>Email: info@safariconnector.com</span>
            <span>Phone: +255 686 032 307</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <a
                href="https://operator.safariconnector.com/login"
                className="btn ghost"
                style={{
                  border: "1px solid #ffffff",
                  color: "#ffffff",
                  padding: "6px 12px",
                  fontSize: "13px",
                  background: "transparent",
                  borderRadius: 999,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  lineHeight: 1,
                }}
              >
                Login as Operator
              </a>
            </div>

            <div style={{ display: "flex", gap: 10, fontSize: 14 }}>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                style={{ color: "#ffffff" }}
              >
                <FaFacebookF />
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style={{ color: "#ffffff" }}
              >
                <FaInstagram />
              </a>
              <a
                href={SOCIAL_LINKS.x}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                style={{ color: "#ffffff" }}
              >
                <FaXTwitter />
              </a>
              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                style={{ color: "#ffffff" }}
              >
                <FaTiktok />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN NAV */}
      <div className="nav-inner">
        <div className="nav-brand">
          <Link href="/" aria-label="Safari Connector home">
            <img src="/logo.png" alt="Safari Connector" className="nav-logo" />
          </Link>
        </div>

        <nav className="nav-links">
          <Link
            href="/trips"
            className={`nav-link${
              pathname === "/trips" || pathname?.startsWith("/trips/")
                ? " active"
                : ""
            }`}
          >
            Browse Trips
          </Link>

          <Link
            href="/tour-operators"
            className={`nav-link${
              pathname === "/tour-operators" ||
              pathname?.startsWith("/tour-operators/") ||
              pathname?.startsWith("/operators")
                ? " active"
                : ""
            }`}
          >
            Tour Operators
          </Link>

          <Link
            href="/plan"
            className={`nav-link${pathname === "/plan" ? " active" : ""}`}
          >
            AI Trip Builder
          </Link>

          <Link
            href="/about"
            className={`nav-link${pathname === "/about" ? " active" : ""}`}
          >
            About
          </Link>
        </nav>

        {/* SEARCH BAR REMOVED */}
        <div className="nav-actions" />
      </div>
    </header>
  );
}
