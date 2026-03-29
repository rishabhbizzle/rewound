"use client";
import { useRef, useEffect, useCallback } from "react";

interface WaveformProps {
  isPlaying: boolean;
  progress: number;
}

// Generate a pseudo-random but deterministic pattern for each bar
function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export default function Waveform({ isPlaying, progress }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const energyRef = useRef(0);
  const barsRef = useRef<number[]>([]);

  // Generate a fixed bar pattern once
  useEffect(() => {
    barsRef.current = Array.from({ length: 40 }, (_, i) => 0.3 + seededRandom(i) * 0.7);
  }, []);

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

    // Animate energy up when playing, down when paused
    const targetEnergy = isPlaying ? 1 : 0;
    energyRef.current += (targetEnergy - energyRef.current) * 0.1;
    const energy = energyRef.current;

    const bars = barsRef.current;
    const barCount = bars.length;
    const gap = 2.5;
    const barWidth = (w - gap * (barCount - 1)) / barCount;
    const centerY = h / 2;
    const time = Date.now() / 1000;

    for (let i = 0; i < barCount; i++) {
      const baseHeight = bars[i];

      // Add gentle animation when playing
      const wave = isPlaying
        ? Math.sin(time * 3 + i * 0.5) * 0.15 + Math.sin(time * 5 + i * 0.3) * 0.1
        : 0;

      const amplitude = (baseHeight + wave) * energy * 0.8 + 0.08;
      const barHeight = amplitude * h;
      const halfBar = barHeight / 2;

      const x = i * (barWidth + gap);

      // Color: amber for played portion, white/dim for unplayed
      const played = i / barCount < progress;
      const alpha = played
        ? 0.4 + amplitude * 0.5
        : 0.1 + amplitude * 0.1;

      ctx.fillStyle = played
        ? `rgba(217, 169, 89, ${alpha})`
        : `rgba(255, 255, 255, ${alpha})`;

      const radius = barWidth / 2;
      ctx.beginPath();
      ctx.roundRect(x, centerY - halfBar, barWidth, barHeight, radius);
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [isPlaying, progress]);

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
