"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const mountedRef = useRef(true);
  const [hasUser, setHasUser] = useState(false);

  // -----------------------------
  // Auth bootstrap (minimal)
  // -----------------------------
  useEffect(() => {
    mountedRef.current = true;

    const boot = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!mountedRef.current) return;

        if (error) {
          setHasUser(false);
          return;
        }

        setHasUser(!!data?.user);
      } catch {
        if (!mountedRef.current) return;
        setHasUser(false);
      }
    };

    boot();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      setHasUser(!!session?.user);
    });

    return () => {
      mountedRef.current = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // -----------------------------
  // Labels + handlers
  // -----------------------------
  const travellerLabel = useMemo(
    () => (hasUser ? "My Account" : "Login as Traveller"),
    [hasUser]
  );

  const handleTravellerClick = () => {
    router.push(hasUser ? "/traveller/dashboard" : "/login/traveller");
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/trips") return pathname === "/trips" || pathname.startsWith("/trips/");
    if (href === "/tour-operators")
      return pathname === "/tour-operators" || pathname.startsWith("/tour-operators/");
    return pathname === href;
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <div
        className="nav-inner"
        style={{
          minHeight: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: "0 16px",
        }}
      >
        {/* LEFT: Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" aria-label="Safari Connector home">
            <img
              src="/logo.png"
              alt="Safari Connector"
              style={{ height: 34, width: "auto", display: "block" }}
            />
          </Link>
        </div>

        {/* CENTER: Links */}
        <nav
          aria-label="Main navigation"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          <Link href="/trips" className={`nav-link${isActive("/trips") ? " active" : ""}`}>
            Browse Trips
          </Link>

          <Link
            href="/tour-operators"
            className={`nav-link${isActive("/tour-operators") ? " active" : ""}`}
          >
            Tour Operators
          </Link>

          <Link href="/plan" className={`nav-link${isActive("/plan") ? " active" : ""}`}>
            AI Trip Builder
          </Link>

          <Link href="/about" className={`nav-link${isActive("/about") ? " active" : ""}`}>
            About
          </Link>
        </nav>

        {/* RIGHT: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Traveller */}
          <button
            type="button"
            onClick={handleTravellerClick}
            style={{
              border: "1px solid rgba(27,77,62,.35)",
              color: "#1B4D3E",
              background: "#ffffff",
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1,
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {travellerLabel}
          </button>

          {/* Operator */}
          <a
            href="https://operator.safariconnector.com/login"
            style={{
              border: "1px solid #1B4D3E",
              color: "#ffffff",
              background: "#1B4D3E",
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Login as Operator
          </a>
        </div>
      </div>
    </header>
  );
}
