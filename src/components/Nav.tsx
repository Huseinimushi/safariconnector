// src/components/Nav.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { FiUser } from "react-icons/fi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const mountedRef = useRef(true);
  const [hasUser, setHasUser] = useState(false);

  // -----------------------------
  // Auth bootstrap (lightweight)
  // -----------------------------
  useEffect(() => {
    mountedRef.current = true;

    const boot = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mountedRef.current) return;
        setHasUser(!!data?.user);
      } catch {
        if (!mountedRef.current) return;
        setHasUser(false);
      }
    };

    boot();

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
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
    () => (hasUser ? "My Account" : "Traveller"),
    [hasUser]
  );

  const handleTravellerClick = () => {
    router.push(hasUser ? "/traveller/dashboard" : "/login/traveller");
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/trips")
      return pathname === "/trips" || pathname.startsWith("/trips/");
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
      {/* sc-container is global responsive padding */}
      <div className="sc-container">
        {/* sc-row + sc-wrap makes it responsive without changing content */}
        <div
          className="sc-row sc-wrap"
          style={{
            minHeight: 76, // accommodates 70px logo cleanly
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          {/* LEFT: BIG LOGO */}
          <div style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
            <Link href="/" aria-label="Safari Connector home">
              <img
                src="/logo.png"
                alt="Safari Connector"
                style={{
                  height: 70,
                  width: "auto",
                  display: "block",
                  maxWidth: "100%",
                }}
              />
            </Link>
          </div>

          {/* CENTER: NAV LINKS */}
          <nav
            aria-label="Main navigation"
            className="sc-nav-links"
            style={{
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flex: "1 1 auto",
              minWidth: 0,
            }}
          >
            <Link
              href="/trips"
              className={`nav-link${isActive("/trips") ? " active" : ""}`}
            >
              Trips
            </Link>

            <Link
              href="/plan"
              className={`nav-link${isActive("/plan") ? " active" : ""}`}
            >
              AI Trip Builder
            </Link>

            <Link
              href="/about"
              className={`nav-link${isActive("/about") ? " active" : ""}`}
            >
              About
            </Link>
          </nav>

          {/* RIGHT: ICON ACTIONS */}
          <div className="sc-actions">
            {/* Traveller (icon button) */}
            <button
              type="button"
              onClick={handleTravellerClick}
              aria-label={travellerLabel}
              title={travellerLabel}
              style={{
                height: 40,
                width: 40,
                borderRadius: 999,
                border: "1px solid rgba(27,77,62,.35)",
                background: "#ffffff",
                color: "#1B4D3E",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flex: "0 0 auto",
              }}
            >
              <FiUser style={{ fontSize: 18 }} />
            </button>

            {/* Operator (icon button, new tab) */}
            <a
              href="https://operator.safariconnector.com/login"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Login as Operator"
              title="Login as Operator"
              style={{
                height: 40,
                width: 40,
                borderRadius: 999,
                border: "1px solid #1B4D3E",
                background: "#1B4D3E",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                flex: "0 0 auto",
              }}
            >
              <HiOutlineBuildingOffice2 style={{ fontSize: 18 }} />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
