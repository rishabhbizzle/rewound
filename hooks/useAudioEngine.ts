"use client";
import { useRef, useCallback, useEffect, useState } from "react";

interface AudioEngineState {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isLoaded: boolean;
  playbackBlocked: boolean;
}

export function useAudioEngine(src: string | null) {
  const [state, setState] = useState<AudioEngineState>({
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isLoaded: false,
    playbackBlocked: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const crackleGainRef = useRef<GainNode | null>(null);
  const scratchGainRef = useRef<GainNode | null>(null);
  const sourceConnectedRef = useRef(false);

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

    const onError = () => {
      setState((prev) => ({ ...prev, playbackBlocked: true }));
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("canplaythrough", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("canplaythrough", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.src = "";
      sourceConnectedRef.current = false;
    };
  }, [src]);

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

      // Crackle noise
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
        const noise = (Math.random() - 0.5) * 0.8;
        const periodic = Math.sin(i * (0.1 + t * 0.4)) * 0.3;
        scratchData[i] = (noise + periodic) * env;
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

  const play = useCallback(() => {
    if (!audioRef.current || !state.isLoaded) return;
    initAudioContext();
    if (ctxRef.current?.state === "suspended") {
      ctxRef.current.resume();
    }
    audioRef.current
      .play()
      .then(() => {
        setState((prev) => ({ ...prev, isPlaying: true, playbackBlocked: false }));
      })
      .catch(() => {
        // Autoplay policy blocked playback — surface to UI
        setState((prev) => ({ ...prev, playbackBlocked: true, isPlaying: false }));
      });
  }, [state.isLoaded, initAudioContext]);

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
    audioRef.current.currentTime = Math.max(0, Math.min(time, audioRef.current.duration || 0));
  }, []);

  const seekToProgress = useCallback(
    (progress: number) => {
      if (!audioRef.current || !state.duration) return;
      const time = progress * state.duration;
      audioRef.current.currentTime = Math.max(0, Math.min(time, state.duration));
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
