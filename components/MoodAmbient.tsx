"use client";
import { useRef, useEffect } from "react";

interface MoodAmbientProps {
  getFrequencyData: () => Uint8Array;
  isPlaying: boolean;
}

export default function MoodAmbient({
  getFrequencyData,
  isPlaying,
}: MoodAmbientProps) {
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const smoothedEnergy = useRef(0);

  useEffect(() => {
    const animate = () => {
      if (!glowRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const freq = getFrequencyData();

      // Calculate overall energy from frequency data
      let sum = 0;
      for (let i = 0; i < freq.length; i++) {
        sum += freq[i];
      }
      const rawEnergy = freq.length > 0 ? sum / (freq.length * 255) : 0;

      // Smooth it so the glow breathes, doesn't flicker
      smoothedEnergy.current +=
        (rawEnergy - smoothedEnergy.current) * 0.08;
      const energy = smoothedEnergy.current;

      if (!isPlaying) {
        // Fade to resting state
        smoothedEnergy.current *= 0.95;
      }

      // Map energy to color:
      //   Low energy  → deep purple / blue  (quiet, intimate)
      //   Mid energy  → warm amber          (conversation)
      //   High energy → bright gold / peach  (loud, emotional)
      const hue = 260 - energy * 220; // 260 (purple) → 40 (amber/gold)
      const saturation = 30 + energy * 40; // 30% → 70%
      const lightness = 4 + energy * 8; // 4% → 12%
      const opacity = 0.3 + energy * 0.5; // 0.3 → 0.8

      glowRef.current.style.background = `radial-gradient(ellipse at 50% 40%, hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity}) 0%, transparent 70%)`;

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getFrequencyData, isPlaying]);

  return (
    <div
      ref={glowRef}
      className="fixed inset-0 pointer-events-none z-0 transition-none"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, hsla(260, 30%, 4%, 0.3) 0%, transparent 70%)",
      }}
    />
  );
}
