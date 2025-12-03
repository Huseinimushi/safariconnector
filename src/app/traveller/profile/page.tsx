"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const BRAND_GREEN = "#0B6B3A";

export default function TravellerProfilePage() {
  const [trav, setTrav] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data } = await supabase
        .from("travellers")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      setTrav(data);
    };
    load();
  }, []);

  const save = async () => {
    await supabase.from("travellers").update(trav).eq("id", trav.id);
    alert("Saved");
  };

  if (!trav) return "Loading…";

  return (
    <div style={{ padding: 30 }}>
      <h2>Your Profile</h2>

      <label>Name</label>
      <input
        value={trav.full_name}
        onChange={(e) => setTrav({ ...trav, full_name: e.target.value })}
      />

      <label>Phone</label>
      <input
        value={trav.phone}
        onChange={(e) => setTrav({ ...trav, phone: e.target.value })}
      />

      <label>Country</label>
      <input
        value={trav.country}
        onChange={(e) => setTrav({ ...trav, country: e.target.value })}
      />

      <button onClick={save} style={{ background: BRAND_GREEN, color: "#fff" }}>
        Save Changes
      </button>
    </div>
  );
}
