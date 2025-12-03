"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import React from "react";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/operators/login");
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid #E5E7EB",
        backgroundColor: "#FFFFFF",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      Log out
    </button>
  );
}
