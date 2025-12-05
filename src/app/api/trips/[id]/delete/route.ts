import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function DELETE(req: Request, { params }: any) {
  const { id } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Delete trip but only if operator_id = auth.uid()
  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", id)
    .eq("operator_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
