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

  const [hasUser, setHasUser] = useState(false);
  const [isOperator, setIsOperator] = useState(false);

  useEffect(() => {
    let active = true;

    const determineFromUser = async (user: any | null) => {
      if (!active) return;

      if (!user) {
        setHasUser(false);
        setIsOperator(false);
        return;
      }

      setHasUser(true);

      try {
        // 🔍 check kama huyu user ana operator profile
        const { data, error } = await supabase
          .from("operators")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!active) return;

        if (error) {
          console.error("Nav operators lookup error:", error);
          setIsOperator(false);
          return;
        }

        setIsOperator(!!data);
      } catch (err) {
        console.error("Nav operators lookup exception:", err);
        if (active) setIsOperator(false);
      }
    };

    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        await determineFromUser(data?.user ?? null);
      } catch (err) {
        console.error("Nav auth check error:", err);
        if (active) {
          setHasUser(false);
          setIsOperator(false);
        }
      }
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        determineFromUser(session?.user ?? null);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [pathname]);

  // ------------------------------------------------
  // LABELS KWA MANTIKI ULIYOTAKA
  // ------------------------------------------------

  // Kama user ka-login na SI operator → My Account
  // Kama operator au hakuna user → Login as Traveller
  const travellerLabel =
    hasUser && !isOperator ? "My Account" : "Login as Traveller";

  // Kama operator → My Dashboard
  // Wengine wote (traveller au no user) → Login as Operator
  const operatorLabel = isOperator ? "My Dashboard" : "Login as Operator";

  // ------------------------------------------------
  // CLICK HANDLERS
  // ------------------------------------------------

  const handleTravellerClick = () => {
    if (hasUser && !isOperator) {
      // Logged-in non-operator (Traveller / normal user)
      router.push("/traveller/dashboard");
      // ukitaka iwe profile:
      // router.push("/traveller/profile");
    } else {
      // Either not logged in OR ni operator
      router.push("/login/traveller");
    }
  };

  const handleOperatorClick = () => {
    if (isOperator) {
      router.push("/operators/dashboard");
      // au kama dashboard yako ni /operators:
      // router.push("/operators");
    } else {
      router.push("/operators/login");
    }
  };

  // ------------------------------------------------

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
              {/* Traveller Button */}
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

              {/* Operator Button */}
              <button
                type="button"
                onClick={handleOperatorClick}
                className="btn ghost"
                style={{
                  borderColor: "#ffffff",
                  color: "#ffffff",
                  padding: "6px 12px",
                  fontSize: "13px",
                  background: "transparent",
                }}
              >
                {operatorLabel}
              </button>
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
            className={`nav-link${
              pathname === "/trips" || pathname?.startsWith("/trips/")
                ? " active"
                : ""
            }`}
          >
            Browse Trips
          </Link>

          <Link
            href="/tour-operators"
            className={`nav-link${
              pathname === "/tour-operators" ||
              pathname?.startsWith("/tour-operators/") ||
              pathname?.startsWith("/operators")
                ? " active"
                : ""
            }`}
          >
            Tour Operators
          </Link>

          <Link
            href="/plan"
            className={`nav-link${
              pathname === "/plan" ? " active" : ""
            }`}
          >
            AI Trip Builder
          </Link>

          <Link
            href="/about"
            className={`nav-link${
              pathname === "/about" ? " active" : ""
            }`}
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
