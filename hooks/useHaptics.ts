"use client";
import { useCallback, useRef } from "react";

export function useHaptics() {
  const lastPhotoIndex = useRef(-1);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Haptics not supported
      }
    }
  }, []);

  // Light tick on each spin frame (throttled)
  const spinTick = useCallback(() => {
    vibrate(5);
  }, [vibrate]);

  // Thump when needle drops onto record
  const needleDrop = useCallback(() => {
    vibrate([20, 40, 30]);
  }, [vibrate]);

  // Gentle pulse when a new photo is revealed
  const photoReveal = useCallback(
    (photoIndex: number) => {
      if (photoIndex !== lastPhotoIndex.current && photoIndex >= 0) {
        lastPhotoIndex.current = photoIndex;
        vibrate([15, 30, 15]);
      }
    },
    [vibrate]
  );

  // Big celebration buzz
  const celebration = useCallback(() => {
    vibrate([30, 50, 30, 50, 60]);
  }, [vibrate]);

  return {
    spinTick,
    needleDrop,
    photoReveal,
    celebration,
  };
}
