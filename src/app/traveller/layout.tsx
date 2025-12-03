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

        if (error || !data?.user) {
          // Hakuna user → rudi kwenye traveller login
          router.replace("/login/traveller");
          return;
        }

        const user = data.user;

        const metaRole =
          (user.app_metadata?.role as string | undefined) ||
          (user.user_metadata?.role as string | undefined) ||
          null;

        const isTraveller =
          metaRole && metaRole.toLowerCase() === "traveller";

        if (!isTraveller) {
          router.replace("/login/traveller?error=not_traveller");
          return;
        }

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
        }}
      >
        Checking traveller access…
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
