"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { IoSearchOutline } from "react-icons/io5";

const SOCIAL_LINKS = {
  facebook: "https://facebook.com/safariconnector",
  instagram: "https://instagram.com/safariconnector",
  x: "https://x.com/safariconnector",
  tiktok: "https://tiktok.com/@safariconnector",
};

export default function Nav() {
  const pathname = usePathname();

  const isActiveExact = (path: string) => pathname === path;
  const isActivePrefix = (prefix: string) =>
    pathname === prefix || pathname?.startsWith(`${prefix}/`);

  const navLinkClass = (active: boolean) =>
    `nav-link${active ? " active" : ""}`;

  return (
    <header className="nav-root">
      {/* TOP BAR (dark green strip) */}
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
          {/* Left side: email + phone */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>Email: info@safariconnector.com</span>
            <span>Phone: +255 686 032 307</span>
          </div>

          {/* Right side: logins + socials */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <Link
                href="/login/traveller"
                className="btn ghost"
                style={{
                  borderColor: "#ffffff",
                  color: "#ffffff",
                  padding: "6px 12px",
                  fontSize: "13px",
                }}
              >
                Login as Traveller
              </Link>

              <Link
                href="/operators/login"
                className="btn ghost"
                style={{
                  borderColor: "#ffffff",
                  color: "#ffffff",
                  padding: "6px 12px",
                  fontSize: "13px",
                }}
              >
                Login as Operator
              </Link>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                fontSize: 14,
              }}
            >
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

      {/* MAIN NAV BAR */}
      <div className="nav-inner">
        {/* LOGO */}
        <div className="nav-brand">
          <Link href="/" aria-label="Safari Connector home">
            <img
              src="/logo.png"
              alt="Safari Connector"
              className="nav-logo"
            />
          </Link>
        </div>

        {/* CENTER LINKS */}
        <nav className="nav-links">
          <Link
            href="/trips"
            className={navLinkClass(isActivePrefix("/trips"))}
          >
            Browse Trips
          </Link>

          <Link
            href="/tour-operators"
            className={navLinkClass(
              isActivePrefix("/tour-operators") || isActivePrefix("/operators")
            )}
          >
            Tour Operators
          </Link>

          <Link
            href="/plan"
            className={navLinkClass(isActivePrefix("/plan"))}
          >
            AI Trip Builder
          </Link>

          <Link
            href="/about"
            className={navLinkClass(isActiveExact("/about"))}
          >
            About
          </Link>
        </nav>

        {/* RIGHT SIDE: SEARCH */}
        <div className="nav-actions">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(27,77,62,.26)",
              background: "#ffffff",
              minWidth: 180,
            }}
          >
            <IoSearchOutline
              style={{ fontSize: 16, color: "#6b7280", flexShrink: 0 }}
            />
            <input
              type="text"
              placeholder="Search"
              style={{
                border: "none",
                outline: "none",
                fontSize: 13,
                width: "100%",
                background: "transparent",
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
