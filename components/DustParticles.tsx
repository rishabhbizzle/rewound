"use client";
import { useMemo } from "react";

interface Particle {
  id: number;
  left: string;
  size: number;
  delay: string;
  duration: string;
  opacity: number;
}

interface BokehDot {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  color: string;
}

export default function DustParticles() {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      delay: `${Math.random() * 10}s`,
      duration: `${Math.random() * 15 + 10}s`,
      opacity: Math.random() * 0.4 + 0.1,
    }));
  }, []);

  const bokeh = useMemo<BokehDot[]>(() => {
    const colors = [
      "rgba(200, 169, 110, 0.08)",
      "rgba(255, 200, 150, 0.06)",
      "rgba(180, 160, 140, 0.05)",
    ];
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 80 + 40,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 10 + 8}s`,
      color: colors[i % colors.length],
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {/* Dust particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white/60"
          style={{
            left: p.left,
            bottom: "-10px",
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `dustFloat ${p.duration} ${p.delay} infinite linear`,
          }}
        />
      ))}

      {/* Bokeh lights */}
      {bokeh.map((b) => (
        <div
          key={`bokeh-${b.id}`}
          className="absolute rounded-full"
          style={{
            left: b.left,
            top: b.top,
            width: b.size,
            height: b.size,
            background: `radial-gradient(circle, ${b.color}, transparent 70%)`,
            animation: `bokehFloat ${b.duration} ${b.delay} infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}
