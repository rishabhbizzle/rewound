"use client";
import { useRef, useCallback, useEffect, useState } from "react";

interface AudioEngineState {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isLoaded: boolean;
  isUnlocked: boolean;
}

export function useAudioEngine(src: string | null) {
  const [state, setState] = useState<AudioEngineState>({
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isLoaded: false,
    isUnlocked: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const crackleGainRef = useRef<GainNode | null>(null);
  const scratchGainRef = useRef<GainNode | null>(null);
  const sourceConnectedRef = useRef(false);
  const unlockedRef = useRef(false);

  // Load audio element
  useEffect(() => {
    if (!src) return;

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.src = src;
    audioRef.current = audio;

    const onLoaded = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration,
        isLoaded: true,
      }));
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
      sourceConnectedRef.current = false;
    };
  }, [src]);

  // Create Web Audio graph
  const initAudioContext = useCallback(() => {
    if (ctxRef.current || !audioRef.current) return;

    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      if (!sourceConnectedRef.current) {
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        sourceConnectedRef.current = true;
      }

      // Crackle
      const crackleSize = ctx.sampleRate * 2;
      const crackleBuf = ctx.createBuffer(1, crackleSize, ctx.sampleRate);
      const crackleData = crackleBuf.getChannelData(0);
      for (let i = 0; i < crackleSize; i++) {
        crackleData[i] =
          Math.random() < 0.002
            ? (Math.random() - 0.5) * 0.15
            : (Math.random() - 0.5) * 0.005;
      }
      const crackleSource = ctx.createBufferSource();
      crackleSource.buffer = crackleBuf;
      crackleSource.loop = true;
      const crackleFilter = ctx.createBiquadFilter();
      crackleFilter.type = "lowpass";
      crackleFilter.frequency.value = 3000;
      const crackleGain = ctx.createGain();
      crackleGain.gain.value = 0;
      crackleGainRef.current = crackleGain;
      crackleSource.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(ctx.destination);
      crackleSource.start();

      // Scratch SFX
      const scratchLen = ctx.sampleRate * 0.6;
      const scratchBuf = ctx.createBuffer(1, scratchLen, ctx.sampleRate);
      const scratchData = scratchBuf.getChannelData(0);
      for (let i = 0; i < scratchLen; i++) {
        const t = i / scratchLen;
        const env = t < 0.05 ? t / 0.05 : Math.pow(1 - t, 2);
        scratchData[i] =
          ((Math.random() - 0.5) * 0.8 + Math.sin(i * (0.1 + t * 0.4)) * 0.3) * env;
      }
      const scratchNode = ctx.createBufferSource();
      scratchNode.buffer = scratchBuf;
      scratchNode.loop = true;
      const scratchFilter = ctx.createBiquadFilter();
      scratchFilter.type = "bandpass";
      scratchFilter.frequency.value = 1200;
      scratchFilter.Q.value = 1.5;
      const scratchGain = ctx.createGain();
      scratchGain.gain.value = 0;
      scratchGainRef.current = scratchGain;
      scratchNode.connect(scratchFilter);
      scratchFilter.connect(scratchGain);
      scratchGain.connect(ctx.destination);
      scratchNode.start();
    } catch {
      // Web Audio not available
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // UNLOCK — must be called directly from a user gesture (click/tap).
  // This is the key to iOS audio. It:
  //   1. Creates + resumes the AudioContext
  //   2. Plays + immediately pauses the audio element
  // After this, play()/pause() work freely from useEffects.
  // ═══════════════════════════════════════════════════════════════
  const unlock = useCallback(async () => {
    if (unlockedRef.current) return;
    if (!audioRef.current || !state.isLoaded) return;

    // Init Web Audio in the user gesture
    initAudioContext();

    // Resume context in the user gesture
    if (ctxRef.current?.state === "suspended") {
      await ctxRef.current.resume();
    }

    // Play + pause to "prime" the audio element on iOS
    // iOS requires at least one play() in a user gesture
    try {
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } catch {
      // If even this fails, try without Web Audio context
      // (disconnect and play raw)
    }

    unlockedRef.current = true;
    setState((prev) => ({ ...prev, isUnlocked: true, isPlaying: false }));
  }, [state.isLoaded, initAudioContext]);

  // Play — works freely after unlock()
  const play = useCallback(() => {
    if (!audioRef.current || !state.isLoaded) return;

    // If not unlocked yet, we can't play from a non-gesture
    if (!unlockedRef.current) {
      return;
    }

    // Resume context if needed
    if (ctxRef.current?.state === "suspended") {
      ctxRef.current.resume();
    }

    audioRef.current.play().then(() => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    }).catch(() => {
      // Shouldn't happen after unlock, but safety net
    });
  }, [state.isLoaded]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = Math.max(0.25, Math.min(4, rate));
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(time, audioRef.current.duration || 0)
    );
  }, []);

  const seekToProgress = useCallback(
    (progress: number) => {
      if (!audioRef.current || !state.duration) return;
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(progress * state.duration, state.duration)
      );
    },
    [state.duration]
  );

  const setCrackleVolume = useCallback((volume: number) => {
    if (crackleGainRef.current) {
      crackleGainRef.current.gain.value = Math.max(0, Math.min(1, volume));
    }
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

  const getFrequencyData = useCallback((): Uint8Array => {
    if (!analyserRef.current) return new Uint8Array(64);
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    return data;
  }, []);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  const progress =
    state.duration > 0 ? state.currentTime / state.duration : 0;

  return {
    ...state,
    progress,
    unlock,
    play,
    pause,
    seek,
    seekToProgress,
    setPlaybackRate,
    setCrackleVolume,
    setScratchVolume,
    getFrequencyData,
  };
}
