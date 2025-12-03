"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";

const BRAND_GREEN = "#0B6B3A";

export default function TravellerChatPage() {
  const params = useParams();
  const quoteId = params.id as string;

  const [trav, setTrav] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: t } = await supabase
        .from("travellers")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      setTrav(t);

      const { data: msgs } = await supabase
        .from("operator_quote_messages")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);
    };

    load();
  }, [quoteId]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    await supabase.from("operator_quote_messages").insert({
      quote_id: quoteId,
      sender: "traveller",
      traveller_email: trav.email,
      message,
    });

    setMessages([...messages, { sender: "traveller", message }]);
    setMessage("");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Chat with Operator</h2>

      <div style={{ background: "#fff", padding: 15, borderRadius: 8 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              textAlign: m.sender === "traveller" ? "right" : "left",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: 8,
                borderRadius: 8,
                background:
                  m.sender === "traveller" ? BRAND_GREEN : "#E5E7EB",
                color: m.sender === "traveller" ? "#fff" : "#111",
              }}
            >
              {m.message}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 15,
          display: "flex",
          gap: 10,
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write a message..."
          style={{ flex: 1 }}
        />
        <button onClick={sendMessage} style={{ background: BRAND_GREEN, color: "#fff" }}>
          Send
        </button>
      </div>
    </div>
  );
}
