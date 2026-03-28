import { ImageResponse } from "next/og";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let title = "Rewound";
  let artist = "Someone special";

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = getSupabaseServerClient();
      const { data } = await supabase
        .from("vinyls")
        .select("title, artist")
        .eq("id", id)
        .single();
      if (data) {
        title = data.title;
        artist = data.artist;
      }
    } catch {
      // use defaults
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #18181b 0%, #0a0a0a 50%, #18181b 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Vinyl record */}
        <div
          style={{
            width: "280",
            height: "280",
            borderRadius: "50%",
            background: "radial-gradient(circle, #333 0%, #1a1a1a 30%, #111 100%)",
            border: "2px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 80px rgba(0,0,0,0.8)",
            marginBottom: "40",
          }}
        >
          {/* Center label */}
          <div
            style={{
              width: "90",
              height: "90",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #78350f, #451a03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                width: "12",
                height: "12",
                borderRadius: "50%",
                background: "#0a0a0a",
              }}
            />
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "36",
            fontWeight: "bold",
            marginBottom: "8",
          }}
        >
          {title}
        </div>

        {/* Artist */}
        <div
          style={{
            color: "rgba(255,255,255,0.3)",
            fontSize: "20",
            marginBottom: "24",
          }}
        >
          from {artist}
        </div>

        {/* CTA */}
        <div
          style={{
            color: "rgba(200,169,110,0.5)",
            fontSize: "16",
            letterSpacing: "2",
          }}
        >
          SPIN TO LISTEN
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
