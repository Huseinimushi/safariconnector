"use client";

// Re-export the single cookie-based browser client.
// This prevents accidental use of the legacy localStorage client.
export { supabase, supabaseBrowser } from "@/lib/supabaseClient";
