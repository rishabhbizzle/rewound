"use client";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import QRCard from "@/components/QRCard";

interface Props {
  id: string;
  title: string;
  artist: string;
  vinylColor: "black" | "red" | "blue" | "clear";
  coverPhoto?: string;
}

export default function SharePageClient({
  id,
  title,
  artist,
  vinylColor,
  coverPhoto,
}: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/v/${id}`
      : `/v/${id}`;

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-zinc-950 via-[#0a0a0a] to-zinc-950 flex flex-col items-center px-4 py-8 overflow-y-auto">
      <motion.div
        className="flex flex-col items-center gap-6 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center">
          <h1 className="text-xl font-bold text-white/80">
            Your vinyl is pressed
          </h1>
          <p className="text-sm text-white/30 mt-1">Share it with someone</p>
        </div>

        <div className="w-full flex gap-2">
          <div className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-sm truncate font-mono">
            {shareUrl}
          </div>
          <button
            className={`px-4 py-2.5 rounded-lg text-sm font-mono transition-all active:scale-95 ${
              copied
                ? "bg-green-500/15 text-green-400/70 border border-green-500/20"
                : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
            }`}
            onClick={copyLink}
          >
            {copied ? "copied" : "copy"}
          </button>
        </div>

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-white/15 font-mono">
            or print a card
          </span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <QRCard
          title={title}
          artist={artist}
          vinylId={id}
          coverPhoto={coverPhoto}
          vinylColor={vinylColor}
        />

        <Link href={`/v/${id}`} className="w-full">
          <button className="w-full py-3 rounded-full bg-white/5 text-white/30 text-sm font-mono border border-white/5 hover:bg-white/8 transition-all active:scale-[0.98]">
            open vinyl player
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
