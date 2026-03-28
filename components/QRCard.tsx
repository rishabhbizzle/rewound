"use client";
import { useRef, useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCardProps {
  title: string;
  artist: string;
  vinylId: string;
  coverPhoto?: string;
  vinylColor: "black" | "red" | "blue" | "clear";
}

const CARD_W = 900;
const CARD_H = 540;
const R = 20; // card corner radius

const VINYL_COLORS: Record<string, string> = {
  black: "#1a1a1a",
  red: "#3d0000",
  blue: "#000033",
  clear: "#3c3c3c",
};

// Load image from any src (blob, data, http) — skip crossOrigin for blobs
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for http URLs, not blob: or data:
    if (src.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

// Draw image covering a box (object-fit: cover) handling any aspect ratio
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgAspect = img.width / img.height;
  const boxAspect = w / h;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;

  if (imgAspect > boxAspect) {
    // Image is wider — crop sides
    sw = img.height * boxAspect;
    sx = (img.width - sw) / 2;
  } else {
    // Image is taller — crop top/bottom
    sh = img.width / boxAspect;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Shared dark card background
function drawCardBg(ctx: CanvasRenderingContext2D) {
  // Dark gradient
  const grad = ctx.createLinearGradient(0, 0, 0, CARD_H);
  grad.addColorStop(0, "#111111");
  grad.addColorStop(0.5, "#0a0a0a");
  grad.addColorStop(1, "#111111");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, CARD_W, CARD_H, R);
  ctx.fill();

  // Subtle grain
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.015})`;
    ctx.fillRect(Math.random() * CARD_W, Math.random() * CARD_H, 1, 1);
  }

  // Border
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, CARD_W - 1, CARD_H - 1, R);
  ctx.stroke();
}

export default function QRCard({
  title,
  artist,
  vinylId,
  coverPhoto,
  vinylColor,
}: QRCardProps) {
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/v/${vinylId}`
      : `/v/${vinylId}`;

  // ─── FRONT ───
  const drawFront = useCallback(
    async (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = CARD_W;
      canvas.height = CARD_H;

      drawCardBg(ctx);

      // Cover photo — left half, full bleed with rounded corners
      const photoX = 30;
      const photoY = 30;
      const photoW = CARD_W / 2 - 50;
      const photoH = CARD_H - 60;

      if (coverPhoto) {
        try {
          const img = await loadImage(coverPhoto);

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(photoX, photoY, photoW, photoH, 14);
          ctx.clip();
          drawCover(ctx, img, photoX, photoY, photoW, photoH);
          ctx.restore();

          // Subtle inner shadow on photo
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(photoX, photoY, photoW, photoH, 14);
          ctx.clip();
          const innerShadow = ctx.createLinearGradient(photoX, photoY, photoX, photoY + photoH);
          innerShadow.addColorStop(0, "rgba(0,0,0,0.15)");
          innerShadow.addColorStop(0.15, "transparent");
          innerShadow.addColorStop(0.85, "transparent");
          innerShadow.addColorStop(1, "rgba(0,0,0,0.2)");
          ctx.fillStyle = innerShadow;
          ctx.fillRect(photoX, photoY, photoW, photoH);
          ctx.restore();

          // Photo border
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(photoX, photoY, photoW, photoH, 14);
          ctx.stroke();
        } catch {
          // Fallback — dark gradient placeholder
          const fallGrad = ctx.createLinearGradient(photoX, photoY, photoX + photoW, photoY + photoH);
          fallGrad.addColorStop(0, "#1a1510");
          fallGrad.addColorStop(1, "#0d0d0d");
          ctx.fillStyle = fallGrad;
          ctx.beginPath();
          ctx.roundRect(photoX, photoY, photoW, photoH, 14);
          ctx.fill();

          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.font = "13px monospace";
          ctx.textAlign = "center";
          ctx.fillText("no cover", photoX + photoW / 2, photoY + photoH / 2);
        }
      } else {
        // No photo provided — amber gradient placeholder
        const noPhotoGrad = ctx.createLinearGradient(photoX, photoY, photoX + photoW, photoY + photoH);
        noPhotoGrad.addColorStop(0, "#1a1510");
        noPhotoGrad.addColorStop(1, "#0d0d0d");
        ctx.fillStyle = noPhotoGrad;
        ctx.beginPath();
        ctx.roundRect(photoX, photoY, photoW, photoH, 14);
        ctx.fill();
      }

      // ── Right side ──
      const rightCenterX = CARD_W / 2 + (CARD_W / 2) / 2;

      // Vinyl record
      const vinylR = 75;
      const vinylY = 150;
      const vColor = VINYL_COLORS[vinylColor] || "#1a1a1a";

      // Glow behind vinyl
      const glow = ctx.createRadialGradient(rightCenterX, vinylY, 0, rightCenterX, vinylY, vinylR + 30);
      glow.addColorStop(0, "rgba(200,169,110,0.06)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(rightCenterX - vinylR - 30, vinylY - vinylR - 30, (vinylR + 30) * 2, (vinylR + 30) * 2);

      // Vinyl disc
      ctx.beginPath();
      ctx.arc(rightCenterX, vinylY, vinylR, 0, Math.PI * 2);
      ctx.fillStyle = vColor;
      ctx.fill();

      // Grooves
      for (let r = 28; r < vinylR; r += 3.5) {
        ctx.beginPath();
        ctx.arc(rightCenterX, vinylY, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.035)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Sheen
      ctx.save();
      ctx.beginPath();
      ctx.arc(rightCenterX, vinylY, vinylR, 0, Math.PI * 2);
      ctx.clip();
      const sheen = ctx.createLinearGradient(
        rightCenterX - vinylR, vinylY - vinylR,
        rightCenterX + vinylR, vinylY + vinylR
      );
      sheen.addColorStop(0, "transparent");
      sheen.addColorStop(0.4, "rgba(255,255,255,0.03)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0.06)");
      sheen.addColorStop(0.6, "rgba(255,255,255,0.03)");
      sheen.addColorStop(1, "transparent");
      ctx.fillStyle = sheen;
      ctx.fillRect(rightCenterX - vinylR, vinylY - vinylR, vinylR * 2, vinylR * 2);
      ctx.restore();

      // Center label
      ctx.beginPath();
      ctx.arc(rightCenterX, vinylY, 22, 0, Math.PI * 2);
      const label = ctx.createRadialGradient(rightCenterX, vinylY, 0, rightCenterX, vinylY, 22);
      label.addColorStop(0, "#8b6914");
      label.addColorStop(1, "#4a3008");
      ctx.fillStyle = label;
      ctx.fill();

      // Spinhole
      ctx.beginPath();
      ctx.arc(rightCenterX, vinylY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = vColor;
      ctx.fill();

      // Vinyl rim
      ctx.beginPath();
      ctx.arc(rightCenterX, vinylY, vinylR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Title
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.font = "bold 26px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      // Smart truncate
      let displayTitle = title;
      while (ctx.measureText(displayTitle).width > CARD_W / 2 - 80 && displayTitle.length > 3) {
        displayTitle = displayTitle.slice(0, -1);
      }
      if (displayTitle !== title) displayTitle += "...";
      ctx.fillText(displayTitle, rightCenterX, vinylY + vinylR + 45);

      // Artist
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "15px -apple-system, system-ui, sans-serif";
      ctx.fillText(artist, rightCenterX, vinylY + vinylR + 72);

      // Tagline
      ctx.fillStyle = "rgba(200,169,110,0.35)";
      ctx.font = "10px monospace";
      ctx.fillText("SPIN TO LISTEN", rightCenterX, CARD_H - 50);

      // Brand
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.font = "9px monospace";
      ctx.fillText("rewound", rightCenterX, CARD_H - 30);
    },
    [title, artist, coverPhoto, vinylColor]
  );

  // ─── BACK — dark theme with QR ───
  const drawBack = useCallback(
    async (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = CARD_W;
      canvas.height = CARD_H;

      drawCardBg(ctx);

      // Ambient glow behind QR
      const centerX = CARD_W / 2;
      const glowGrad = ctx.createRadialGradient(centerX, 200, 0, centerX, 200, 200);
      glowGrad.addColorStop(0, "rgba(200,169,110,0.06)");
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      // QR Code — dark bg, amber dots
      try {
        const qrDataUrl = await QRCode.toDataURL(shareUrl, {
          width: 300,
          margin: 2,
          color: { dark: "#c8a96e", light: "#00000000" },
          errorCorrectionLevel: "M",
        });

        const qrImg = await loadImage(qrDataUrl);

        const qrSize = 200;
        const qrX = (CARD_W - qrSize) / 2;
        const qrY = 60;

        // QR container with border
        ctx.strokeStyle = "rgba(200,169,110,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 16);
        ctx.stroke();

        // Inner subtle bg
        ctx.fillStyle = "rgba(255,255,255,0.02)";
        ctx.beginPath();
        ctx.roundRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 16);
        ctx.fill();

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      } catch {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.font = "14px monospace";
        ctx.textAlign = "center";
        ctx.fillText("QR code unavailable", centerX, CARD_H / 2);
      }

      // "Scan to listen"
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "bold 20px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Scan to listen", centerX, 340);

      // URL
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "11px monospace";
      ctx.fillText(shareUrl, centerX, 370);

      // Decorative line
      ctx.strokeStyle = "rgba(200,169,110,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 120, 400);
      ctx.lineTo(centerX + 120, 400);
      ctx.stroke();

      // Instructions
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.font = "11px -apple-system, system-ui, sans-serif";
      ctx.fillText("print, fold in half, give to someone special", centerX, 435);

      // Brand
      ctx.fillStyle = "rgba(200,169,110,0.15)";
      ctx.font = "10px monospace";
      ctx.fillText("rewound", centerX, CARD_H - 30);
    },
    [shareUrl]
  );

  useEffect(() => {
    const render = async () => {
      if (frontCanvasRef.current) await drawFront(frontCanvasRef.current);
      if (backCanvasRef.current) await drawBack(backCanvasRef.current);
      setReady(true);
    };
    render();
  }, [drawFront, drawBack]);

  const downloadCard = useCallback(
    (side: "front" | "back") => {
      const canvas =
        side === "front" ? frontCanvasRef.current : backCanvasRef.current;
      if (!canvas) return;

      const link = document.createElement("a");
      link.download = `vinyl-${vinylId}-${side}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    },
    [vinylId]
  );

  const downloadBoth = useCallback(() => {
    downloadCard("front");
    setTimeout(() => downloadCard("back"), 500);
  }, [downloadCard]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Front */}
      <div className="w-full max-w-[360px]">
        <p className="text-[10px] font-mono text-white/20 mb-1.5 text-center">
          front
        </p>
        <canvas
          ref={frontCanvasRef}
          className="w-full rounded-xl shadow-lg shadow-black/40"
          style={{ aspectRatio: `${CARD_W}/${CARD_H}` }}
        />
      </div>

      {/* Back */}
      <div className="w-full max-w-[360px]">
        <p className="text-[10px] font-mono text-white/20 mb-1.5 text-center">
          back
        </p>
        <canvas
          ref={backCanvasRef}
          className="w-full rounded-xl shadow-lg shadow-black/40"
          style={{ aspectRatio: `${CARD_W}/${CARD_H}` }}
        />
      </div>

      {ready && (
        <div className="flex gap-2">
          <button
            className="px-5 py-2.5 rounded-full bg-white/5 text-white/40 text-xs font-mono border border-white/5 hover:bg-white/10 transition-all active:scale-95"
            onClick={() => downloadCard("front")}
          >
            save front
          </button>
          <button
            className="px-5 py-2.5 rounded-full bg-white/5 text-white/40 text-xs font-mono border border-white/5 hover:bg-white/10 transition-all active:scale-95"
            onClick={() => downloadCard("back")}
          >
            save back
          </button>
          <button
            className="px-5 py-2.5 rounded-full bg-amber-700/30 text-amber-200/60 text-xs font-mono border border-amber-500/20 hover:bg-amber-700/50 transition-all active:scale-95"
            onClick={downloadBoth}
          >
            save both
          </button>
        </div>
      )}

      <p className="text-[10px] text-white/15 text-center max-w-[260px]">
        print both sides, fold in half — your own physical vinyl card
      </p>
    </div>
  );
}
