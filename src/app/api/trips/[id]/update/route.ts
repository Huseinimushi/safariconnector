import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: any) {
  const { id } = params;
  const body = await req.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("trips")
    .update(body)
    .eq("id", id)
    .eq("operator_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
