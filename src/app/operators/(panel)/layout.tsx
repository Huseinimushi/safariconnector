// src/app/operators/(panel)/layout.tsx
"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BRAND = {
  bg: "#F4F3ED",
  shell: "#10352A",
  sidebar: "#1B4D3E",
  panel: "#FFFFFF",
  borderSoft: "#E1E5ED",
  borderSubtle: "#CBD5E1",
  primaryDark: "#064E3B",
  subtle: "#9CA3AF",
  muted: "#6B7280",
};

type OperatorPanelProps = {
  children: ReactNode;
};

export default function OperatorPanelLayout({ children }: OperatorPanelProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;

      if (!uid) {
        setCompanyName(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("operators_view")
        .select("company_name")
        .eq("user_id", uid)
        .maybeSingle();

      if (alive) {
        setCompanyName(data?.company_name ?? null);
        setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const handleLogout = async () => {
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

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: BRAND.bg }}>
      {/* SIDEBAR */}
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
        }}
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
                  border: active
                    ? "2px solid #F9FAFB"
                    : "1px solid rgba(255,255,255,0.35)",
                }}
              >
                {item.icon}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: active ? "#FFF" : "#D1D5DB",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {item.label}
              </div>
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          title="Logout"
          style={{
            marginTop: "auto",
            width: 40,
            height: 40,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.3)",
            color: "#FCA5A5",
            background: "transparent",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ⏏
        </button>
      </aside>

      {/* SHELL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* TOP HEADER — simplified */}
        <header
          style={{
            background: BRAND.panel,
            borderBottom: `1px solid ${BRAND.borderSoft}`,
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 26px",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: BRAND.primaryDark,
            }}
          >
            {loading ? "Loading..." : companyName ?? "Your Company"}
          </div>

          <div
            style={{
              fontSize: 13,
              color: BRAND.subtle,
              fontWeight: 500,
            }}
          >
            Manage trips, quotes & bookings
          </div>
        </header>

        {/* CONTENT */}
        <main
          style={{
            flex: 1,
            padding: "26px 28px 32px",
          }}
        >
          {children}
        </main>

        {/* FOOTER */}
        <footer
          style={{
            borderTop: `1px solid ${BRAND.borderSoft}`,
            background: BRAND.panel,
            padding: "10px 24px",
            fontSize: 11,
            color: BRAND.subtle,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Operator workspace</span>
          <span>
            Need help?{" "}
            <Link
              href="/support"
              style={{ color: BRAND.primaryDark, fontWeight: 600 }}
            >
              Contact
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
