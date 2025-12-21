// src/app/operators/(panel)/layout.tsx
"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ===== Brand tokens (same spirit as Option A, but Safari Connector colors) =====
const BRAND = {
  bg: "#F4F3ED",
  shell: "#0B1720",
  sidebar: "#111827",
  panel: "#FFFFFF",
  borderSoft: "#E1E5ED",
  borderSubtle: "#CBD5E1",
  primary: "#0B6B3A",
  primarySoft: "rgba(11, 107, 58, 0.08)",
  primaryDark: "#064E3B",
  accent: "#D4A017",
  text: "#0F172A",
  muted: "#6B7280",
  subtle: "#9CA3AF",
};

type OperatorPanelLayoutProps = {
  children: ReactNode;
};

type OperatorProfile = {
  company_name: string | null;
};

export default function OperatorPanelLayout({
  children,
}: OperatorPanelLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // --- Load operator company name (best-effort, fail silently) ---
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes.user?.id;
        if (!userId) {
          setCompanyName(null);
          return;
        }

        // try operators_view first (preferred)
        const { data, error } = await supabase
          .from("operators_view")
          .select("company_name")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.warn("operator layout profile error:", error.message);
          setCompanyName(null);
          return;
        }

        setCompanyName(data?.company_name ?? null);
      } catch (err) {
        console.warn("operator layout profile exception:", err);
        if (isMounted) setCompanyName(null);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("operator logout error:", e);
    } finally {
      // On operator subdomain, /login is proxied → /operators/login
      router.replace("/login");
    }
  };

  // browser paths (proxy will rewrite → /operators/...)
  const NAV_ITEMS: { href: string; label: string; key: string }[] = [
    { href: "/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/trips", label: "Trips", key: "trips" },
    { href: "/bookings", label: "Bookings", key: "bookings" },
    { href: "/enquiries", label: "Enquiries", key: "enquiries" },
    { href: "/quotes", label: "Quotes", key: "quotes" },
    { href: "/inbox", label: "Messages", key: "inbox" },
    { href: "/profile", label: "Profile", key: "profile" },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/dashboard") {
      // dashboard is special: match / or /dashboard when proxied
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: BRAND.bg,
        display: "flex",
      }}
    >
      {/* ====== LEFT RAIL / SIDEBAR ====== */}
      <aside
        style={{
          width: 80,
          background: BRAND.sidebar,
          color: "#E5E7EB",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "18px 12px",
          gap: 18,
        }}
      >
        {/* Logo pill */}
        <Link
          href="/dashboard"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            border: "1px solid rgba(248, 250, 252, 0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, rgba(212,160,23,0.08), rgba(11,107,58,0.32))",
            fontSize: 18,
            fontWeight: 900,
            color: "#F9FAFB",
          }}
        >
          SC
        </Link>

        {/* Vertical divider */}
        <div
          style={{
            width: 1,
            flexGrow: 0,
            height: 22,
            background:
              "linear-gradient(to bottom, transparent, rgba(148,163,184,0.5), transparent)",
            margin: "2px 0 6px",
          }}
        />

        {/* Main nav icons (first letter style) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            flexGrow: 1,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  fontSize: 16,
                  fontWeight: 800,
                  border: active
                    ? "1px solid rgba(248, 250, 252, 0.9)"
                    : "1px solid transparent",
                  backgroundColor: active
                    ? "rgba(15, 23, 42, 0.9)"
                    : "rgba(15, 23, 42, 0.35)",
                  color: active ? "#F9FAFB" : "#CBD5F5",
                  boxShadow: active
                    ? "0 0 0 1px rgba(11, 107, 58, 0.35)"
                    : "none",
                }}
                title={item.label}
              >
                {item.label.charAt(0)}
              </Link>
            );
          })}
        </div>

        {/* Bottom shortcuts */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: "auto",
          }}
        >
          {/* Main marketplace shortcut */}
          <a
            href="https://safariconnector.com"
            target="_blank"
            rel="noreferrer"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "1px solid rgba(248,250,252,0.26)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 800,
              color: "#F9FAFB",
              background:
                "radial-gradient(circle at 30% 0%, rgba(212,160,23,0.4), rgba(15,23,42,0.9))",
            }}
            title="Open main marketplace"
          >
            SC
          </a>

          {/* Logout icon button */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "1px solid rgba(248,250,252,0.14)",
              backgroundColor: "transparent",
              color: "#FCA5A5",
              fontSize: 18,
              fontWeight: 900,
              cursor: "pointer",
            }}
            title="Log out"
          >
            ⏏
          </button>
        </div>
      </aside>

      {/* ====== MAIN SHELL ====== */}
      <div
        style={{
          flex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top header bar */}
        <header
          style={{
            height: 70,
            borderBottom: `1px solid ${BRAND.borderSoft}`,
            backgroundColor: BRAND.panel,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: BRAND.subtle,
                marginBottom: 2,
              }}
            >
              Safari Connector · Operator workspace
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: BRAND.primaryDark,
              }}
            >
              {loadingProfile
                ? "Loading company…"
                : companyName || "Your company"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* Quick link to main marketplace */}
            <a
              href="https://safariconnector.com"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${BRAND.borderSubtle}`,
                backgroundColor: BRAND.bg,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
                color: BRAND.primaryDark,
              }}
            >
              Go to main marketplace
            </a>

            {/* Simple tag showing environment */}
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${BRAND.borderSubtle}`,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: BRAND.subtle,
                backgroundColor: "#F9FAFB",
              }}
            >
              Operator panel
            </div>
          </div>
        </header>

        {/* Content area */}
        <main
          style={{
            flex: 1,
            padding: "24px 28px 32px",
          }}
        >
          {children}
        </main>

        {/* Footer */}
        <footer
          style={{
            borderTop: `1px solid ${BRAND.borderSoft}`,
            backgroundColor: BRAND.panel,
            padding: "10px 28px 14px",
            fontSize: 11,
            color: BRAND.subtle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            Safari Connector · Operator workspace ·{" "}
            <span style={{ fontWeight: 600 }}>Private access only</span>
          </span>
          <span>
            Need help?{" "}
            <Link
              href="/support"
              style={{
                color: BRAND.primaryDark,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Contact support
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
