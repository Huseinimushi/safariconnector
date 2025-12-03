"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = "admin@safariconnector.com";

type Props = {
  children: React.ReactNode;
};

export function AdminGuard({ children }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in → send to login
        router.push("/operators/login");
        return;
      }

      const isAdmin = user.email === ADMIN_EMAIL;

      if (!isAdmin) {
        // Logged in but not admin → send to operator dashboard
        router.push("/operators/dashboard");
        return;
      }

      setAllowed(true);
      setChecking(false);
    };

    check();
  }, [router]);

  if (checking) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6B7280",
        }}
      >
        Checking admin access…
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
