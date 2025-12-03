import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const minDays = Number(searchParams.get("minDays") || 0);
  const maxDays = Number(searchParams.get("maxDays") || 999);
  const style = searchParams.get("style") || "";

  const supabase = supabaseServer();

  // Select the columns you actually have. (Add more later: parks, images, price_from, etc.)
  let query = supabase
    .from("trips")
    .select("id,title,description,duration,parks,style,price_from,price_to,images,status,operator_id");

  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (minDays > 0) query = query.gte("duration", minDays);
  if (maxDays < 999) query = query.lte("duration", maxDays);
  if (style) query = query.eq("style", style);

  const { data, error } = await query.order("title", { ascending: true }).limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trips: data ?? [] });
}
