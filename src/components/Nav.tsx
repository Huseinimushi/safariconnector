"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { IoSearchOutline } from "react-icons/io5";
import { supabase } from "@/lib/supabaseClient";

const SOCIAL_LINKS = {
  facebook: "https://facebook.com/safariconnector",
  instagram: "https://instagram.com/safariconnector",
  x: "https://x.com/safariconnector",
  tiktok: "https://tiktok.com/@safariconnector",
};

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  // status ya login ya traveller (global Supabase user)
  const [travellerLoggedIn, setTravellerLoggedIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const syncUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (error || !data?.user) {
          setTravellerLoggedIn(false);
        } else {
          setTravellerLoggedIn(true);
        }
      } catch (err) {
        console.error("Nav traveller check error:", err);
        if (isMounted) setTravellerLoggedIn(false);
      }
    };

    // 1) check on mount & on route change
    syncUser();

    // 2) sikiliza mabadiliko ya auth (login/logout) pia
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setTravellerLoggedIn(!!session?.user);
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [pathname]);

  const isActiveExact = (path: string) => pathname === path;
  const isActivePrefix = (prefix: string) =>
    pathname === prefix || pathname?.startsWith(`${prefix}/`);

  const navLinkClass = (active: boolean) =>
    `nav-link${active ? " active" : ""}`;

  const handleTravellerClick = () => {
    if (travellerLoggedIn) {
      // tayari ka-login → mpeleke kwenye account
      router.push("/traveller/dashboard");
      // ukitaka badala yake profile:
      // router.push("/traveller/profile");
    } else {
      // haja-login → mpeleke login
      router.push("/login/traveller");
    }
  };

  const travellerLabel = travellerLoggedIn ? "My Account" : "Login as Traveller";

  return (
    <header className="nav-root">
      {/* TOP BAR (dark green strip) */}
      <div
        style={{
          background: "#1B4D3E",
          color: "#ffffff",
          fontSize: "13px",
        }}
      >
        <div
          className="nav-inner"
          style={{
            padding: "6px 16px",
            justifyContent: "space-between",
          }}
        >
          {/* Left side: email + phone */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>Email: info@safariconnector.com</span>
            <span>Phone: +255 686 032 307</span>
          </div>

          {/* Right side: logins + socials */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              {/* Traveller button – muonekano ule ule */}
              <button
                type="button"
                onClick={handleTravellerClick}
                className="btn ghost"
                style={{
                  borderColor: "#ffffff",
                  color: "#ffffff",
                  padding: "6px 12px",
                  fontSize: "13px",
                  background: "transparent",
                }}
              >
                {travellerLabel}
              </button>

              {/* Operator login unchanged */}
              <Link
                href="/operators/login"
                className="btn ghost"
                style={{
                  borderColor: "#ffffff",
                  color: "#ffffff",
                  padding: "6px 12px",
                  fontSize: "13px",
                }}
              >
                Login as Operator
              </Link>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                fontSize: 14,
              }}
            >
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                style={{ color: "#ffffff" }}
              >
                <FaFacebookF />
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style={{ color: "#ffffff" }}
              >
                <FaInstagram />
              </a>
              <a
                href={SOCIAL_LINKS.x}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                style={{ color: "#ffffff" }}
              >
                <FaXTwitter />
              </a>
              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                style={{ color: "#ffffff" }}
              >
                <FaTiktok />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN NAV BAR */}
      <div className="nav-inner">
        {/* LOGO */}
        <div className="nav-brand">
          <Link href="/" aria-label="Safari Connector home">
            <img
              src="/logo.png"
              alt="Safari Connector"
              className="nav-logo"
            />
          </Link>
        </div>

        {/* CENTER LINKS */}
        <nav className="nav-links">
          <Link
            href="/trips"
            className={navLinkClass(isActivePrefix("/trips"))}
          >
            Browse Trips
          </Link>

          <Link
            href="/tour-operators"
            className={navLinkClass(
              isActivePrefix("/tour-operators") || isActivePrefix("/operators")
            )}
          >
            Tour Operators
          </Link>

          <Link
            href="/plan"
            className={navLinkClass(isActivePrefix("/plan"))}
          >
            AI Trip Builder
          </Link>

          <Link
            href="/about"
            className={navLinkClass(isActiveExact("/about"))}
          >
            About
          </Link>
        </nav>

        {/* RIGHT SIDE: SEARCH */}
        <div className="nav-actions">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(27,77,62,.26)",
              background: "#ffffff",
              minWidth: 180,
            }}
          >
            <IoSearchOutline
              style={{ fontSize: 16, color: "#6b7280", flexShrink: 0 }}
            />
            <input
              type="text"
              placeholder="Search"
              style={{
                border: "none",
                outline: "none",
                fontSize: 13,
                width: "100%",
                background: "transparent",
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
