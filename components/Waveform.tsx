"use client";
import { useRef, useEffect, useCallback } from "react";

interface WaveformProps {
  getFrequencyData: () => Uint8Array;
  isPlaying: boolean;
  progress: number;
}

export default function Waveform({
  getFrequencyData,
  isPlaying,
  progress,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    const freq = getFrequencyData();
    const barCount = 40;
    const gap = 2.5;
    const barWidth = (w - gap * (barCount - 1)) / barCount;
    const centerY = h / 2;

    for (let i = 0; i < barCount; i++) {
      // Map bar index to frequency bin
      const binIndex = Math.floor((i / barCount) * freq.length);
      const value = freq[binIndex] / 255;

      // Min height so bars are always visible
      const amplitude = isPlaying ? Math.max(0.08, value) : 0.08;
      const barHeight = amplitude * (h * 0.8);
      const halfBar = barHeight / 2;

      const x = i * (barWidth + gap);

      // Color: amber glow, brighter in the played region
      const played = i / barCount < progress;
      const alpha = played
        ? 0.5 + value * 0.5
        : 0.12 + value * 0.15;

      ctx.fillStyle = played
        ? `rgba(217, 169, 89, ${alpha})`
        : `rgba(255, 255, 255, ${alpha})`;

      // Rounded bars — draw as rounded rects
      const radius = barWidth / 2;
      ctx.beginPath();
      ctx.roundRect(x, centerY - halfBar, barWidth, barHeight, radius);
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [getFrequencyData, isPlaying, progress]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
