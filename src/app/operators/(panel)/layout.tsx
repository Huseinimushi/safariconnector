// src/app/operators/(panel)/layout.tsx
import React from "react";
import Link from "next/link";

const BRAND = {
  bar: "#111827",
  bg: "#F4F3ED",
  panel: "#FFFFFF",
  ink: "#0F172A",
  muted: "#6B7280",
  border: "#E1E5ED",
  accent: "#14532D",
};

export default function OperatorPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: BRAND.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Dark workspace bar */}
      <div
        style={{
          backgroundColor: BRAND.bar,
          color: "#E5E7EB",
          padding: "8px 24px",
          borderBottom: "1px solid #020617",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              SAFARI CONNECTOR
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              Operator workspace · Manage trips, quotes & bookings
            </div>
          </div>

          {/* Button to traveller/main site */}
          <Link
            href="https://safariconnector.com"
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: "1px solid rgba(248,250,252,0.4)",
              backgroundColor: "#F9FAFB",
              color: "#111827",
              fontSize: 12,
              fontWeight: 800,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Open main traveller site →
          </Link>
        </div>
      </div>

      {/* Operator nav bar */}
      <header
        style={{
          borderBottom: `1px solid ${BRAND.border}`,
          backgroundColor: BRAND.panel,
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "10px 20px 10px",
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: BRAND.ink,
              }}
            >
              Operator console
            </div>
            <div
              style={{
                fontSize: 12,
                color: BRAND.muted,
                marginTop: 2,
              }}
            >
              Keep trips, enquiries, quotes and bookings up to date.
            </div>
          </div>

          <nav
            aria-label="Operator navigation"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <OpNavLink href="/dashboard">Dashboard</OpNavLink>
            <OpNavLink href="/trips">Trips</OpNavLink>
            <OpNavLink href="/bookings">Bookings</OpNavLink>
            <OpNavLink href="/enquiries">Enquiries</OpNavLink>
            <OpNavLink href="/quotes">Quotes</OpNavLink>
            <OpNavLink href="/inbox">Messages</OpNavLink>
            <OpNavLink href="/profile">Profile</OpNavLink>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main
        style={{
          flex: 1,
          padding: "24px 16px 32px",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>{children}</div>
      </main>

      {/* Footer just for operator workspace */}
      <footer
        style={{
          borderTop: `1px solid ${BRAND.border}`,
          backgroundColor: BRAND.panel,
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "10px 20px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: BRAND.muted,
            }}
          >
            Safari Connector · Operator workspace
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              fontSize: 11,
            }}
          >
            <span style={{ color: "#9CA3AF" }}>
              Need help? Reach out to support.
            </span>
            <Link
              href="mailto:support@safariconnector.com"
              style={{
                color: BRAND.accent,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Email support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function OpNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 12,
        fontWeight: 700,
        padding: "7px 10px",
        borderRadius: 999,
        border: "1px solid #E5E7EB",
        backgroundColor: "#F9FAFB",
        color: "#111827",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Link>
  );
}
