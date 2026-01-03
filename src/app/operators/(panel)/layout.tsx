"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND = {
  bg: "#F4F3ED",
  sidebar: "#1B4D3E",
  topbar: "#1B4D3E",
  panel: "#FFFFFF",
  borderSoft: "#E1E5ED",
};

type OperatorPanelProps = { children: ReactNode };

type OperatorRow = {
  id: string;
  user_id?: string | null;
  company_name?: string | null;
  name?: string | null;
  status?: string | null;
};

export default function OperatorPanelLayout({ children }: OperatorPanelProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [companyName, setCompanyName] = useState<string>("—");
  const [loadingCompany, setLoadingCompany] = useState(true);

  // ✅ Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    // Detect mobile using matchMedia (no Tailwind needed)
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setIsMobile(mq.matches);

    apply();
    mq.addEventListener?.("change", apply);

    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Close drawer on route change (mobile)
  useEffect(() => {
    if (isMobile) setNavOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    let alive = true;

    const loadCompany = async () => {
      setLoadingCompany(true);

      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes?.user?.id;

        if (!uid) {
          if (!alive) return;
          setCompanyName("—");
          setLoadingCompany(false);
          return;
        }

        // operators_view first
        const { data: opView, error: opViewErr } = await supabase
          .from("operators_view")
          .select("id,user_id,company_name,name,status")
          .eq("user_id", uid)
          .maybeSingle();

        if (!opViewErr && opView) {
          if (!alive) return;
          setCompanyName(opView.company_name || opView.name || "—");
          setLoadingCompany(false);
          return;
        }

        // fallback operators table
        const { data: op, error: opErr } = await supabase
          .from("operators")
          .select("id,user_id,company_name,name,status")
          .eq("user_id", uid)
          .maybeSingle();

        if (!alive) return;

        if (opErr) {
          setCompanyName("—");
          setLoadingCompany(false);
          return;
        }

        setCompanyName(op?.company_name || op?.name || "—");
        setLoadingCompany(false);
      } catch {
        if (!alive) return;
        setCompanyName("—");
        setLoadingCompany(false);
      }
    };

    loadCompany();

    return () => {
      alive = false;
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const NAV = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: "🏠" },
      { href: "/trips", label: "Trips", icon: "🗺️" },
      { href: "/bookings", label: "Bookings", icon: "📑" },
      { href: "/enquiries", label: "Enquiries", icon: "📬" },
      { href: "/quotes", label: "Quotes", icon: "💬" },
      { href: "/inbox", label: "Messages", icon: "✉️" },
      { href: "/profile", label: "Profile", icon: "👤" },
    ],
    []
  );

  const isActive = (href: string) => {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href + "?");
  };

  const Sidebar = (
    <aside
      style={{
        width: 92,
        background: BRAND.sidebar,
        color: "#FFF",
        display: "flex",
        flexDirection: "column",
        padding: "14px 6px",
        alignItems: "center",
        gap: 14,
        flexShrink: 0,

        // ✅ Mobile drawer positioning (desktop unchanged)
        position: isMobile ? "fixed" : "relative",
        top: 0,
        left: 0,
        height: isMobile ? "100vh" : "auto",
        zIndex: isMobile ? 60 : "auto",
        transform: isMobile ? (navOpen ? "translateX(0)" : "translateX(-110%)") : "none",
        transition: isMobile ? "transform 180ms ease" : "none",
        boxShadow: isMobile ? "0 10px 28px rgba(0,0,0,.25)" : "none",
      }}
      aria-hidden={isMobile ? !navOpen : false}
    >
      {NAV.map((item) => {
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            style={{
              textDecoration: "none",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "4px 0",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                border: active ? "2px solid #F9FAFB" : "1px solid rgba(255,255,255,0.35)",
              }}
            >
              {item.icon}
            </div>
            <div
              style={{
                fontSize: 10,
                color: active ? "#FFF" : "#D1D5DB",
                fontWeight: active ? 700 : 500,
                textAlign: "center",
              }}
            >
              {item.label}
            </div>
          </Link>
        );
      })}

      {/* COMPANY NAME FOOTER (BOTTOM LEFT) */}
      <div
        style={{
          marginTop: "auto",
          width: "100%",
          padding: "10px 6px 8px",
          textAlign: "center",
          borderTop: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <div
          style={{
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "rgba(226,232,240,0.9)",
            marginBottom: 6,
          }}
        >
          Your company
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#F9FAFB",
            lineHeight: 1.2,
            wordBreak: "break-word",
            minHeight: 28,
          }}
        >
          {loadingCompany ? "Loading…" : companyName || "—"}
        </div>

        <div style={{ fontSize: 10, color: "rgba(226,232,240,0.65)", marginTop: 4 }}>—</div>
      </div>

      <button
        onClick={handleLogout}
        title="Logout"
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.3)",
          color: "#FCA5A5",
          background: "transparent",
          fontSize: 18,
          cursor: "pointer",
          marginTop: 10,
        }}
      >
        ⏏
      </button>
    </aside>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: BRAND.bg }}>
      {/* ✅ Mobile backdrop */}
      {isMobile && navOpen ? (
        <div
          onClick={() => setNavOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 55,
          }}
          aria-hidden="true"
        />
      ) : null}

      {/* SIDEBAR */}
      {Sidebar}

      {/* RIGHT SIDE */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* TOPBAR */}
        <header
          style={{
            background: BRAND.topbar,
            color: "#FFF",
            padding: "10px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap", // ✅ responsive wrap only
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {/* ✅ Mobile menu button (desktop hidden) */}
              {isMobile ? (
                <button
                  onClick={() => setNavOpen(true)}
                  aria-label="Open navigation"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(0,0,0,0.14)",
                    color: "#FFF",
                    cursor: "pointer",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  ☰
                </button>
              ) : null}

              <div style={{ lineHeight: 1.1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, letterSpacing: "0.12em", fontSize: 14 }}>SAFARI CONNECTOR</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Operator workspace</div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap", // ✅ responsive
                justifyContent: "flex-end",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.9 }}>Manage trips, quotes & bookings</div>

              <Link
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 999,
                  padding: "6px 12px",
                  border: "1px solid rgba(255,255,255,0.35)",
                  background: "rgba(0,0,0,0.12)",
                  color: "#FFF",
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                Main website →
              </Link>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main
          style={{
            flex: 1,
            padding: isMobile ? "16px 14px 22px" : "26px 28px 32px",
            minWidth: 0,
          }}
        >
          {children}
        </main>

        <footer
          style={{
            borderTop: `1px solid ${BRAND.borderSoft}`,
            background: BRAND.panel,
            padding: isMobile ? "10px 14px" : "10px 24px",
            fontSize: 11,
            color: "#6B7280",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap", // ✅ responsive
          }}
        >
          <span>Operator workspace</span>
          <span>Safari Connector</span>
        </footer>
      </div>
    </div>
  );
}
