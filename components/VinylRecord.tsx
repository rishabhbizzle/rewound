"use client";
import { forwardRef } from "react";
import Image from "next/image";

interface VinylRecordProps {
  rotation: number;
  albumArt?: string;
  vinylColor?: "black" | "red" | "blue" | "clear";
  isActive: boolean;
  audioProgress: number;
  pointerHandlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
  photos?: string[];
  size?: "small" | "large";
}

const sizeClasses = {
  small: "w-[140px] h-[140px]",
  large: "w-[280px] h-[280px] md:w-[340px] md:h-[340px]",
};

const labelSizes = {
  small: "w-[48px] h-[48px]",
  large: "w-[95px] h-[95px] md:w-[115px] md:h-[115px]",
};

const VinylRecord = forwardRef<HTMLDivElement, VinylRecordProps>(
  function VinylRecord(
    {
      rotation,
      albumArt,
      vinylColor = "black",
      isActive,
      audioProgress,
      pointerHandlers,
      photos = [],
      size = "large",
    },
    ref
  ) {
    const currentPhotoIndex =
      photos.length > 0
        ? Math.min(
            Math.floor(audioProgress * photos.length),
            photos.length - 1
          )
        : 0;
    const currentPhoto = photos[currentPhotoIndex] || albumArt;

    const colorClass =
      vinylColor === "red"
        ? "vinyl-red"
        : vinylColor === "blue"
          ? "vinyl-blue"
          : vinylColor === "clear"
            ? "vinyl-clear"
            : "";

    return (
      <div
        ref={ref}
        className={`relative rounded-full touch-none select-none ${sizeClasses[size]} ${isActive ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          willChange: "transform",
        }}
        {...(isActive ? pointerHandlers : {})}
      >
        {/* Vinyl base */}
        <div
          className={`absolute inset-0 rounded-full bg-[#1a1a1a] ${size === "large" ? "shadow-[0_0_60px_rgba(0,0,0,0.8)]" : "shadow-[0_0_30px_rgba(0,0,0,0.6)]"} ${colorClass}`}
        >
          <div className="vinyl-grooves absolute inset-0 rounded-full" />
          <div className="vinyl-sheen absolute inset-0 rounded-full" />
          <div className="absolute inset-0 rounded-full border border-white/5" />
          <div className="absolute inset-[30%] rounded-full bg-gradient-to-b from-transparent via-black/10 to-transparent" />
        </div>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`relative rounded-full overflow-hidden border border-white/10 shadow-inner ${labelSizes[size]}`}>
            {currentPhoto ? (
              <Image
                src={currentPhoto}
                alt="Album art"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-900 to-amber-950 flex items-center justify-center">
                <div className={`text-amber-400/40 font-mono tracking-widest text-center px-1 ${size === "small" ? "text-[5px]" : "text-[9px]"}`}>
                  REWOUND
                </div>
              </div>
            )}
            <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`rounded-full bg-[#0a0a0a] border border-white/10 ${size === "small" ? "w-1.5 h-1.5" : "w-3 h-3"}`} />
            </div>
          </div>
        </div>

        {/* Light reflection */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 35% 30%, rgba(255,255,255,0.06) 0%, transparent 50%)`,
          }}
        />
      </div>
    );
  }
);

export default VinylRecord;
