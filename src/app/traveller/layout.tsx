"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  children: ReactNode;
};

export default function TravellerLayout({ children }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!isMounted) return;

        // ❌ Kama kuna error au hakuna user → rudi traveller login
        if (error || !data?.user) {
          router.replace("/login/traveller");
          return;
        }

        // ✅ User yupo, hatu-check role tena
        setAllowed(true);
      } catch (err) {
        console.error("traveller layout auth error:", err);
        router.replace("/login/traveller");
      } finally {
        if (isMounted) setChecking(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#F4F3ED",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#4b5563",
          padding: "0 16px",
          textAlign: "center",
        }}
      >
        Checking traveller access…
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <div style={{ minWidth: 0, width: "100%", overflowX: "hidden" }}>
      {children}
    </div>
  );
}
