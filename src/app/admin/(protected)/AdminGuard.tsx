"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;

    const check = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session;

        // If not logged in, send to admin login
        if (!session) {
          // Keep it simple & deterministic for your current routing
          router.replace("/admin/login");
          return;
        }
      } catch (e) {
        router.replace("/admin/login");
        return;
      } finally {
        if (alive) setChecking(false);
      }
    };

    check();

    return () => {
      alive = false;
    };
  }, [router, pathname]);

  if (checking) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        Checking admin session…
      </div>
    );
  }

  return <>{children}</>;
}
