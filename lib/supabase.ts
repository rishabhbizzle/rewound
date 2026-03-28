import { createClient } from "@supabase/supabase-js";

// Browser client (uses anon key — respects RLS)
export function getSupabaseBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Server client (uses service role — bypasses RLS, for API routes only)
export function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface VinylRow {
  id: string;
  title: string;
  artist: string;
  vinyl_color: "black" | "red" | "blue" | "clear";
  audio_url: string;
  photos: string[];
  note_data: string | null;
  created_at: string;
  play_count: number;
  first_played_at: string | null;
}
