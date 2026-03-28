"use client";
import { useRef, useEffect, useCallback } from "react";
import Image from "next/image";

interface PhotoGalleryProps {
  photos: string[];
  audioProgress: number;
  isPlaying: boolean;
}

export default function PhotoGallery({
  photos,
  audioProgress,
}: PhotoGalleryProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentX = useRef(0);
  const targetX = useRef(0);
  const rafRef = useRef<number>(0);

  const animate = useCallback(() => {
    const dx = targetX.current - currentX.current;

    if (Math.abs(dx) > 0.5) {
      currentX.current += dx * 0.1;
    } else {
      currentX.current = targetX.current;
    }

    if (stripRef.current) {
      stripRef.current.style.transform = `translate3d(${-currentX.current}px, 0, 0)`;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  useEffect(() => {
    const strip = stripRef.current;
    const container = containerRef.current;
    if (!strip || !container) return;

    const maxScroll = strip.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) return;

    targetX.current = audioProgress * maxScroll;
  }, [audioProgress]);

  if (photos.length === 0) return null;

  // Single photo — no scroll needed, just show it centered in the paper frame
  if (photos.length === 1) {
    return (
      <div className="w-full flex flex-col gap-3 items-center">
        <div className="relative w-full max-w-[400px] mx-auto px-3">
          <div className="relative rounded-2xl overflow-hidden bg-[#f5f0e8] shadow-[0_4px_40px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-[#e8e0d4] to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-[#e8e0d4] to-transparent z-10 pointer-events-none" />

            <div className="flex justify-center" style={{ padding: "10px 6px" }}>
              <div
                className="relative rounded-lg overflow-hidden"
                style={{
                  width: "min(75vw, 300px)",
                  aspectRatio: "3 / 4",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }}
              >
                <Image
                  src={photos[0]}
                  alt="Memory"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          </div>

          {/* Roll bars */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -left-1 w-5 z-20 pointer-events-none"
            style={{
              height: "calc(100% + 12px)",
              background: "linear-gradient(to right, #b8b0a2, #d9d1c3 40%, #c4bbb0)",
              borderRadius: "4px 2px 2px 4px",
              boxShadow: "2px 0 6px rgba(0,0,0,0.15), -1px 0 3px rgba(0,0,0,0.1)",
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -right-1 w-5 z-20 pointer-events-none"
            style={{
              height: "calc(100% + 12px)",
              background: "linear-gradient(to left, #b8b0a2, #d9d1c3 40%, #c4bbb0)",
              borderRadius: "2px 4px 4px 2px",
              boxShadow: "-2px 0 6px rgba(0,0,0,0.15), 1px 0 3px rgba(0,0,0,0.1)",
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/25">1 memory</span>
        </div>
      </div>
    );
  }

  // Multi-photo scroll
  return (
    <div className="w-full flex flex-col gap-3 items-center">
      <div className="relative w-full max-w-[400px] mx-auto px-3">
        <div className="relative rounded-2xl overflow-hidden bg-[#f5f0e8] shadow-[0_4px_40px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-[#e8e0d4] to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-[#e8e0d4] to-transparent z-10 pointer-events-none" />

          <div
            className="absolute top-0 bottom-0 left-0 w-4 z-10 pointer-events-none"
            style={{
              background: "linear-gradient(to right, #d9d1c3, #f5f0e8 60%, transparent)",
              boxShadow: "inset -2px 0 6px rgba(0,0,0,0.05)",
            }}
          />

          <div
            className="absolute top-0 bottom-0 right-0 w-5 z-10 pointer-events-none"
            style={{
              background: "linear-gradient(to left, #ccc5b6, #d9d1c3 30%, #f5f0e8 70%, transparent)",
              boxShadow: "inset 3px 0 8px rgba(0,0,0,0.08)",
              borderRadius: "0 16px 16px 0",
            }}
          />

          <div
            ref={containerRef}
            className="overflow-hidden"
            style={{ padding: "10px 6px" }}
          >
            <div
              ref={stripRef}
              className="flex gap-2"
              style={{ willChange: "transform" }}
            >
              {photos.map((photo, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-0 rounded-lg overflow-hidden"
                  style={{
                    width: "min(55vw, 220px)",
                    aspectRatio: "3 / 4",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  }}
                >
                  <Image
                    src={photo}
                    alt={`Memory ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}

              <div className="flex-shrink-0" style={{ width: "min(20vw, 80px)" }} />
            </div>
          </div>
        </div>

        {/* Roll bars */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -left-1 w-5 z-20 pointer-events-none"
          style={{
            height: "calc(100% + 12px)",
            background: "linear-gradient(to right, #b8b0a2, #d9d1c3 40%, #c4bbb0)",
            borderRadius: "4px 2px 2px 4px",
            boxShadow: "2px 0 6px rgba(0,0,0,0.15), -1px 0 3px rgba(0,0,0,0.1)",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -right-1 w-5 z-20 pointer-events-none"
          style={{
            height: "calc(100% + 12px)",
            background: "linear-gradient(to left, #b8b0a2, #d9d1c3 40%, #c4bbb0)",
            borderRadius: "2px 4px 4px 2px",
            boxShadow: "-2px 0 6px rgba(0,0,0,0.15), 1px 0 3px rgba(0,0,0,0.1)",
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-white/25">
          {Math.min(Math.floor(audioProgress * photos.length) + 1, photos.length)} / {photos.length} memories
        </span>
      </div>
    </div>
  );
}
