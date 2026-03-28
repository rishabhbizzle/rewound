"use client";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CelebrationProps {
  trigger: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  delay: number;
  type: "confetti" | "petal" | "spark";
}

const COLORS = [
  "#c8a96e", // gold
  "#d4a056", // amber
  "#e8c88a", // light gold
  "#fff5e0", // cream
  "#ff9f7f", // peach
  "#ffb3b3", // pink
  "#c4b5fd", // lavender
];

export default function Celebration({ trigger }: CelebrationProps) {
  const [show, setShow] = useState(false);
  const [showText, setShowText] = useState(false);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60, // % from left
      y: -10 - Math.random() * 20, // start above screen
      color: COLORS[i % COLORS.length],
      size: 4 + Math.random() * 8,
      rotation: Math.random() * 360,
      velocityX: (Math.random() - 0.5) * 100,
      velocityY: 40 + Math.random() * 60,
      delay: Math.random() * 0.8,
      type: i < 30 ? "confetti" : i < 42 ? "petal" : "spark",
    }));
  }, []);

  useEffect(() => {
    if (!trigger) return;
    setShow(true);
    setTimeout(() => setShowText(true), 400);
    setTimeout(() => setShowText(false), 3500);
    setTimeout(() => setShow(false), 4500);
  }, [trigger]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.type === "petal" ? p.size * 1.5 : p.size,
                backgroundColor: p.color,
                borderRadius:
                  p.type === "petal"
                    ? "50% 0 50% 0"
                    : p.type === "spark"
                      ? "50%"
                      : "2px",
                boxShadow:
                  p.type === "spark"
                    ? `0 0 ${p.size}px ${p.color}`
                    : "none",
              }}
              initial={{
                y: `${p.y}vh`,
                rotate: p.rotation,
                opacity: 1,
                scale: 0,
              }}
              animate={{
                y: "110vh",
                x: p.velocityX,
                rotate: p.rotation + 720,
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 1, 0.5],
              }}
              transition={{
                duration: 2.5 + Math.random(),
                delay: p.delay,
                ease: [0.2, 0, 0.8, 1],
              }}
            />
          ))}

          {/* Flash */}
          <motion.div
            className="absolute inset-0 bg-amber-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 0.6 }}
          />

          {/* "All memories unlocked" text */}
          <AnimatePresence>
            {showText && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <div className="px-6 py-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                  <p className="text-sm font-medium text-amber-200/80 text-center tracking-wide">
                    all memories unlocked
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
