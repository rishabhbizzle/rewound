"use client";
import { useRef, useCallback, useEffect, useState } from "react";

interface AudioEngineState {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isLoaded: boolean;
}

export function useAudioEngine(src: string | null) {
  const [state, setState] = useState<AudioEngineState>({
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isLoaded: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const crackleGainRef = useRef<GainNode | null>(null);
  const scratchGainRef = useRef<GainNode | null>(null);
  const effectsInitRef = useRef(false);

  // ── Load audio via plain HTML element ──
  useEffect(() => {
    if (!src) return;

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = src;
    audioRef.current = audio;

    const onLoaded = () => {
      setState((prev) => ({ ...prev, duration: audio.duration, isLoaded: true }));
    };
    const onTimeUpdate = () => {
      setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
    };
    const onEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("canplaythrough", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("canplaythrough", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.src = "";
    };
  }, [src]);

  // ── Effects (crackle + scratch) — standalone Web Audio, not connected to audio element ──
  const initEffects = useCallback(() => {
    if (effectsInitRef.current) return;
    effectsInitRef.current = true;

    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      // Crackle
      const crackleSize = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, crackleSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < crackleSize; i++) {
        d[i] = Math.random() < 0.002 ? (Math.random() - 0.5) * 0.15 : (Math.random() - 0.5) * 0.005;
      }
      const cs = ctx.createBufferSource();
      cs.buffer = buf;
      cs.loop = true;
      const cf = ctx.createBiquadFilter();
      cf.type = "lowpass";
      cf.frequency.value = 3000;
      const cg = ctx.createGain();
      cg.gain.value = 0;
      crackleGainRef.current = cg;
      cs.connect(cf);
      cf.connect(cg);
      cg.connect(ctx.destination);
      cs.start();

      // Scratch
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
      // Effects unavailable
    }
  }, []);

  // ── Play: just plays the audio element. State comes from the element's events. ──
  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Try to resume effects context
    if (ctxRef.current?.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }

    // Only call play if not already playing
    if (audio.paused) {
      audio.play()
        .then(() => {
          setState((prev) => ({ ...prev, isPlaying: true }));
        })
        .catch(() => {
          // Autoplay blocked — will work after user gesture
        });
    }
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = Math.max(0.25, Math.min(4, rate));
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, audioRef.current.duration || 0));
  }, []);

  const seekToProgress = useCallback(
    (progress: number) => {
      if (!audioRef.current || !state.duration) return;
      audioRef.current.currentTime = Math.max(0, Math.min(progress * state.duration, state.duration));
    },
    [state.duration]
  );

  const setCrackleVolume = useCallback((volume: number) => {
    if (crackleGainRef.current) crackleGainRef.current.gain.value = Math.max(0, Math.min(1, volume));
  }, []);

  const setScratchVolume = useCallback((volume: number) => {
    if (scratchGainRef.current) {
      scratchGainRef.current.gain.setTargetAtTime(
        Math.max(0, Math.min(0.6, volume)),
        ctxRef.current?.currentTime ?? 0,
        0.02
      );
    }
  }, []);

  useEffect(() => {
    return () => { ctxRef.current?.close(); };
  }, []);

  const progress = state.duration > 0 ? state.currentTime / state.duration : 0;

  return {
    ...state,
    progress,
    initEffects,
    play,
    pause,
    seek,
    seekToProgress,
    setPlaybackRate,
    setCrackleVolume,
    setScratchVolume,
  };
}
