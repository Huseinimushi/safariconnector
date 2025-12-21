// src/app/layout.tsx
import type { Metadata } from "next";
import React from "react";
import { headers } from "next/headers";

import { AuthProvider } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Safari Connector",
  description: "AI powered safari marketplace",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const host = (h.get("host") || "").toLowerCase();

  const isAdminHost = host.startsWith("admin.");
  const isOperatorHost = host.startsWith("operator.");

  return (
    <html lang="en">
      <head>
        {/* Important for mobile responsiveness */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Global stylesheet served from /public */}
        <link rel="stylesheet" href="/sc-globals.css" />
      </head>
      <body>
        {/* 🔐 Global auth (session available every page) */}
        <AuthProvider>
          {isAdminHost ? (
            <>
              <AdminHeader />
              <main>{children}</main>
            </>
          ) : isOperatorHost ? (
            <>
              <OperatorHeader />
              <main>{children}</main>
            </>
          ) : (
            <>
              {/* 🌍 Main public site */}
              <Nav />
              <main>{children}</main>
              <Footer />
            </>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}

/* ================== CUSTOM HEADERS ================== */

const MAIN_COLOR = "#1B4D3E";

function MainSiteButton() {
  return (
    <a
      href="https://safariconnector.com"
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.55)",
        color: "#F9FAFB",
        textDecoration: "none",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      Main website →
    </a>
  );
}

function AdminHeader() {
  return (
    <header
      style={{
        width: "100%",
        borderBottom: "1px solid rgba(15, 23, 42, 0.15)",
        backgroundColor: MAIN_COLOR,
        color: "#F9FAFB",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.9,
            }}
          >
            Safari Connector
          </div>
          <div
            style={{
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            Admin control center
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.9,
              textAlign: "right",
            }}
          >
            <div>Restricted access</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>
              For internal marketplace operations only
            </div>
          </div>

          <MainSiteButton />
        </div>
      </div>
    </header>
  );
}

function OperatorHeader() {
  return (
    <header
      style={{
        width: "100%",
        borderBottom: "1px solid rgba(15, 23, 42, 0.15)",
        backgroundColor: MAIN_COLOR,
        color: "#E5F3EC",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.9,
            }}
          >
            Safari Connector
          </div>
          <div
            style={{
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            Operator workspace
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textAlign: "right",
              opacity: 0.9,
            }}
          >
            <div>Manage trips, quotes & bookings</div>
          </div>

          <MainSiteButton />
        </div>
      </div>
    </header>
  );
}
