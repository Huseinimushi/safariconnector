import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Next 16: params ni Promise, kwa hiyo tuna-await
  const { id } = await context.params;
  const tripId = id;

  // 1. Angalia kama kuna enquiries kwa hii trip
  const { count, error: quoteErr } = await supabase
    .from("operator_quotes")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId);

  if (quoteErr) {
    return NextResponse.json(
      { success: false, error: quoteErr.message },
      { status: 500 }
    );
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          "This trip already has enquiries. Only an admin can delete it.",
      },
      { status: 400 }
    );
  }

  // 2. Kama hakuna enquiries, endelea kufuta
  const { error: deleteErr } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId);

  if (deleteErr) {
    return NextResponse.json(
      { success: false, error: deleteErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
