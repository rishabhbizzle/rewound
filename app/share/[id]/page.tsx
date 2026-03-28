import { getSupabaseServerClient, VinylRow } from "@/lib/supabase";
import { getVinyl } from "@/lib/store";
import SharePageClient from "./SharePageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchVinyl(id: string): Promise<VinylRow | null> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = getSupabaseServerClient();
      const { data } = await supabase
        .from("vinyls")
        .select("*")
        .eq("id", id)
        .single();
      return data;
    } catch {
      return null;
    }
  }
  return null;
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;

  const vinyl = await fetchVinyl(id);

  if (vinyl) {
    return (
      <SharePageClient
        id={vinyl.id}
        title={vinyl.title}
        artist={vinyl.artist}
        vinylColor={vinyl.vinyl_color}
        coverPhoto={vinyl.photos?.[0]}
      />
    );
  }

  // Fallback: local dev in-memory store
  const local = getVinyl(id);

  return (
    <SharePageClient
      id={id}
      title={local?.title || "Untitled"}
      artist={local?.artist || "Anonymous"}
      vinylColor={local?.vinylColor || "black"}
      coverPhoto={local?.photos?.[0]}
    />
  );
}
