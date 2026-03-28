"use client";
import { useRef, useCallback, useEffect, useState } from "react";

interface SpinState {
  rotation: number;
  angularVelocity: number;
  isUserSpinning: boolean;
  isDecelerating: boolean;
  isReversing: boolean;
}

const NORMAL_VELOCITY = 0.4;
const FRICTION = 0.992;
const MIN_VELOCITY = 0.01;
const AUTO_SPEED = 3.3;

export function useVinylSpin(enabled: boolean) {
  const [state, setState] = useState<SpinState>({
    rotation: 0,
    angularVelocity: 0,
    isUserSpinning: false,
    isDecelerating: false,
    isReversing: false,
  });
  const [autoplay, setAutoplay] = useState(false);

  const recordRef = useRef<HTMLDivElement>(null);
  const lastAngleRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const rotationRef = useRef(0);
  const isSpinningRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const autoplayFrameRef = useRef<number>(0);
  // Track raw signed delta to detect backwards spin
  const rawDeltaRef = useRef(0);

  const getAngleFromCenter = useCallback(
    (clientX: number, clientY: number) => {
      if (!recordRef.current) return 0;
      const rect = recordRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return Math.atan2(clientY - cy, clientX - cx);
    },
    []
  );

  const startDeceleration = useCallback(() => {
    const decelerate = () => {
      if (isSpinningRef.current) return;

      velocityRef.current *= FRICTION;

      if (Math.abs(velocityRef.current) < MIN_VELOCITY) {
        velocityRef.current = 0;
        setState((prev) => ({
          ...prev,
          angularVelocity: 0,
          isDecelerating: false,
          isReversing: false,
        }));
        return;
      }

      const deltaRotation = velocityRef.current * (180 / Math.PI) * (1 / 60);
      rotationRef.current += deltaRotation;

      setState((prev) => ({
        ...prev,
        rotation: rotationRef.current,
        angularVelocity: velocityRef.current,
        isDecelerating: true,
      }));

      animFrameRef.current = requestAnimationFrame(decelerate);
    };

    animFrameRef.current = requestAnimationFrame(decelerate);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      if (autoplay) setAutoplay(false);

      isSpinningRef.current = true;
      cancelAnimationFrame(animFrameRef.current);

      lastAngleRef.current = getAngleFromCenter(e.clientX, e.clientY);
      lastTimeRef.current = performance.now();
      rawDeltaRef.current = 0;

      velocityRef.current = NORMAL_VELOCITY * 0.5;

      setState((prev) => ({
        ...prev,
        isUserSpinning: true,
        isDecelerating: false,
        isReversing: false,
        angularVelocity: NORMAL_VELOCITY * 0.5,
      }));
    },
    [enabled, getAngleFromCenter, autoplay]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isSpinningRef.current || !enabled) return;
      e.preventDefault();

      const currentAngle = getAngleFromCenter(e.clientX, e.clientY);
      let delta = currentAngle - lastAngleRef.current;

      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;

      const now = performance.now();
      const dt = (now - lastTimeRef.current) / 1000;

      rotationRef.current += delta * (180 / Math.PI);

      // Track direction via smoothed signed delta
      rawDeltaRef.current = rawDeltaRef.current * 0.5 + delta * 0.5;
      const reversing = rawDeltaRef.current < -0.01;

      const instantVelocity = dt > 0 ? Math.abs(delta / dt) : 0;
      const blended = velocityRef.current * 0.4 + instantVelocity * 0.6;
      velocityRef.current = Math.max(blended, NORMAL_VELOCITY * 0.7);

      lastAngleRef.current = currentAngle;
      lastTimeRef.current = now;

      setState({
        rotation: rotationRef.current,
        angularVelocity: velocityRef.current,
        isUserSpinning: true,
        isDecelerating: false,
        isReversing: reversing,
      });
    },
    [enabled, getAngleFromCenter]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isSpinningRef.current) return;
      e.preventDefault();

      isSpinningRef.current = false;
      velocityRef.current = Math.max(velocityRef.current, NORMAL_VELOCITY);

      setState((prev) => ({
        ...prev,
        isUserSpinning: false,
        isReversing: false,
      }));
      startDeceleration();
    },
    [startDeceleration]
  );

  // Autoplay loop
  useEffect(() => {
    if (!autoplay || !enabled) {
      cancelAnimationFrame(autoplayFrameRef.current);
      return;
    }

    const spin = () => {
      if (isSpinningRef.current) {
        autoplayFrameRef.current = requestAnimationFrame(spin);
        return;
      }

      rotationRef.current += AUTO_SPEED;
      velocityRef.current = NORMAL_VELOCITY;

      setState({
        rotation: rotationRef.current,
        angularVelocity: NORMAL_VELOCITY,
        isUserSpinning: false,
        isDecelerating: false,
        isReversing: false,
      });

      autoplayFrameRef.current = requestAnimationFrame(spin);
    };

    autoplayFrameRef.current = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(autoplayFrameRef.current);
  }, [autoplay, enabled]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      cancelAnimationFrame(autoplayFrameRef.current);
    };
  }, []);

  const rawRate = Math.abs(state.angularVelocity) / NORMAL_VELOCITY;
  const playbackRate = autoplay
    ? 1
    : rawRate > 0.6 && rawRate < 1.6
      ? 1
      : Math.min(Math.max(rawRate, 0.5), 2.5);

  const isMoving =
    autoplay ||
    state.isUserSpinning ||
    (state.isDecelerating && Math.abs(state.angularVelocity) > MIN_VELOCITY);

  return {
    recordRef,
    rotation: state.rotation,
    angularVelocity: state.angularVelocity,
    playbackRate,
    isUserSpinning: state.isUserSpinning,
    isMoving,
    isReversing: state.isReversing,
    autoplay,
    setAutoplay,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}
