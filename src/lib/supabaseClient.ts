"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Single shared browser client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Backwards compatibility: old code that imports `supabaseBrowser`
export const supabaseBrowser = supabase;
