"use client";
import { motion } from "framer-motion";

interface TonearmProps {
  isPlaying: boolean;
  onDrop: () => void;
  audioProgress: number;
  compact?: boolean;
}

export default function Tonearm({
  isPlaying,
  onDrop,
  audioProgress,
  compact = false,
}: TonearmProps) {
  const restAngle = 38;
  const startAngle = 20;
  const endAngle = 5;

  const playAngle = isPlaying
    ? startAngle - audioProgress * (startAngle - endAngle)
    : restAngle;

  if (compact) {
    return (
      <div className="absolute -top-1 -right-1 z-20">
        <div className="relative">
          <div className="absolute top-0 right-3 w-3 h-3 rounded-full bg-zinc-700 border border-zinc-600 z-30 shadow" />
          <motion.div
            className="origin-[calc(100%-0.85rem)_0.4rem]"
            animate={{ rotate: playAngle }}
            transition={
              isPlaying
                ? { type: "spring", stiffness: 40, damping: 15 }
                : { type: "spring", stiffness: 60, damping: 20 }
            }
            onClick={!isPlaying ? onDrop : undefined}
            style={{ cursor: !isPlaying ? "pointer" : "default" }}
          >
            <svg width="80" height="24" viewBox="0 0 80 24" className="drop-shadow">
              <line x1="10" y1="7" x2="64" y2="7" stroke="#666" strokeWidth="2" strokeLinecap="round" />
              <rect x="2" y="3.5" width="11" height="7" rx="1" fill="#555" stroke="#777" strokeWidth="0.4" />
              <rect x="3" y="5" width="4" height="4" rx="0.5" fill="#444" />
              <line x1="4" y1="9" x2="3" y2="14" stroke="#aaa" strokeWidth="0.7" />
              <circle cx="3" cy="14" r="0.7" fill="#ccc" />
              <ellipse cx="70" cy="7" rx="6" ry="4" fill="#555" />
            </svg>
            {!isPlaying && (
              <motion.div
                className="absolute -bottom-5 left-1 text-[9px] text-white/30 whitespace-nowrap font-mono"
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              >
                tap
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute -top-2 -right-2 md:top-0 md:right-0 z-20">
      <div className="relative">
        <div className="absolute top-0 right-8 w-6 h-6 rounded-full bg-zinc-700 border border-zinc-600 z-30 shadow-lg" />
        <motion.div
          className="origin-[calc(100%-2rem)_0.75rem]"
          animate={{ rotate: playAngle }}
          transition={
            isPlaying
              ? { type: "spring", stiffness: 40, damping: 15 }
              : { type: "spring", stiffness: 60, damping: 20 }
          }
          onClick={!isPlaying ? onDrop : undefined}
          style={{ cursor: !isPlaying ? "pointer" : "default" }}
        >
          <svg width="180" height="50" viewBox="0 0 180 50" className="drop-shadow-lg">
            <line x1="20" y1="15" x2="148" y2="15" stroke="#666" strokeWidth="3" strokeLinecap="round" />
            <rect x="4" y="8" width="22" height="14" rx="2" fill="#555" stroke="#777" strokeWidth="0.5" />
            <rect x="6" y="11" width="8" height="8" rx="1" fill="#444" />
            <line x1="8" y1="19" x2="6" y2="28" stroke="#aaa" strokeWidth="1" />
            <circle cx="6" cy="28" r="1" fill="#ccc" />
            <ellipse cx="160" cy="15" rx="12" ry="8" fill="#555" />
            <circle cx="148" cy="15" r="2" fill="#777" />
          </svg>
          {!isPlaying && (
            <motion.div
              className="absolute -bottom-8 left-4 text-xs text-white/40 whitespace-nowrap font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.7, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              tap to drop needle
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
