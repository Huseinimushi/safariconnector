"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1️⃣ Get current logged in user on first load
    const getInitialUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (error) {
          console.warn("supabase.auth.getUser error:", error.message);
        }

        setUser(data?.user ?? null);
      } catch (err) {
        console.error("getUser failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    getInitialUser();

    // 2️⃣ Listen to login/logout changes globally
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
