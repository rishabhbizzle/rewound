"use client";
import { useRef, useCallback, useEffect, useState } from "react";

export function useAudioEngine(src: string | null) {
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Scratch SFX — standalone Web Audio, NOT connected to audio element
  const scratchCtxRef = useRef<AudioContext | null>(null);
  const scratchGainRef = useRef<GainNode | null>(null);
  const scratchInitRef = useRef(false);

  // Load audio
  useEffect(() => {
    if (!src) return;

    const audio = new Audio(src);
    audio.preload = "auto";
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    });
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [src]);

  // Init scratch SFX — call from user gesture
  const initScratch = useCallback(() => {
    if (scratchInitRef.current) return;
    scratchInitRef.current = true;

    try {
      const ctx = new AudioContext();
      scratchCtxRef.current = ctx;

      const sLen = ctx.sampleRate * 0.6;
      const sBuf = ctx.createBuffer(1, sLen, ctx.sampleRate);
      const sd = sBuf.getChannelData(0);
      for (let i = 0; i < sLen; i++) {
        const t = i / sLen;
        const env = t < 0.05 ? t / 0.05 : Math.pow(1 - t, 2);
        sd[i] = ((Math.random() - 0.5) * 0.8 + Math.sin(i * (0.1 + t * 0.4)) * 0.3) * env;
      }

      const sn = ctx.createBufferSource();
      sn.buffer = sBuf;
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
    } catch {
      // Scratch unavailable
    }
  }, []);

  const setScratchVolume = useCallback((volume: number) => {
    if (!scratchGainRef.current) return;
    if (scratchCtxRef.current?.state === "suspended") {
      scratchCtxRef.current.resume().catch(() => {});
    }
    scratchGainRef.current.gain.setTargetAtTime(
      Math.max(0, Math.min(0.6, volume)),
      scratchCtxRef.current?.currentTime ?? 0,
      0.02
    );
  }, []);

  const play = useCallback(() => {
    const a = audioRef.current;
    if (!a || !a.paused) return;
    a.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  const pause = useCallback(() => {
    const a = audioRef.current;
    if (!a || a.paused) return;
    a.pause();
    setIsPlaying(false);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = Math.max(0.5, Math.min(2, rate));
    }
  }, []);

  const seekToProgress = useCallback((p: number) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = Math.max(0, Math.min(p * duration, duration));
  }, [duration]);

  useEffect(() => {
    return () => { scratchCtxRef.current?.close(); };
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;

  return {
    isPlaying,
    isLoaded,
    duration,
    currentTime,
    progress,
    play,
    pause,
    setPlaybackRate,
    seekToProgress,
    initScratch,
    setScratchVolume,
  };
}
