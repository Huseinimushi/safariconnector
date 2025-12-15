"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type Role = "anon" | "traveller" | "operator";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const mountedRef = useRef(true);

  const [role, setRole] = useState<Role>("anon");
  const [hasUser, setHasUser] = useState(false);
  const [isOperator, setIsOperator] = useState(false);

  // -----------------------------
  // Helpers
  // -----------------------------

  const safeSetState = (fn: () => void) => {
    if (!mountedRef.current) return;
    fn();
  };

  const logSupabaseError = (label: string, err: any) => {
    // Supabase/PostgREST errors often have these fields
    console.error(label, {
      message: err?.message,
      details: err?.details,
      hint: err?.hint,
      code: err?.code,
      status: err?.status,
      name: err?.name,
    });
  };

  const determineFromUser = async (user: any | null) => {
    if (!mountedRef.current) return;

    if (!user) {
      safeSetState(() => {
        setRole("anon");
        setHasUser(false);
        setIsOperator(false);
      });
      return;
    }

    safeSetState(() => {
      setHasUser(true);
    });

    // Check operator profile
    try {
      const { data, error } = await supabase
        .from("operators")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (error) {
        const e: any = error;
        const status = e?.status;
        const code = e?.code;

        // Treat "no rows" as NOT operator (common for maybeSingle)
        // Depending on PostgREST versions: status 406 or code PGRST116
        if (status === 406 || code === "PGRST116") {
          safeSetState(() => {
            setIsOperator(false);
            setRole("traveller");
          });
          return;
        }

        // Real error (often RLS/policy)
        logSupabaseError("Nav operators lookup error:", e);

        safeSetState(() => {
          setIsOperator(false);
          setRole("traveller");
        });
        return;
      }

      const op = !!data?.id;

      safeSetState(() => {
        setIsOperator(op);
        setRole(op ? "operator" : "traveller");
      });
    } catch (err: any) {
      logSupabaseError("Nav operators lookup exception:", err);
      safeSetState(() => {
        setIsOperator(false);
        setRole("traveller");
      });
    }
  };

  // -----------------------------
  // Auth bootstrap (run once)
  // -----------------------------
  useEffect(() => {
    mountedRef.current = true;

    const boot = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          logSupabaseError("Nav auth getUser error:", error);
          safeSetState(() => {
            setRole("anon");
            setHasUser(false);
            setIsOperator(false);
          });
          return;
        }

        await determineFromUser(data?.user ?? null);
      } catch (err: any) {
        logSupabaseError("Nav auth bootstrap exception:", err);
        safeSetState(() => {
          setRole("anon");
          setHasUser(false);
          setIsOperator(false);
        });
      }
    };

    boot();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        determineFromUser(session?.user ?? null);
      }
    );

    return () => {
      mountedRef.current = false;
      listener.subscription.unsubscribe();
    };
    // IMPORTANT: do not depend on pathname (avoid re-subscribing every route change)
  }, []);

  // ------------------------------------------------
  // LABELS (as you wanted)
  // ------------------------------------------------
  const travellerLabel = useMemo(() => {
    // logged in and not operator => My Account
    return hasUser && !isOperator ? "My Account" : "Login as Traveller";
  }, [hasUser, isOperator]);

  const operatorLabel = useMemo(() => {
    // operator => My Dashboard
    return isOperator ? "My Dashboard" : "Login as Operator";
  }, [isOperator]);

  // ------------------------------------------------
  // CLICK HANDLERS
  // ------------------------------------------------
  const handleTravellerClick = () => {
    if (hasUser && !isOperator) {
      router.push("/traveller/dashboard");
    } else {
      router.push("/login/traveller");
    }
  };

  const handleOperatorClick = () => {
    if (isOperator) {
      router.push("/operators/dashboard");
    } else {
      router.push("/operators/login");
    }
  };

  // ------------------------------------------------

  return (
    <header className="nav-root">
      {/* TOP BAR */}
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
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>Email: info@safariconnector.com</span>
            <span>Phone: +255 686 032 307</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
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

            <div style={{ display: "flex", gap: 10, fontSize: 14 }}>
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

      {/* MAIN NAV */}
      <div className="nav-inner">
        <div className="nav-brand">
          <Link href="/" aria-label="Safari Connector home">
            <img src="/logo.png" alt="Safari Connector" className="nav-logo" />
          </Link>
        </div>

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
            className={`nav-link${pathname === "/plan" ? " active" : ""}`}
          >
            AI Trip Builder
          </Link>

          <Link
            href="/about"
            className={`nav-link${pathname === "/about" ? " active" : ""}`}
          >
            About
          </Link>
        </nav>

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
