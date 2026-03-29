"use client";
import { useRef, useCallback, useState, useEffect, type RefObject } from "react";

export function useAudioEngine() {
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const primedRef = useRef(false);

  // Scratch SFX
  const scratchCtxRef = useRef<AudioContext | null>(null);
  const scratchGainRef = useRef<GainNode | null>(null);

  const onLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoaded(true);
    }
  }, []);

  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  // Call from user gesture to prime iOS. Plays and pauses immediately.
  const prime = useCallback(() => {
    if (primedRef.current || !audioRef.current) return;
    primedRef.current = true;
    const a = audioRef.current;
    a.play().then(() => {
      a.pause();
      a.currentTime = 0;
      setIsPlaying(false);
    }).catch(() => {
      primedRef.current = false;
    });
  }, []);

  const play = useCallback(() => {
    if (!audioRef.current || !audioRef.current.paused) return;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current || audioRef.current.paused) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = Math.max(0.5, Math.min(2, rate));
  }, []);

  const seekToProgress = useCallback((p: number) => {
    if (!audioRef.current || !duration) return;
    audioRef.current.currentTime = Math.max(0, Math.min(p * duration, duration));
  }, [duration]);

  // Scratch SFX
  const initScratch = useCallback(() => {
    if (scratchCtxRef.current) return;
    try {
      const ctx = new AudioContext();
      scratchCtxRef.current = ctx;
      const sLen = ctx.sampleRate * 0.6;
      const buf = ctx.createBuffer(1, sLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < sLen; i++) {
        const t = i / sLen;
        const env = t < 0.05 ? t / 0.05 : Math.pow(1 - t, 2);
        d[i] = ((Math.random() - 0.5) * 0.8 + Math.sin(i * (0.1 + t * 0.4)) * 0.3) * env;
      }
      const sn = ctx.createBufferSource();
      sn.buffer = buf;
      sn.loop = true;
      const sf = ctx.createBiquadFilter();
      sf.type = "bandpass";
      sf.frequency.value = 1200;
      sf.Q.value = 1.5;
      const sg = ctx.createGain();
      sg.gain.value = 0;
      scratchGainRef.current = sg;
      sn.connect(sf);
      sf.connect(sg);
      sg.connect(ctx.destination);
      sn.start();
    } catch { /* ok */ }
  }, []);

  const setScratchVolume = useCallback((v: number) => {
    if (!scratchGainRef.current) return;
    if (scratchCtxRef.current?.state === "suspended") scratchCtxRef.current.resume().catch(() => {});
    scratchGainRef.current.gain.setTargetAtTime(Math.max(0, Math.min(0.6, v)), scratchCtxRef.current?.currentTime ?? 0, 0.02);
  }, []);

  useEffect(() => {
    return () => { scratchCtxRef.current?.close(); };
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;

  return {
    audioRef: audioRef as RefObject<HTMLAudioElement>,
    duration,
    currentTime,
    progress,
    isLoaded,
    isPlaying,
    onLoadedMetadata,
    onTimeUpdate,
    prime,
    play,
    pause,
    setPlaybackRate,
    seekToProgress,
    initScratch,
    setScratchVolume,
  };
}
