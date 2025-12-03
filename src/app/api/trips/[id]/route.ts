import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> } // Next 16: may be a Promise
) {
  const { id } = await params;
  const supabase = supabaseServer();

  const { data: trip, error } = await supabase
    .from("trips")
    .select("id,title,description,duration,parks,style,price_from,price_to,images,country,rating,reviews,best_months,overview,highlights,includes,excludes,status,operator_id")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!trip)  return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Optional: load itinerary if you have trip_days
  const { data: days } = await supabase
    .from("trip_days")
    .select("day,title,desc")
    .eq("trip_id", id)
    .order("day", { ascending: true });

  return NextResponse.json({ trip, days: days ?? [] });
}
