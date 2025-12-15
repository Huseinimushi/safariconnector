// src/app/auth/login/page.tsx
"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // ✅ FIX: supabaseBrowser is a client object, not a function
  const supabase = supabaseBrowser;

  async function signInMagic() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/confirm` },
    });
    setLoading(false);
    if (error) alert(error.message);
    else alert("Check your email for the login link.");
  }

  async function signUpPassword() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password: pass });
    setLoading(false);
    if (error) alert(error.message);
    else alert("Account created. You can now sign in.");
  }

  async function signInPassword() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    setLoading(false);
    if (error) return alert(error.message);
    router.push("/auth/confirm");
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Sign in to Safari Connector</h1>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          className={`px-2 py-1 border rounded ${
            mode === "magic" ? "bg-gray-100" : ""
          }`}
          onClick={() => setMode("magic")}
        >
          Magic link
        </button>
        <button
          type="button"
          className={`px-2 py-1 border rounded ${
            mode === "password" ? "bg-gray-100" : ""
          }`}
          onClick={() => setMode("password")}
        >
          Email &amp; password
        </button>
      </div>

      <label className="block">
        <div className="text-sm mb-1">Email</div>
        <input
          className="border rounded p-2 w-full"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      {mode === "password" && (
        <label className="block">
          <div className="text-sm mb-1">Password</div>
          <input
            className="border rounded p-2 w-full"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </label>
      )}

      {mode === "magic" ? (
        <button
          type="button"
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          onClick={signInMagic}
          disabled={loading || !email}
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded border disabled:opacity-50"
            onClick={signUpPassword}
            disabled={loading || !email || !pass}
          >
            Sign up
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
            onClick={signInPassword}
            disabled={loading || !email || !pass}
          >
            Sign in
          </button>
        </div>
      )}
    </main>
  );
}
