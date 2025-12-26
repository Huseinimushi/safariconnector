// src/app/operators/(panel)/layout.tsx
import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/* ---------------- Supabase server client ---------------- */
const supabaseServer = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/* ---------------- Navigation ---------------- */
const NAV = [
  { href: "/operators", label: "Dashboard", icon: "🏠" },
  { href: "/operators/trips", label: "Trips", icon: "🗺️" },
  { href: "/operators/bookings", label: "Bookings", icon: "🧾" },
  { href: "/operators/enquiries", label: "Enquiries", icon: "📩" },
  { href: "/operators/quotes", label: "Quotes", icon: "💬" },
  { href: "/operators/messages", label: "Messages", icon: "✉️" },
  { href: "/operators/profile", label: "Profile", icon: "👤" },
];

export default async function OperatorPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const host = (h.get("host") || "").toLowerCase();

  const rootDomain = host.replace(/^operator\./, "").replace(/^admin\./, "");
  const mainSiteUrl = `https://${rootDomain}`;

  /* ---------------- Load operator company name ---------------- */
  let companyName: string | null = null;

  try {
    const supabase = supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      const { data: opView } = await supabase
        .from("operators_view")
        .select("company_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (opView?.company_name) {
        companyName = opView.company_name;
      } else {
        const { data: op } = await supabase
          .from("operators")
          .select("company_name")
          .eq("user_id", user.id)
          .maybeSingle();

        companyName = op?.company_name ?? null;
      }
    }
  } catch {
    companyName = null;
  }

  const sidebarW = 92;

  return (
    <div style={{ minHeight: "100vh", background: "#F6F4EE" }}>
      {/* ───────────── Top bar ───────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          height: 56,
          background: "#1B4D3E",
          color: "#FFFFFF",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontWeight: 900, letterSpacing: "0.12em" }}>
            SAFARI CONNECTOR
          </div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            Operator workspace
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            Manage trips, quotes & bookings
          </div>

          <a
            href={mainSiteUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              borderRadius: 999,
              padding: "7px 12px",
              border: "1px solid rgba(255,255,255,0.35)",
              background: "rgba(0,0,0,0.1)",
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Main website →
          </a>
        </div>
      </header>

      {/* ───────────── Shell ───────────── */}
      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: sidebarW,
            minWidth: sidebarW,
            background: "#214B41",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 14,
            paddingBottom: 14,
            position: "sticky",
            top: 56,
            height: "calc(100vh - 56px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              alignItems: "center",
            }}
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  width: 68,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                  color: "#E7F3EE",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.1)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    fontSize: 18,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>
                  {item.label}
                </div>
              </Link>
            ))}
          </nav>

          {/* ───────── Company name (FIXED HERE) ───────── */}
          <div
            style={{
              marginTop: "auto",
              paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.15)",
              textAlign: "center",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.85)",
              width: "100%",
            }}
          >
            YOUR COMPANY
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "normal",
                color: "#FFFFFF",
                padding: "0 6px",
                wordBreak: "break-word",
              }}
            >
              {companyName || "—"}
            </div>
          </div>
        </aside>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </div>
  );
}
