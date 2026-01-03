// src/components/Nav.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { FiUser, FiMenu, FiX } from "react-icons/fi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import styles from "./Nav.module.css";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const mountedRef = useRef(true);
  const [hasUser, setHasUser] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const travellerLabel = useMemo(
    () => (hasUser ? "My Account" : "Traveller"),
    [hasUser]
  );

  const handleTravellerClick = () => {
    setMobileOpen(false);
    router.push(hasUser ? "/traveller/dashboard" : "/login/traveller");
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/trips")
      return pathname === "/trips" || pathname.startsWith("/trips/");
    return pathname === href;
  };

  const navLinks = [
    { href: "/trips", label: "Trips" },
    { href: "/plan", label: "AI Trip Builder" },
    { href: "/about", label: "About" },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.topbar} aria-hidden="true">
        <div className={styles.topLeft}></div>
        <div className={styles.topRight}></div>
      </div>

      <div className={styles.navbar}>
        <div className={styles.logoArea}>
          <Link href="/" aria-label="Safari Connector home" className={styles.logoLink}>
            <img src="/logo.png" alt="Safari Connector" className={styles.logoImage} />
          </Link>
        </div>

        <nav className={styles.navCenter} aria-label="Main navigation">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={isActive(l.href) ? `${styles.navLink} ${styles.active}` : styles.navLink}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className={styles.rightTools}>
          <button
            type="button"
            onClick={handleTravellerClick}
            aria-label={travellerLabel}
            title={travellerLabel}
            className={styles.iconBtn}
          >
            <FiUser />
          </button>

          <a
            href="https://operator.safariconnector.com/login"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Login as Operator"
            title="Login as Operator"
            className={styles.operatorBtn}
          >
            <HiOutlineBuildingOffice2 />
          </a>

          <button
            className={styles.mobileToggle}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((s) => !s)}
          >
            {mobileOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={mobileOpen ? styles.mobileMenuOpen : styles.mobileMenu}>
        <div className={styles.mobileMenuInner}>
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={styles.mobileLink}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}

          <button className={styles.mobileAction} onClick={handleTravellerClick}>
            {travellerLabel}
          </button>
        </div>
      </div>
    </header>
  );
}
