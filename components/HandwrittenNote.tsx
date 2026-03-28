"use client";
import { useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface HandwrittenNoteRef {
  getDataUrl: () => string | null;
  hasContent: () => boolean;
}

interface HandwrittenNoteProps {
  mode: "create" | "view";
  noteData?: string | null;
}

const HandwrittenNote = forwardRef<HandwrittenNoteRef, HandwrittenNoteProps>(
  function HandwrittenNote({ mode, noteData }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // Expose methods to parent so it can grab the drawing data on demand
    useImperativeHandle(ref, () => ({
      getDataUrl: () => {
        if (!hasDrawn || !canvasRef.current) return null;
        return canvasRef.current.toDataURL("image/png");
      },
      hasContent: () => hasDrawn,
    }));

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
        if (!hasDrawn) setHasDrawn(true);
      },
      [isDrawing, mode, getPos, hasDrawn]
    );

    const handlePointerUp = useCallback(
      (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDrawing(false);
      },
      []
    );

    const handleClear = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      setHasDrawn(false);
    }, []);

    // View mode
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

    // Create mode
    return (
      <div className="w-full flex flex-col items-center gap-2">
        <div
          className="relative w-full max-w-[320px] aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-zinc-900/80"
          style={{ touchAction: "none" }}
        >
          {/* Paper lines */}
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
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
                draw with your finger
              </p>
            </div>
          )}
        </div>

        {/* Clear button */}
        {hasDrawn && (
          <motion.button
            className="text-xs text-white/20 hover:text-white/40 transition-all"
            onClick={handleClear}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            clear drawing
          </motion.button>
        )}
      </div>
    );
  }
);

export default HandwrittenNote;
