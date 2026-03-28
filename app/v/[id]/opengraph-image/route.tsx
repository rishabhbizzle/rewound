import { ImageResponse } from "next/og";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let title = "Someone sent you something";
  let artist = "";
  let hasPhoto = false;
  let photoUrl = "";

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = getSupabaseServerClient();
      const { data } = await supabase
        .from("vinyls")
        .select("title, artist, photos")
        .eq("id", id)
        .single();
      if (data) {
        title = data.title;
        artist = data.artist;
        if (data.photos?.[0]) {
          hasPhoto = true;
          photoUrl = data.photos[0];
        }
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
          background: "linear-gradient(135deg, #0f0f0f 0%, #0a0a0a 50%, #111 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600",
            height: "600",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200,169,110,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Left side — photo or vinyl */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "500",
            height: "630",
            position: "relative",
          }}
        >
          {hasPhoto ? (
            <div
              style={{
                width: "320",
                height: "420",
                borderRadius: "20",
                overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt=""
                width={320}
                height={420}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            </div>
          ) : (
            /* Vinyl record when no photo */
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
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
              }}
            >
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
                    width: "14",
                    height: "14",
                    borderRadius: "50%",
                    background: "#0a0a0a",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right side — text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: "700",
            height: "630",
            paddingRight: "80",
          }}
        >
          {/* Title */}
          <div
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "48",
              fontWeight: "bold",
              lineHeight: "1.2",
              marginBottom: "12",
              maxWidth: "550",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>

          {/* Artist */}
          {artist && (
            <div
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: "24",
                marginBottom: "40",
              }}
            >
              from {artist}
            </div>
          )}

          {/* CTA pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12",
              background: "rgba(200,169,110,0.1)",
              border: "1px solid rgba(200,169,110,0.2)",
              borderRadius: "100",
              padding: "12 24",
              width: "fit-content",
            }}
          >
            {/* Play icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(200,169,110,0.7)">
              <path d="M8 5v14l11-7z" />
            </svg>
            <div
              style={{
                color: "rgba(200,169,110,0.7)",
                fontSize: "18",
                fontWeight: 500,
                letterSpacing: "1",
              }}
            >
              Spin to listen
            </div>
          </div>

          {/* Brand */}
          <div
            style={{
              color: "rgba(255,255,255,0.1)",
              fontSize: "14",
              marginTop: "40",
              letterSpacing: "2",
            }}
          >
            rewound
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
