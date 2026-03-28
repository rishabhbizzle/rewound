import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

// Mark a vinyl as played (increment play_count, set first_played_at)
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();

    // Fetch current state
    const { data: vinyl } = await supabase
      .from("vinyls")
      .select("play_count, first_played_at")
      .eq("id", id)
      .single();

    if (!vinyl) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update play stats
    const updates: Record<string, unknown> = {
      play_count: vinyl.play_count + 1,
    };
    if (!vinyl.first_played_at) {
      updates.first_played_at = new Date().toISOString();
    }

    await supabase.from("vinyls").update(updates).eq("id", id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
