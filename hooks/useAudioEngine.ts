"use client";
import { useRef, useCallback, useEffect, useState } from "react";

export function useAudioEngine(src: string | null) {
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  // Scratch SFX
  const scratchCtxRef = useRef<AudioContext | null>(null);
  const scratchGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!src) return;

    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 0; // Start silent
    audio.loop = true; // Loop so it never ends and we don't need to re-play
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    });
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
      startedRef.current = false;
    };
  }, [src]);

  // Call ONCE from a user gesture (needle drop / autoplay tap).
  // After this, audio is "playing" silently forever. We use volume to control sound.
  const start = useCallback(() => {
    if (startedRef.current || !audioRef.current) return;
    audioRef.current.volume = 0;
    audioRef.current.play().catch(() => {});
    startedRef.current = true;
  }, []);

  // Volume: 0 = silent, 1 = audible. NOT play/pause.
  const setVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, v));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = Math.max(0.5, Math.min(2, rate));
  }, []);

  const seekToProgress = useCallback((p: number) => {
    if (!audioRef.current || !duration) return;
    audioRef.current.currentTime = Math.max(0, Math.min(p * duration, duration));
  }, [duration]);

  // Scratch SFX init — call from user gesture
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
    duration,
    currentTime,
    progress,
    isLoaded,
    start,
    setVolume,
    setPlaybackRate,
    seekToProgress,
    initScratch,
    setScratchVolume,
  };
}
