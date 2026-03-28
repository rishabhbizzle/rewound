import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

export async function GET() {
  // Read the vinyl image from public folder
  const imageData = await readFile(join(process.cwd(), "public/og-image.png"));
  const base64 = `data:image/png;base64,${imageData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          display: "flex",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background vinyl image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={base64}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Text overlay — bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: "50",
            left: "60",
            display: "flex",
            flexDirection: "column",
            gap: "8",
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "52",
              fontWeight: "bold",
              letterSpacing: "-1",
            }}
          >
            rewound
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: "22",
            }}
          >
            Press your voice onto wax. Spin to listen.
          </div>
        </div>

        {/* Subtle CTA — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: "60",
            right: "60",
            display: "flex",
            alignItems: "center",
            gap: "8",
            background: "rgba(200,169,110,0.12)",
            border: "1px solid rgba(200,169,110,0.25)",
            borderRadius: "100",
            padding: "10px 24px",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="rgba(200,169,110,0.8)"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <div
            style={{
              color: "rgba(200,169,110,0.8)",
              fontSize: "16",
              fontWeight: 500,
            }}
          >
            Create a vinyl
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
