"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import VinylRecord from "./VinylRecord";
import Tonearm from "./Tonearm";
import AlbumSleeve from "./AlbumSleeve";
import DustParticles from "./DustParticles";
import PhotoGallery from "./PhotoGallery";
import Waveform from "./Waveform";
import Celebration from "./Celebration";
import MoodAmbient from "./MoodAmbient";
import HandwrittenNote from "./HandwrittenNote";
import Link from "next/link";
import { useVinylSpin } from "@/hooks/useVinylSpin";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useHaptics } from "@/hooks/useHaptics";

type PlayerStage = "sleeve" | "turntable" | "playing";

interface VinylPlayerProps {
  title: string;
  artist: string;
  vinylColor: "black" | "red" | "blue" | "clear";
  audioUrl: string | null;
  photos: string[];
  firstPlayedAt?: string | null;
  noteData?: string | null;
}

export default function VinylPlayer({
  title,
  artist,
  vinylColor,
  audioUrl,
  photos,
  firstPlayedAt,
  noteData,
}: VinylPlayerProps) {
  const [stage, setStage] = useState<PlayerStage>("sleeve");
  const [needleDropped, setNeedleDropped] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteUnlocked, setNoteUnlocked] = useState(false);
  const celebratedRef = useRef(false);
  const lastPhotoRef = useRef(-1);

  const spinEnabled = stage === "playing" && needleDropped;
  const {
    recordRef,
    rotation,
    playbackRate,
    isMoving,
    isReversing,
    autoplay,
    setAutoplay,
    pointerHandlers,
  } = useVinylSpin(spinEnabled);

  const audio = useAudioEngine();
  const haptics = useHaptics();

  // Simple: spinning forward = play, anything else = pause
  useEffect(() => {
    if (!needleDropped) return;

    if (isMoving && !isReversing) {
      audio.play();
      audio.setPlaybackRate(playbackRate);
      audio.setScratchVolume(0);
    } else if (isReversing) {
      audio.pause();
      audio.setScratchVolume(0.5);
    } else {
      audio.pause();
      audio.setScratchVolume(0);
    }
  }, [isMoving, isReversing, playbackRate, needleDropped, audio]);

  // Photo reveal
  useEffect(() => {
    if (photos.length === 0 || !needleDropped) return;
    const idx = Math.min(Math.floor(audio.progress * photos.length), photos.length - 1);
    if (idx !== lastPhotoRef.current) {
      lastPhotoRef.current = idx;
      haptics.photoReveal(idx);
    }
  }, [audio.progress, photos.length, needleDropped, haptics]);

  // Celebration
  useEffect(() => {
    if (audio.progress >= 0.95 && !celebratedRef.current && needleDropped) {
      celebratedRef.current = true;
      setCelebrate(true);
      haptics.celebration();
      if (noteData) {
        setNoteUnlocked(true);
        setTimeout(() => setShowNote(true), 2500);
      }
    }
    if (audio.progress < 0.1 && celebratedRef.current) {
      celebratedRef.current = false;
      setCelebrate(false);
      setShowNote(false);
    }
  }, [audio.progress, needleDropped, haptics, noteData]);

  const handleSleeveReveal = useCallback(() => {
    setStage("turntable");
    setTimeout(() => setStage("playing"), 900);
  }, []);

  // Needle drop — prime audio in user gesture, DON'T start playing
  const handleNeedleDrop = useCallback(() => {
    setNeedleDropped(true);
    haptics.needleDrop();
    audio.prime();
    audio.initScratch();
  }, [haptics, audio]);

  const toggleAutoplay = useCallback(() => {
    audio.prime(); // backup prime in user gesture
    setAutoplay((prev) => !prev);
  }, [setAutoplay, audio]);

  const handleProgressSeek = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      audio.seekToProgress(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
    },
    [audio]
  );

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const audible = isMoving && !isReversing && audio.isPlaying;

  return (
    <div className="relative flex flex-col min-h-[100dvh] bg-gradient-to-b from-zinc-950 via-[#0a0a0a] to-zinc-950 overflow-hidden">
      {/* DOM audio element — playsInline is critical for iOS */}
      {audioUrl && (
        <audio
          ref={audio.audioRef}
          src={audioUrl}
          preload="auto"
          playsInline
          onLoadedMetadata={audio.onLoadedMetadata}
          onTimeUpdate={audio.onTimeUpdate}
          className="hidden"
        />
      )}

      {/* Create your own — top right */}
      <Link href="/create">
        <motion.div
          className="fixed top-[max(env(safe-area-inset-top),0.75rem)] right-4 z-30 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-mono text-white/25 hover:text-amber-400/50 hover:border-amber-500/10 transition-all active:scale-95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          create vinyl
        </motion.div>
      </Link>

      {needleDropped && <MoodAmbient isPlaying={audible} />}
      <DustParticles />
      <Celebration trigger={celebrate} />

      <AnimatePresence>
        {stage === "sleeve" && (
          <motion.div key="sleeve" className="flex-1 flex items-center justify-center z-20 px-4"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: 0.6 }}>
            <AlbumSleeve title={title} artist={artist} coverPhoto={photos[0]} onReveal={handleSleeveReveal} isRevealed={false}
              firstPlayDate={firstPlayedAt ? new Date(firstPlayedAt).toLocaleDateString() : undefined} />
          </motion.div>
        )}
      </AnimatePresence>

      {(stage === "turntable" || stage === "playing") && (
        <motion.div key="player" className="flex-1 flex flex-col z-20"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>

          <motion.div className="pt-[max(env(safe-area-inset-top),1rem)] px-4 pb-2 text-center"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h1 className="text-base font-semibold text-white/70 tracking-tight truncate">{title}</h1>
            <p className="text-xs text-white/25 mt-0.5">{artist}</p>
          </motion.div>

          <motion.div className="flex-1 flex items-center justify-center min-h-0 py-2"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            {showNote && noteData ? (
              <motion.div className="w-full px-4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
                <p className="text-center text-xs text-white/25 font-mono mb-3">a note for you</p>
                <HandwrittenNote mode="view" noteData={noteData} />
              </motion.div>
            ) : photos.length > 0 ? (
              <PhotoGallery photos={photos} audioProgress={audio.progress} isPlaying={isMoving} />
            ) : (
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/5" />
                  <VinylRecord ref={recordRef} rotation={rotation} vinylColor={vinylColor} isActive={spinEnabled} audioProgress={audio.progress} pointerHandlers={pointerHandlers} size="large" />
                  <Tonearm isPlaying={needleDropped} onDrop={handleNeedleDrop} audioProgress={audio.progress} />
                </div>
              </div>
            )}
          </motion.div>

          <motion.div className="px-4 mb-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>

            {needleDropped && (
              <motion.div className="w-full max-w-[320px] h-12" initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }}>
                <Waveform isPlaying={audible} progress={audio.progress} />
              </motion.div>
            )}

            {photos.length > 0 && (
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/[0.04]" />
                <VinylRecord ref={recordRef} rotation={rotation} albumArt={photos[0]} vinylColor={vinylColor} isActive={spinEnabled} audioProgress={audio.progress} pointerHandlers={pointerHandlers} size="small" />
                <Tonearm isPlaying={needleDropped} onDrop={handleNeedleDrop} audioProgress={audio.progress} compact />
              </div>
            )}

            {needleDropped && (
              <div className="w-full max-w-[280px] flex flex-col gap-1">
                <div className="w-full h-[12px] flex items-center cursor-pointer group" onPointerDown={handleProgressSeek}>
                  <div className="w-full h-[3px] bg-white/8 rounded-full overflow-hidden group-hover:h-[5px] transition-all">
                    <div className="h-full bg-gradient-to-r from-amber-700/50 to-amber-500/30 rounded-full relative" style={{ width: `${audio.progress * 100}%` }}>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-400/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-white/20">
                  <span>{formatTime(audio.currentTime)}</span>
                  <span>{formatTime(audio.duration)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              {needleDropped && (
                <motion.button
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono transition-all ${
                    autoplay ? "bg-amber-500/15 text-amber-400/70 border border-amber-500/20" : "bg-white/5 text-white/30 border border-white/5 hover:bg-white/8"
                  }`}
                  onClick={toggleAutoplay} whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  {autoplay ? (
                    <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>pause</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>autoplay</>
                  )}
                </motion.button>
              )}
              {noteData && noteUnlocked && (
                <motion.button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono bg-white/5 text-white/30 border border-white/5 hover:bg-white/8 transition-all"
                  onClick={() => setShowNote((v) => !v)} whileTap={{ scale: 0.95 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                  </svg>
                  {showNote ? "photos" : "note"}
                </motion.button>
              )}
            </div>

            {isReversing && (
              <motion.div className="flex items-center gap-1.5 text-[10px] font-mono text-orange-400/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400/50" />scratching
              </motion.div>
            )}
            {!needleDropped && photos.length > 0 && (
              <motion.p className="text-sm text-white/40 font-mono" animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }}>
                tap the tonearm to start
              </motion.p>
            )}
            {needleDropped && !isMoving && !autoplay && (
              <motion.p className="text-sm text-white/35 font-mono" animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2.5, repeat: Infinity }}>
                spin the vinyl or tap autoplay
              </motion.p>
            )}
            {audible && !autoplay && (
              <motion.div className="flex items-center gap-1.5 text-[10px] font-mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-pulse" />
                <span className="text-amber-500/40">playing</span>
              </motion.div>
            )}

          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
