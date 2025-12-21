"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* OFFICIAL SAFARI CONNECTOR BRAND COLORS */
const BRAND = {
  main: "#1B4D3E",   // main navy green
  sand: "#F4F3ED",
  white: "#FFFFFF",
  border: "#E1E5ED",
  textLight: "#F8FAF9",
  textSubtle: "#9DA6A8",
};

type Props = { children: ReactNode };

export default function OperatorPanelLayout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [companyName, setCompanyName] = useState<string | null>("Loading...");

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;

      if (!uid) return setCompanyName("Your Company");

      const { data } = await supabase
        .from("operators_view")
        .select("company_name")
        .eq("user_id", uid)
        .maybeSingle();

      if (alive) setCompanyName(data?.company_name ?? "Your Company");
    }
    load();
    return () => { alive = false };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const NAV = [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/trips", label: "Trips", icon: "🗺️" },
    { href: "/bookings", label: "Bookings", icon: "📑" },
    { href: "/enquiries", label: "Enquiries", icon: "📬" },
    { href: "/quotes", label: "Quotes", icon: "💬" },
    { href: "/inbox", label: "Messages", icon: "✉️" },
    { href: "/profile", label: "Profile", icon: "👤" },
  ];

  const active = (href: string) => pathname?.startsWith(href);

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: BRAND.sand }}>
      {/* SIDEBAR */}
      <aside
        style={{
          width: 100,
          background: BRAND.main,
          color: BRAND.textLight,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 18,
          gap: 18,
        }}
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            style={{
              textDecoration: "none",
              color: active(item.href) ? BRAND.white : BRAND.textLight,
              textAlign: "center",
              fontWeight: active(item.href) ? 700 : 500,
            }}
          >
            <div style={{ fontSize: 26 }}>{item.icon}</div>
            <div style={{ fontSize: 11, marginTop: 2 }}>{item.label}</div>
          </Link>
        ))}

        <button
          onClick={logout}
          title="Logout"
          style={{
            marginTop: "auto",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.35)",
            borderRadius: 999,
            width: 42,
            height: 42,
            color: "#FFD4D4",
            fontSize: 20,
            cursor: "pointer",
            marginBottom: 14,
          }}
        >
          ⏏
        </button>
      </aside>

      {/* RIGHT CONTENT PANEL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* TOP HEADER */}
        <header
          style={{
            background: BRAND.main,
            height: 76,
            borderBottom: `1px solid rgba(255,255,255,0.18)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 26px",
          }}
        >
          <div
            style={{
              color: BRAND.white,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 0.2,
            }}
          >
            {companyName}
          </div>

          <a
            href="https://safariconnector.com"
            target="_blank"
            rel="noreferrer"
            style={{
              color: BRAND.white,
              border: "1px solid rgba(255,255,255,0.3)",
              padding: "7px 16px",
              borderRadius: 999,
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            Main website →
          </a>
        </header>

        {/* PAGE CONTENT */}
        <main style={{ flex: 1, padding: "28px" }}>{children}</main>

        {/* FOOTER */}
        <footer
          style={{
            background: BRAND.white,
            borderTop: `1px solid ${BRAND.border}`,
            padding: "12px 26px",
            fontSize: 11,
            color: BRAND.textSubtle,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Safari Connector · Operator Workspace</span>
          <Link
            href="/support"
            style={{ color: BRAND.main, fontWeight: 600 }}
          >
            Contact support
          </Link>
        </footer>
      </div>
    </div>
  );
}
