"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  className?: string;        // tutapitisha classes za button uliyonayo sasa
};

export default function TravellerAccountButton({ className }: Props) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user) {
          setIsLoggedIn(false);
          return;
        }

        setIsLoggedIn(true);
      } catch (err) {
        console.error("TravellerAccountButton auth error:", err);
        setIsLoggedIn(false);
      }
    };

    checkUser();
  }, []);

  const handleClick = () => {
    if (isLoggedIn) {
      // ✅ Already logged in → dashboard / profile
      router.push("/traveller/dashboard");
      // ukitaka iwe profile badala ya dashboard:
      // router.push("/traveller/profile");
    } else {
      // ❌ Not logged in → login page
      router.push("/login/traveller");
    }
  };

  const label = isLoggedIn ? "My Account" : "Login as Traveller";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
    >
      {label}
    </button>
  );
}
