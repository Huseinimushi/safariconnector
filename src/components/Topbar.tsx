"use client";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Topbar() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      setEmail(session?.user.email ?? null);
    })();
  }, []);

  async function logout() {
    await supabaseBrowser().auth.signOut();
    location.href = "/auth/login";
  }

  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto p-3 flex items-center justify-between text-sm">
        <div className="flex gap-4">
          <Link href="/">Home</Link>
          <Link href="/plan">Plan</Link>
          <Link href="/operator/leads">Operator Leads</Link>
          <Link href="/operator/quotes">Operator Quotes</Link>
          <Link href="/client/quotes">My Quotes</Link>
        </div>
        <div className="flex items-center gap-3">
          {email ? <span className="text-gray-600">{email}</span> : <Link href="/auth/login">Login</Link>}
          {email && <button onClick={logout} className="px-2 py-1 border rounded">Logout</button>}
        </div>
      </div>
    </header>
  );
}
