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
  const wasMovingRef = useRef(false);
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

  const audio = useAudioEngine(audioUrl);
  const haptics = useHaptics();

  // Sync audio with spin
  useEffect(() => {
    if (!needleDropped) return;

    if (isMoving && playbackRate > 0.05) {
      if (!audio.isPlaying) {
        audio.play();
      }
      audio.setPlaybackRate(playbackRate);
      audio.setCrackleVolume(Math.min(playbackRate * 0.3, 0.4));
      audio.setScratchVolume(isReversing ? 0.5 : 0);
    } else {
      if (audio.isPlaying) {
        audio.pause();
      }
      audio.setCrackleVolume(0);
      audio.setScratchVolume(0);
    }

    wasMovingRef.current = isMoving;
  }, [isMoving, playbackRate, needleDropped, isReversing, audio]);

  // Haptic on photo reveal
  useEffect(() => {
    if (photos.length === 0 || !needleDropped) return;
    const idx = Math.min(
      Math.floor(audio.progress * photos.length),
      photos.length - 1
    );
    if (idx !== lastPhotoRef.current) {
      lastPhotoRef.current = idx;
      haptics.photoReveal(idx);
    }
  }, [audio.progress, photos.length, needleDropped, haptics]);

  // Celebration on completion
  // Triggers at 95% progress OR when audio naturally ends (isPlaying flips to false near end)
  const audioFinished =
    (audio.progress >= 0.95 || (!audio.isPlaying && audio.progress > 0.8)) &&
    needleDropped;

  useEffect(() => {
    if (audioFinished && !celebratedRef.current) {
      celebratedRef.current = true;
      setCelebrate(true);
      haptics.celebration();
      if (noteData) {
        setNoteUnlocked(true);
        setTimeout(() => setShowNote(true), 2500);
      }
    }
    // Reset when audio loops back (manual seek or replay)
    if (audio.progress < 0.1 && celebratedRef.current) {
      celebratedRef.current = false;
      setCelebrate(false);
      setShowNote(false);
    }
  }, [audioFinished, audio.progress, haptics, noteData]);

  const handleSleeveReveal = useCallback(() => {
    setStage("turntable");
    setTimeout(() => setStage("playing"), 900);
  }, []);

  const handleNeedleDrop = useCallback(() => {
    setNeedleDropped(true);
    haptics.needleDrop();
  }, [haptics]);

  const toggleAutoplay = useCallback(() => {
    setAutoplay((prev) => !prev);
  }, [setAutoplay]);

  // Seekable progress bar
  const handleProgressSeek = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      audio.seekToProgress(progress);
    },
    [audio]
  );

  // Tap-to-unmute: if autoplay is blocked, a user tap on the player retries
  const handleUnblock = useCallback(() => {
    audio.play();
  }, [audio]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex flex-col min-h-[100dvh] bg-gradient-to-b from-zinc-950 via-[#0a0a0a] to-zinc-950 overflow-hidden">
      {needleDropped && (
        <MoodAmbient
          getFrequencyData={audio.getFrequencyData}
          isPlaying={isMoving}
        />
      )}

      <DustParticles />
      <Celebration trigger={celebrate} />

      {/* Audio blocked banner */}
      {audio.playbackBlocked && needleDropped && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-3 px-4 bg-amber-900/80 backdrop-blur-sm"
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          onClick={handleUnblock}
        >
          <p className="text-xs text-amber-100 font-mono text-center">
            tap anywhere to enable audio
          </p>
        </motion.div>
      )}

      {/* Sleeve stage */}
      <AnimatePresence>
        {stage === "sleeve" && (
          <motion.div
            key="sleeve"
            className="flex-1 flex items-center justify-center z-20 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.6 }}
          >
            <AlbumSleeve
              title={title}
              artist={artist}
              coverPhoto={photos[0]}
              onReveal={handleSleeveReveal}
              isRevealed={false}
              firstPlayDate={
                firstPlayedAt
                  ? new Date(firstPlayedAt).toLocaleDateString()
                  : undefined
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player stage */}
      {(stage === "turntable" || stage === "playing") && (
        <motion.div
          key="player"
          className="flex-1 flex flex-col z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Title */}
          <motion.div
            className="pt-[max(env(safe-area-inset-top),1rem)] px-4 pb-2 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-base font-semibold text-white/70 tracking-tight truncate">
              {title}
            </h1>
            <p className="text-xs text-white/25 mt-0.5">{artist}</p>
          </motion.div>

          {/* Photo scroll or note */}
          <motion.div
            className="flex-1 flex items-center justify-center min-h-0 py-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {showNote && noteData ? (
              <motion.div
                className="w-full px-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                <p className="text-center text-xs text-white/25 font-mono mb-3">
                  a note for you
                </p>
                <HandwrittenNote mode="view" noteData={noteData} />
              </motion.div>
            ) : photos.length > 0 ? (
              <PhotoGallery
                photos={photos}
                audioProgress={audio.progress}
                isPlaying={isMoving}
              />
            ) : (
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/5" />
                  <VinylRecord
                    ref={recordRef}
                    rotation={rotation}
                    vinylColor={vinylColor}
                    isActive={spinEnabled}
                    audioProgress={audio.progress}
                    pointerHandlers={pointerHandlers}
                    size="large"
                  />
                  <Tonearm
                    isPlaying={needleDropped}
                    onDrop={handleNeedleDrop}
                    audioProgress={audio.progress}
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* Bottom controls */}
          <motion.div
            className="px-4 pb-[max(env(safe-area-inset-bottom),1rem)] flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {/* Waveform */}
            {needleDropped && (
              <motion.div
                className="w-full max-w-[320px] h-12"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Waveform
                  getFrequencyData={audio.getFrequencyData}
                  isPlaying={isMoving}
                  progress={audio.progress}
                />
              </motion.div>
            )}

            {/* Compact vinyl */}
            {photos.length > 0 && (
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/[0.04]" />
                <VinylRecord
                  ref={recordRef}
                  rotation={rotation}
                  albumArt={photos[0]}
                  vinylColor={vinylColor}
                  isActive={spinEnabled}
                  audioProgress={audio.progress}
                  pointerHandlers={pointerHandlers}
                  size="small"
                />
                <Tonearm
                  isPlaying={needleDropped}
                  onDrop={handleNeedleDrop}
                  audioProgress={audio.progress}
                  compact
                />
              </div>
            )}

            {/* Seekable progress bar */}
            {audio.isLoaded && needleDropped && (
              <div className="w-full max-w-[280px] flex flex-col gap-1">
                <div
                  className="w-full h-[12px] flex items-center cursor-pointer group"
                  onPointerDown={handleProgressSeek}
                >
                  <div className="w-full h-[3px] bg-white/8 rounded-full overflow-hidden group-hover:h-[5px] transition-all">
                    <div
                      className="h-full bg-gradient-to-r from-amber-700/50 to-amber-500/30 rounded-full relative"
                      style={{ width: `${audio.progress * 100}%` }}
                    >
                      {/* Seek thumb — visible on hover */}
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

            {/* Controls row */}
            <div className="flex items-center gap-3">
              {needleDropped && (
                <motion.button
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono transition-all ${
                    autoplay
                      ? "bg-amber-500/15 text-amber-400/70 border border-amber-500/20"
                      : "bg-white/5 text-white/30 border border-white/5 hover:bg-white/8"
                  }`}
                  onClick={toggleAutoplay}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  {autoplay ? (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                      pause
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      autoplay
                    </>
                  )}
                </motion.button>
              )}

              {/* Note toggle — available once unlocked */}
              {noteData && noteUnlocked && (
                <motion.button
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono bg-white/5 text-white/30 border border-white/5 hover:bg-white/8 transition-all"
                  onClick={() => setShowNote((v) => !v)}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                  </svg>
                  {showNote ? "photos" : "note"}
                </motion.button>
              )}
            </div>

            {/* Scratch indicator */}
            {isReversing && (
              <motion.div
                className="flex items-center gap-1.5 text-[10px] font-mono text-orange-400/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400/50" />
                scratching
              </motion.div>
            )}

            {/* Hints */}
            {!needleDropped && photos.length > 0 && (
              <motion.p
                className="text-xs text-white/20 font-mono tracking-wider"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                tap the tonearm to start
              </motion.p>
            )}

            {needleDropped && !isMoving && !autoplay && !isReversing && (
              <motion.p
                className="text-xs text-white/15 font-mono tracking-wider"
                animate={{ opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                spin the vinyl or tap autoplay
              </motion.p>
            )}

            {isMoving && !autoplay && !isReversing && (
              <motion.div
                className="flex items-center gap-1.5 text-[10px] font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-pulse" />
                <span
                  className={
                    playbackRate > 1.4
                      ? "text-orange-400/40"
                      : playbackRate < 0.6
                        ? "text-blue-400/40"
                        : "text-amber-500/40"
                  }
                >
                  {playbackRate > 1.4
                    ? "fast"
                    : playbackRate < 0.6
                      ? "slow"
                      : "perfect speed"}
                </span>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
