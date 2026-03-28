"use client";
import { motion } from "framer-motion";
import Image from "next/image";

interface AlbumSleeveProps {
  title: string;
  artist: string;
  coverPhoto?: string;
  onReveal: () => void;
  isRevealed: boolean;
  firstPlayDate?: string;
}

export default function AlbumSleeve({
  title,
  artist,
  coverPhoto,
  onReveal,
  isRevealed,
  firstPlayDate,
}: AlbumSleeveProps) {
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center"
      animate={isRevealed ? { y: -80, opacity: 0, scale: 0.9 } : {}}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Album sleeve */}
      <motion.div
        className="relative w-[280px] h-[280px] md:w-[360px] md:h-[360px] cursor-pointer group"
        onClick={onReveal}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Sleeve body */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border border-white/5 shadow-2xl overflow-hidden">
          {/* Cover photo */}
          {coverPhoto ? (
            <Image
              src={coverPhoto}
              alt={title}
              fill
              className="object-cover opacity-80"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-950/50 via-zinc-900 to-zinc-950" />
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

          {/* Title & artist */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-xl md:text-2xl font-bold text-white/90 tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-white/50 mt-1 tracking-wide">
              {artist}
            </p>
          </div>

          {/* Vinyl edge peeking out */}
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-[280px] md:h-[340px] rounded-r-full bg-gradient-to-r from-zinc-800 to-[#1a1a1a] border-r border-white/5" />
        </div>

        {/* Seal sticker */}
        {!firstPlayDate && (
          <motion.div
            className="absolute -top-3 -right-3 z-10"
            animate={{ rotate: [0, 2, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg border border-amber-500/30">
              <div className="seal-shine absolute inset-0 rounded-full" />
              <span className="text-[10px] font-bold text-amber-100 text-center leading-tight tracking-wide">
                FOR
                <br />
                YOU
              </span>
            </div>
          </motion.div>
        )}

        {/* First play date */}
        {firstPlayDate && (
          <div className="absolute -top-2 -right-2 z-10 bg-zinc-800/80 backdrop-blur px-3 py-1 rounded-full border border-white/10">
            <span className="text-[10px] text-white/40 font-mono">
              First played {firstPlayDate}
            </span>
          </div>
        )}

        {/* Tap hint */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <motion.p
            className="text-white/30 text-sm font-mono tracking-wider bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            tap to open
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
