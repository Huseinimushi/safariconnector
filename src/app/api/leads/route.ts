// src/app/api/leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type LeadPayload = {
  source_type?: string;
  source_id?: string;
  operator_id?: string;
  start_date?: string;
  end_date?: string;
  pax?: number;
  notes?: string;
};

async function getSupabaseServerClient() {
  // ✅ In Next.js 16, cookies() can be typed as async (Promise)
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    // Auth
    const { data: userResp, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userResp?.user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const user = userResp.user;

    // Body
    const body = (await req.json().catch(() => ({}))) as LeadPayload;

    const {
      source_type,
      source_id,
      operator_id,
      start_date,
      end_date,
      pax,
      notes,
    } = body;

    if (!source_type || !source_id || !operator_id) {
      return NextResponse.json(
        { error: "Missing source_type, source_id or operator_id." },
        { status: 400 }
      );
    }

    // Insert lead
    // If your schema doesn't have created_by, delete that field.
    const { data, error } = await supabase
      .from("leads")
      .insert([
        {
          source_type,
          source_id,
          operator_id,
          start_date: start_date ?? null,
          end_date: end_date ?? null,
          pax: typeof pax === "number" ? pax : null,
          notes: notes ?? null,
          created_by: user.id,
        },
      ])
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ lead: data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}
