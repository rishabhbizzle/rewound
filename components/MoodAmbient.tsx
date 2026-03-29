"use client";
import { useRef, useEffect } from "react";

interface MoodAmbientProps {
  isPlaying: boolean;
}

export default function MoodAmbient({ isPlaying }: MoodAmbientProps) {
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const energy = useRef(0);

  useEffect(() => {
    const animate = () => {
      if (!glowRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Breathe in/out based on play state
      const target = isPlaying ? 0.5 + Math.sin(Date.now() / 2000) * 0.2 : 0;
      energy.current += (target - energy.current) * 0.05;
      const e = energy.current;

      const hue = 260 - e * 220;
      const sat = 30 + e * 40;
      const light = 4 + e * 8;
      const opacity = 0.2 + e * 0.4;

      glowRef.current.style.background = `radial-gradient(ellipse at 50% 40%, hsla(${hue}, ${sat}%, ${light}%, ${opacity}) 0%, transparent 70%)`;

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  return (
    <div
      ref={glowRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: "radial-gradient(ellipse at 50% 40%, hsla(260, 30%, 4%, 0.2) 0%, transparent 70%)",
      }}
    />
  );
}
