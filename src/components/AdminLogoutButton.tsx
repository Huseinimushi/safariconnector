"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminLogoutButton() {
  const router = useRouter();

  const logout = async () => {
    try {
      // sign out kutoka Supabase
      await supabase.auth.signOut();
    } catch (err) {
      console.error("admin logout error:", err);
    } finally {
      // rudisha admin kwenye login page
      router.replace("/admin/login");
    }
  };

  return (
    <button
      onClick={logout}
      style={{
        marginTop: 4,
        fontSize: 12,
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid #E1E5ED",
        background: "#ffffff",
        cursor: "pointer",
        color: "#0E2430",
      }}
    >
      Logout
    </button>
  );
}
