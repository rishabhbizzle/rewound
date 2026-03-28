"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HandwrittenNoteProps {
  // Create mode: user draws, we emit the drawing data
  mode: "create" | "view";
  noteData?: string | null; // data URL of the drawing
  onSave?: (dataUrl: string) => void;
  onClear?: () => void;
}

export default function HandwrittenNote({
  mode,
  noteData,
  onSave,
  onClear,
}: HandwrittenNoteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Set up canvas at proper resolution
  useEffect(() => {
    if (mode !== "create") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#e8d5b0";
    ctx.lineWidth = 2.5;
  }, [mode]);

  const getPos = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== "create") return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDrawing(true);
      lastPos.current = getPos(e);
    },
    [mode, getPos]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing || mode !== "create") return;
      e.preventDefault();
      e.stopPropagation();

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const pos = getPos(e);

      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      lastPos.current = pos;
      setHasDrawn(true);
    },
    [isDrawing, mode, getPos]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDrawing(false);
    },
    []
  );

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onSave) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  }, [onSave]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
    onClear?.();
  }, [onClear]);

  // View mode — display saved note
  if (mode === "view") {
    if (!noteData) return null;

    return (
      <AnimatePresence>
        <motion.div
          className="w-full max-w-[280px] md:max-w-[340px] mx-auto aspect-[4/3] rounded-lg overflow-hidden border border-white/5 bg-zinc-900/50"
          initial={{ opacity: 0, rotateY: 90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <img
            src={noteData}
            alt="Handwritten note"
            className="w-full h-full object-contain"
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Create mode — drawing canvas
  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div
        className="relative w-full max-w-[320px] aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-zinc-900/80"
        style={{ touchAction: "none" }}
      >
        {/* Paper texture hint */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,255,255,0.1) 23px, rgba(255,255,255,0.1) 24px)`,
          }}
        />

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Hint when empty */}
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white/15 text-sm font-mono">
              draw a note with your finger
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {hasDrawn && (
          <>
            <button
              className="px-4 py-1.5 rounded-full bg-white/5 text-white/30 text-xs border border-white/5 hover:bg-white/8 transition-all"
              onClick={handleClear}
            >
              clear
            </button>
            <button
              className="px-4 py-1.5 rounded-full bg-amber-700/30 text-amber-200/70 text-xs border border-amber-500/20 hover:bg-amber-700/50 transition-all"
              onClick={handleSave}
            >
              save note
            </button>
          </>
        )}
      </div>
    </div>
  );
}
