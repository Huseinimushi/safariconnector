// src/app/admin/(panel)/layout.tsx
import React from "react";
import Link from "next/link";

const BRAND = {
  bar: "#0B6B3A",
  bg: "#F4F3ED",
  panel: "#FFFFFF",
  ink: "#0F172A",
  muted: "#6B7280",
  border: "#E1E5ED",
};

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: BRAND.bg,
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      {/* Top green system bar */}
      <div
        style={{
          backgroundColor: BRAND.bar,
          color: "#F9FAFB",
          padding: "8px 24px",
          borderBottom: "1px solid rgba(15,23,42,0.3)",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
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
            <div style={{ fontSize: 12, opacity: 0.9 }}>Admin control center</div>
          </div>

          <div
            style={{
              textAlign: "right",
              fontSize: 11,
              lineHeight: 1.4,
              minWidth: 0,
            }}
          >
            <div style={{ fontWeight: 600 }}>Restricted access</div>
            <div style={{ opacity: 0.9 }}>For internal marketplace operations only</div>
          </div>
        </div>
      </div>

      {/* Main admin nav (tabs) */}
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
            padding: "12px 20px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: BRAND.ink }}>Admin workspace</div>
            <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 2 }}>
              Monitor operators, bookings, payments, quotes & support.
            </div>
          </div>

          <nav
            aria-label="Admin main navigation"
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "flex-end",
              minWidth: 0,
            }}
          >
            <HeaderLink href="/admin">Dashboard</HeaderLink>
            <HeaderLink href="/operators-overview">Operators</HeaderLink>
            <HeaderLink href="/bookings">Bookings</HeaderLink>
            <HeaderLink href="/payments">Payments</HeaderLink>
            <HeaderLink href="/support">Support</HeaderLink>
            <HeaderLink href="/analytics">Analytics</HeaderLink>

            {/* Separator */}
            <span style={{ width: 1, height: 26, backgroundColor: BRAND.border }} />

            {/* Button to main public system */}
            <Link
              href="https://safariconnector.com"
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "1px solid rgba(15,23,42,0.12)",
                backgroundColor: "#111827",
                color: "#F9FAFB",
                fontSize: 12,
                fontWeight: 800,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Open main website →
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main
        style={{
          flex: 1,
          padding: "20px 16px 32px",
          minWidth: 0,
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto", minWidth: 0 }}>{children}</div>
      </main>

      {/* Footer just for admin panel */}
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
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <div style={{ fontSize: 11, color: BRAND.muted }}>
            Safari Connector · Admin panel · Internal use only
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, flexWrap: "wrap" }}>
            <span style={{ color: "#9CA3AF" }}>v1 · Operational</span>
            <Link
              href="mailto:support@safariconnector.com"
              style={{
                color: "#065F46",
                textDecoration: "none",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Contact platform support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 12,
        fontWeight: 700,
        padding: "8px 12px",
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
