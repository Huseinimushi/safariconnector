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

const OPENED_ENQUIRIES_KEY = "safariconnector_opened_enquiries";

type OperatorPanelProps = { children: ReactNode };

type OperatorRow = {
  id: string;
  user_id?: string | null;
  company_name?: string | null;
  name?: string | null;
  status?: string | null;
};

const normalizeStatus = (value?: string | null) => (value || "").toLowerCase();

export default function OperatorPanelLayout({ children }: OperatorPanelProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [companyName, setCompanyName] = useState<string>("");
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [operatorId, setOperatorId] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const [enquiriesNewCount, setEnquiriesNewCount] = useState(0);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);
  const [quotesPendingCount, setQuotesPendingCount] = useState(0);
  const [bookingsPendingCount, setBookingsPendingCount] = useState(0);

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Close drawer on navigation (mobile)
  useEffect(() => {
    if (isMobile) setNavOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Load operator profile
  useEffect(() => {
    let alive = true;

    const loadCompany = async () => {
      setLoadingCompany(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes?.user?.id;
        if (!uid) {
          if (alive) {
            setCompanyName("");
            setLoadingCompany(false);
          }
          return;
        }

        let operatorRow: OperatorRow | null = null;

        const { data: opView, error: opViewErr } = await supabase
          .from("operators_view")
          .select("id,user_id,company_name,name,status")
          .eq("user_id", uid)
          .maybeSingle();

        if (!opViewErr && opView) {
          operatorRow = opView as OperatorRow;
        } else {
          const { data: op } = await supabase
            .from("operators")
            .select("id,user_id,company_name,name,status")
            .eq("user_id", uid)
            .maybeSingle();
          if (op) operatorRow = op as OperatorRow;
        }

        if (alive) {
          setCompanyName(operatorRow?.company_name || operatorRow?.name || "");
          setOperatorId(operatorRow?.id || null);
          setLoadingCompany(false);
        }
      } catch {
        if (alive) {
          setCompanyName("");
          setLoadingCompany(false);
        }
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

  // Badge counts
  useEffect(() => {
    if (!operatorId) return;

    const loadCounts = async () => {
      try {
        const openedMap = (() => {
          if (typeof window === "undefined") return {} as Record<string, boolean>;
          try {
            const raw = window.localStorage.getItem(OPENED_ENQUIRIES_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
          } catch {
            return {} as Record<string, boolean>;
          }
        })();

        const [enquiriesRes, inboxRes, quotesRes, bookingsRes] = await Promise.all([
          supabase.from("quote_requests").select("id").eq("operator_id", operatorId),
          supabase.from("operator_inbox_view").select("id,has_unread").eq("operator_id", operatorId),
          supabase.from("operator_quotes").select("id,status").eq("operator_id", operatorId),
          supabase.from("bookings").select("id,status").eq("operator_id", operatorId),
        ]);

        if (!enquiriesRes.error && enquiriesRes.data) {
          const rows = enquiriesRes.data as Array<{ id: number }>;
          const newOnes = rows.filter((r) => !openedMap[String(r.id)]).length;
          setEnquiriesNewCount(newOnes);
        } else {
          setEnquiriesNewCount(0);
        }

        if (!inboxRes.error && inboxRes.data) {
          const rows = inboxRes.data as Array<{ has_unread?: boolean | null }>;
          const unread = rows.filter((r) => !!r.has_unread).length;
          setMessagesUnreadCount(unread);
        } else {
          setMessagesUnreadCount(0);
        }

        if (!quotesRes.error && quotesRes.data) {
          const rows = quotesRes.data as Array<{ status: string | null }>;
          const pending = rows.filter((r) => {
            const s = normalizeStatus(r.status);
            return s === "pending" || s === "draft";
          }).length;
          setQuotesPendingCount(pending);
        } else {
          setQuotesPendingCount(0);
        }

        if (!bookingsRes.error && bookingsRes.data) {
          const rows = bookingsRes.data as Array<{ status: string | null }>;
          const pending = rows.filter((r) => normalizeStatus(r.status) === "pending").length;
          setBookingsPendingCount(pending);
        } else {
          setBookingsPendingCount(0);
        }
      } catch (err) {
        console.warn("operator badge counts error:", err);
        setEnquiriesNewCount(0);
        setMessagesUnreadCount(0);
        setQuotesPendingCount(0);
        setBookingsPendingCount(0);
      }
    };

    loadCounts();
  }, [operatorId]);

  const NAV = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: "D" },
      { href: "/trips", label: "Trips", icon: "T" },
      { href: "/bookings", label: "Bookings", icon: "B" },
      { href: "/enquiries", label: "Enquiries", icon: "E" },
      { href: "/quotes", label: "Quotes", icon: "Q" },
      { href: "/inbox", label: "Messages", icon: "M" },
      { href: "/profile", label: "Profile", icon: "P" },
    ],
    []
  );

  const getBadgeCount = (label: string) => {
    switch (label) {
      case "Enquiries":
        return enquiriesNewCount;
      case "Messages":
        return messagesUnreadCount;
      case "Quotes":
        return quotesPendingCount;
      case "Bookings":
        return bookingsPendingCount;
      default:
        return 0;
    }
  };

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
        const badge = getBadgeCount(item.label);

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
              position: "relative",
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
                fontSize: 16,
                fontWeight: 800,
                border: active ? "2px solid #F9FAFB" : "1px solid rgba(255,255,255,0.35)",
                position: "relative",
              }}
            >
              {item.icon}
              {badge > 0 ? (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 999,
                    background: "#F97316",
                    color: "#FFF",
                    fontSize: 11,
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 5px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  }}
                >
                  {badge}
                </span>
              ) : null}
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
      <div style={{ flex: 1 }} />
      <button
        onClick={handleLogout}
        style={{
          marginBottom: 8,
          background: "rgba(0,0,0,0.16)",
          border: "1px solid rgba(255,255,255,0.35)",
          color: "#FFF",
          borderRadius: 12,
          padding: "8px 10px",
          cursor: "pointer",
          width: "88%",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        Logout
      </button>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", textAlign: "center", padding: "0 6px 6px" }}>
        {loadingCompany ? "Loading operator..." : companyName || "Operator workspace"}
      </div>
    </aside>
  );

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: BRAND.bg,
      }}
    >
      {/* MOBILE BACKDROP */}
      {isMobile ? (
        <div
          onClick={() => setNavOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            opacity: navOpen ? 1 : 0,
            visibility: navOpen ? "visible" : "hidden",
            transition: "opacity 180ms ease, visibility 180ms ease",
            zIndex: 50,
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
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
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
                  Menu
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
                flexWrap: "wrap",
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
                Main website ->
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
            flexWrap: "wrap",
          }}
        >
          <span>Operator workspace</span>
          <span>Safari Connector</span>
        </footer>
      </div>
    </div>
  );
}
