"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TravellerAIPlans() {
  // 🔧 FIX: specify type instead of []
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setPlans([]);
        return;
      }

      const { data, error } = await supabase
        .from("ai_trip_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("ai_trip_plans load error:", error);
        setPlans([]);
        return;
      }

      setPlans(data || []);
    };

    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Your AI Trip Plans</h2>

      {plans.length === 0 && (
        <p style={{ fontSize: 14, color: "#6B7280" }}>
          You don&apos;t have any AI-generated plans yet.
        </p>
      )}

      {plans.map((p) => (
        <div
          key={p.id}
          style={{
            padding: 15,
            background: "#fff",
            marginBottom: 12,
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
          }}
        >
          <h4 style={{ margin: 0, marginBottom: 4 }}>{p.title}</h4>
          <p style={{ margin: 0, fontSize: 14, color: "#4B5563" }}>
            {p.summary}
          </p>
        </div>
      ))}
    </div>
  );
}
