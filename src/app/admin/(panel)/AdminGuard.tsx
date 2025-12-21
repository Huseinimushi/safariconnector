"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAILS = ["admin@safariconnector.com"].map((e) => e.toLowerCase());

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const isAdminEmail = (email?: string | null) => {
      const e = (email || "").toLowerCase().trim();
      return !!e && ADMIN_EMAILS.includes(e);
    };

    const goLogin = () => {
      // avoid loop ikiwa tayari uko /admin/login
      if (pathname?.startsWith("/login")) return;
      router.replace("/login");
    };

    const check = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        const user = data?.user;

        if (error || !user || !isAdminEmail(user.email)) {
          if (!alive) return;
          setLoading(false);
          goLogin();
          return;
        }

        if (!alive) return;
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setLoading(false);
        goLogin();
      }
    };

    // initial check
    check();

    // keep in sync with auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, [router, pathname]);

  if (loading) {
    return <div style={{ padding: 40 }}>Checking admin access…</div>;
  }

  return <>{children}</>;
}
