// src/app/operators/(panel)/layout.tsx
"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND = {
  bg: "#F4F3ED",
  shell: "#10352A", // deep Safari green / navy-green
  sidebar: "#1B4D3E",
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

  // ===== Load operator company name (best-effort) =====
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
      router.replace("/login"); // on operator host → /operators/login
    }
  };

  // Browser-visible paths (proxy rewrites to /operators/...)
  const NAV_ITEMS: { href: string; label: string; icon: string }[] = [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/trips", label: "Trips", icon: "🗺️" },
    { href: "/bookings", label: "Bookings", icon: "📑" },
    { href: "/enquiries", label: "Enquiries", icon: "📬" },
    { href: "/quotes", label: "Quotes", icon: "💬" },
    { href: "/inbox", label: "Messages", icon: "✉️" },
    { href: "/profile", label: "Profile", icon: "👤" },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const currentSection = (() => {
    const found = NAV_ITEMS.find((i) => isActive(i.href));
    return found?.label ?? "Dashboard";
  })();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: BRAND.bg,
        display: "flex",
      }}
    >
      {/* ===== LEFT SIDEBAR ===== */}
      <aside
        style={{
          width: 96,
          background: `linear-gradient(180deg, ${BRAND.sidebar} 0%, ${BRAND.shell} 100%)`,
          color: "#E5E7EB",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "18px 10px 16px",
          gap: 16,
        }}
      >
        {/* Logo / SC badge */}
        <Link
          href="/dashboard"
          style={{
            width: 50,
            height: 50,
            borderRadius: 18,
            border: "1px solid rgba(248,250,252,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at 0% 0%, rgba(212,160,23,0.5), rgba(1,18,12,0.9))",
            fontSize: 19,
            fontWeight: 900,
            color: "#F9FAFB",
            textDecoration: "none",
          }}
          title="Safari Connector · Operator workspace"
        >
          SC
        </Link>

        <div
          style={{
            width: 1,
            height: 26,
            background:
              "linear-gradient(to bottom, transparent, rgba(148,163,184,0.7), transparent)",
            marginBottom: 2,
          }}
        />

        {/* Main nav icons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flexGrow: 1,
            width: "100%",
            alignItems: "center",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                style={{
                  width: "100%",
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 0",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: active
                      ? "1px solid rgba(248,250,252,0.95)"
                      : "1px solid rgba(148,163,184,0.45)",
                    backgroundColor: active
                      ? "rgba(15,23,42,0.15)"
                      : "rgba(15,23,42,0.25)",
                    boxShadow: active
                      ? "0 0 0 2px rgba(212,160,23,0.65)"
                      : "none",
                    fontSize: 20,
                  }}
                >
                  {item.icon}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    color: active ? "#F9FAFB" : "#CBD5F5",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom: link to main + logout */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: "auto",
            alignItems: "center",
          }}
        >
          <a
            href="https://safariconnector.com"
            target="_blank"
            rel="noreferrer"
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              border: "1px solid rgba(248,250,252,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              fontSize: 11,
              fontWeight: 800,
              color: "#F9FAFB",
              background:
                "radial-gradient(circle at 30% 0%, rgba(212,160,23,0.6), rgba(1,17,11,0.95))",
            }}
            title="Open Safari Connector main site"
          >
            Main
          </a>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              border: "1px solid rgba(248,250,252,0.18)",
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

      {/* ===== MAIN SHELL ===== */}
      <div
        style={{
          flex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <header
          style={{
            height: 78,
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
            {/* Company name big */}
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: BRAND.primaryDark,
              }}
            >
              {loadingProfile
                ? "Loading company..."
                : companyName || "Your Operator Company"}
            </div>
            <div
              style={{
                marginTop: 3,
                fontSize: 12,
                color: BRAND.muted,
              }}
            >
              Operator workspace ·{" "}
              <span style={{ fontWeight: 600 }}>{currentSection}</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
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
              View main marketplace
            </a>

            <div
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${BRAND.borderSubtle}`,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: BRAND.subtle,
                backgroundColor: "#F9FAFB",
              }}
            >
              Operator panel
            </div>
          </div>
        </header>

        {/* Content */}
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
