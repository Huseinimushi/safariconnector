"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  className?: string;
};

export default function OperatorAccountButton({ className }: Props) {
  const router = useRouter();
  const [isOperator, setIsOperator] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user) {
          setIsOperator(false);
          return;
        }

        const user = data.user;

        const rawRole =
          (user.app_metadata?.role as string | undefined) ||
          (user.user_metadata?.role as string | undefined) ||
          null;

        const normalized = rawRole ? rawRole.toLowerCase() : null;
        setIsOperator(normalized === "operator");
      } catch (err) {
        console.error("OperatorAccountButton auth error:", err);
        setIsOperator(false);
      }
    };

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user;
        if (!user) {
          setIsOperator(false);
          return;
        }

        const rawRole =
          (user.app_metadata?.role as string | undefined) ||
          (user.user_metadata?.role as string | undefined) ||
          null;

        const normalized = rawRole ? rawRole.toLowerCase() : null;
        setIsOperator(normalized === "operator");
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleClick = () => {
    if (isOperator) {
      // ✅ Already operator → dashboard
      router.push("/operators/dashboard");
      // kama dashboard yako ni /operators tu:
      // router.push("/operators");
    } else {
      // ❌ Not operator / not logged in → operator login
      router.push("/operators/login");
    }
  };

  const label = isOperator ? "My Dashboard" : "Login as Operator";

  return (
    <button type="button" onClick={handleClick} className={className}>
      {label}
    </button>
  );
}
