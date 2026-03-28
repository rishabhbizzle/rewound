"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import DustParticles from "@/components/DustParticles";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-zinc-950 via-[#0a0a0a] to-zinc-950 flex flex-col items-center justify-center relative overflow-hidden px-6">
      <DustParticles />

      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-amber-900/8 rounded-full blur-[100px] pointer-events-none" />

      {/* Content */}
      <motion.div
        className="relative z-20 flex flex-col items-center text-center max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Vinyl icon */}
        <motion.div
          className="mb-6 relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-20 h-20 rounded-full bg-[#1a1a1a] border border-white/10 shadow-2xl flex items-center justify-center">
            <div className="vinyl-grooves absolute inset-0 rounded-full" />
            <div className="vinyl-sheen absolute inset-0 rounded-full" />
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-900 to-amber-950 border border-white/10 flex items-center justify-center z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a]" />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white/90 mb-3">
          rewound
        </h1>

        <p className="text-base md:text-lg text-white/30 mb-2 leading-relaxed">
          Press your voice onto wax.
          <br />
          Send it to someone special.
        </p>

        <p className="text-xs md:text-sm text-white/15 mb-8 max-w-[260px]">
          Record a voice note, add photos, and share a vinyl they spin to hear.
        </p>

        {/* CTA */}
        <Link href="/create">
          <motion.button
            className="px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-700/50 to-amber-600/30 text-amber-100 font-semibold text-base hover:from-amber-700/70 hover:to-amber-600/50 transition-all border border-amber-500/20 shadow-lg shadow-amber-900/10 active:scale-95"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
          >
            Create a Vinyl
          </motion.button>
        </Link>

        {/* Features hint */}
        <motion.div
          className="mt-12 flex gap-4 md:gap-8 text-white/15 text-[10px] md:text-xs font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <span>record</span>
          <span>·</span>
          <span>customize</span>
          <span>·</span>
          <span>share</span>
          <span>·</span>
          <span>spin</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
