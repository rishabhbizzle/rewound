"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { saveVinyl, generateId } from "@/lib/store";
import { processImages } from "@/lib/imageUtils";
import HandwrittenNote, { HandwrittenNoteRef } from "@/components/HandwrittenNote";
import SortablePhotoGrid from "@/components/SortablePhotoGrid";

type Step = "audio" | "photos" | "customize" | "note" | "pressing";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

const VINYL_COLORS = [
  { id: "black" as const, label: "Classic Black", bg: "bg-zinc-900", border: "border-zinc-600" },
  { id: "red" as const, label: "Deep Red", bg: "bg-red-950", border: "border-red-700" },
  { id: "blue" as const, label: "Midnight Blue", bg: "bg-blue-950", border: "border-blue-700" },
  { id: "clear" as const, label: "Crystal Clear", bg: "bg-zinc-600", border: "border-zinc-400" },
];

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("audio");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [vinylColor, setVinylColor] = useState<"black" | "red" | "blue" | "clear">("black");
  const [noteData, setNoteData] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [micError, setMicError] = useState(false);

  const noteRef = useRef<HandwrittenNoteRef>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Dismiss keyboard by blurring active element
  const dismissKeyboard = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const startRecording = useCallback(async () => {
    setMicError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer MP4 (works on iOS + all browsers). Fall back to webm.
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "";

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const actualMime = mediaRecorder.mimeType || "audio/webm";
        const ext = actualMime.includes("mp4") ? "m4a"
          : actualMime.includes("webm") ? "webm"
          : actualMime.includes("ogg") ? "ogg"
          : "wav";

        const blob = new Blob(chunksRef.current, { type: actualMime });
        const url = URL.createObjectURL(blob);
        const file = new File([blob], `recording.${ext}`, { type: actualMime });
        setAudioUrl(url);
        setAudioFile(file);
        setAudioFileName("Recording");
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      setMicError(true);
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate it's actually audio
    if (!file.type.startsWith("audio/")) {
      setError("Please select an audio file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Audio file must be under 10MB");
      return;
    }

    setAudioUrl(URL.createObjectURL(file));
    setAudioFile(file);
    setAudioFileName(file.name);
    setError(null);
  }, []);

  const [processingPhotos, setProcessingPhotos] = useState(false);

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10 - photoUrls.length);
    if (files.length === 0) return;

    setProcessingPhotos(true);

    try {
      // Process images client-side: resize to 1200px max, compress to WebP
      const processed = await processImages(files);

      const urls = processed.map((f) => URL.createObjectURL(f));
      setPhotoUrls((prev) => [...prev, ...urls].slice(0, 10));
      setPhotoFiles((prev) => [...prev, ...processed].slice(0, 10));
    } catch {
      setError("Failed to process photos");
      setTimeout(() => setError(null), 3000);
    } finally {
      setProcessingPhotos(false);
    }
  }, [photoUrls.length]);

  const removePhoto = useCallback((index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reorderPhotos = useCallback((newUrls: string[], newIndices: number[]) => {
    setPhotoUrls(newUrls);
    setPhotoFiles((prev) => newIndices.map((i) => prev[i]));
  }, []);

  const handlePress = useCallback(async () => {
    if (!audioFile) return;
    setStep("pressing");
    setError(null);
    setUploadProgress(0);

    // Grab the drawing from canvas right now
    const finalNoteData = noteRef.current?.getDataUrl() ?? noteData;

    const useSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (useSupabase) {
      try {
        const formData = new FormData();
        formData.append("title", title || "Untitled");
        formData.append("artist", artist || "Anonymous");
        formData.append("vinylColor", vinylColor);
        formData.append("audio", audioFile);
        if (finalNoteData) formData.append("noteData", finalNoteData);
        photoFiles.forEach((f) => formData.append("photos", f));

        // Use XMLHttpRequest for upload progress
        const result = await new Promise<{ id: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              try {
                const data = JSON.parse(xhr.responseText);
                reject(new Error(data.error || "Upload failed"));
              } catch {
                reject(new Error("Upload failed"));
              }
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Network error — check your connection")));
          xhr.addEventListener("timeout", () => reject(new Error("Upload timed out — try again")));

          xhr.timeout = 120000; // 2 minute timeout
          xhr.open("POST", "/api/vinyl");
          xhr.send(formData);
        });

        router.push(`/share/${result.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStep("note");
      }
    } else {
      // Local dev: convert blob URLs to data URLs so they survive navigation
      setUploadProgress(20);

      const audioDataUrl = audioFile
        ? await fileToDataUrl(audioFile)
        : audioUrl || "";

      setUploadProgress(50);

      const photoDataUrls: string[] = [];
      for (const file of photoFiles) {
        photoDataUrls.push(await fileToDataUrl(file));
      }

      setUploadProgress(80);

      const id = generateId();
      saveVinyl({
        id,
        title: title || "Untitled",
        artist: artist || "Anonymous",
        vinylColor,
        audioUrl: audioDataUrl,
        photos: photoDataUrls,
        noteData: finalNoteData,
        createdAt: Date.now(),
      });

      setUploadProgress(100);
      setTimeout(() => {
        router.push(`/share/${id}`);
      }, 500);
    }
  }, [title, artist, vinylColor, audioFile, audioUrl, photoFiles, photoUrls, noteData, router]);

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const goToStep = (next: Step) => {
    dismissKeyboard();
    setStep(next);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-zinc-950 via-[#0a0a0a] to-zinc-950 flex flex-col items-center px-4 pt-8 pb-20 overflow-y-auto">
      {/* Header */}
      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-white/80 tracking-tight">
          Press a Vinyl
        </h1>
        <p className="text-sm text-white/30 mt-1">
          {step === "audio" && "Start with a voice note"}
          {step === "photos" && "Add some photos"}
          {step === "customize" && "Make it yours"}
          {step === "note" && "Leave a personal note"}
          {step === "pressing" && "Pressing your vinyl..."}
        </p>
      </motion.div>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-sm text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step indicator */}
      <div className="flex gap-2 mb-10">
        {(["audio", "photos", "customize", "note"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-1 w-10 rounded-full transition-all duration-500 ${
              step === s
                ? "bg-amber-500/60"
                : (["audio", "photos", "customize", "note"] as Step[]).indexOf(step) > i
                  ? "bg-amber-700/40"
                  : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Audio */}
        {step === "audio" && (
          <motion.div
            key="audio"
            className="w-full max-w-sm flex flex-col items-center gap-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {!audioUrl ? (
              <>
                <motion.button
                  className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? "bg-red-500/20 border-2 border-red-500/60"
                      : "bg-white/5 border-2 border-white/10 hover:border-white/20"
                  }`}
                  onClick={isRecording ? stopRecording : startRecording}
                  whileTap={{ scale: 0.95 }}
                >
                  {isRecording ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 rounded-sm bg-red-500/80" />
                      <span className="text-xs text-red-400 font-mono">
                        {formatRecordingTime(recordingTime)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-500/60" />
                      <span className="text-xs text-white/30 font-mono">
                        record
                      </span>
                    </div>
                  )}
                </motion.button>

                {/* Mic error — styled, not an alert */}
                {micError && (
                  <motion.p
                    className="text-xs text-red-400/60 text-center max-w-[220px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    Microphone access denied. Please allow it in your browser settings.
                  </motion.p>
                )}

                <div className="flex items-center gap-4 text-white/20 text-sm">
                  <div className="h-px w-12 bg-white/10" />
                  or
                  <div className="h-px w-12 bg-white/10" />
                </div>

                <button
                  className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white/50 text-sm hover:bg-white/10 hover:text-white/70 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload audio file
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </>
            ) : (
              <motion.div
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm text-white/50">{audioFileName}</p>
                <button
                  className="text-xs text-white/20 hover:text-white/40 underline"
                  onClick={() => {
                    setAudioUrl(null);
                    setAudioFile(null);
                    setAudioFileName("");
                  }}
                >
                  remove & re-record
                </button>
              </motion.div>
            )}

            {audioUrl && (
              <motion.button
                className="mt-8 px-8 py-3 rounded-full bg-white/10 text-white/70 font-medium hover:bg-white/15 transition-all"
                onClick={() => goToStep("photos")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.97 }}
              >
                Next
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Step 2: Photos */}
        {step === "photos" && (
          <motion.div
            key="photos"
            className="w-full max-w-sm flex flex-col items-center gap-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SortablePhotoGrid
              photoUrls={photoUrls}
              onReorder={reorderPhotos}
              onRemove={removePhoto}
              onAdd={() => photoInputRef.current?.click()}
              processingPhotos={processingPhotos}
              maxPhotos={10}
            />

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />

            <p className="text-xs text-white/20">
              {photoUrls.length}/10 photos — these become your album art
            </p>

            <div className="flex gap-3 mt-4">
              <button
                className="px-6 py-3 rounded-full bg-white/5 text-white/30 text-sm hover:bg-white/10 transition-all"
                onClick={() => goToStep("audio")}
              >
                Back
              </button>
              <motion.button
                className="px-8 py-3 rounded-full bg-white/10 text-white/70 font-medium hover:bg-white/15 transition-all"
                onClick={() => goToStep("customize")}
                whileTap={{ scale: 0.97 }}
              >
                Next
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Customize */}
        {step === "customize" && (
          <motion.div
            key="customize"
            className="w-full max-w-sm flex flex-col items-center gap-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="w-full space-y-4">
              <div>
                <label className="text-xs text-white/30 font-mono block mb-2">
                  Album Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Late Night Thoughts"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/20 transition-all"
                  maxLength={50}
                  autoComplete="off"
                  enterKeyHint="next"
                  onKeyDown={(e) => e.key === "Enter" && dismissKeyboard()}
                />
              </div>

              <div>
                <label className="text-xs text-white/30 font-mono block mb-2">
                  From
                </label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Sarah"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/20 transition-all"
                  maxLength={30}
                  autoComplete="off"
                  enterKeyHint="done"
                  onKeyDown={(e) => e.key === "Enter" && dismissKeyboard()}
                />
              </div>

              <div>
                <label className="text-xs text-white/30 font-mono block mb-2">
                  Vinyl Color
                </label>
                <div className="flex gap-3">
                  {VINYL_COLORS.map((color) => (
                    <button
                      key={color.id}
                      className={`w-14 h-14 rounded-full ${color.bg} border-2 transition-all flex items-center justify-center ${
                        vinylColor === color.id
                          ? `${color.border} scale-110`
                          : "border-white/10 hover:border-white/20"
                      }`}
                      onClick={() => setVinylColor(color.id)}
                    >
                      {vinylColor === color.id && (
                        <div className="w-2 h-2 rounded-full bg-white/60" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                className="px-6 py-3 rounded-full bg-white/5 text-white/30 text-sm hover:bg-white/10 transition-all"
                onClick={() => goToStep("photos")}
              >
                Back
              </button>
              <motion.button
                className="px-8 py-3 rounded-full bg-white/10 text-white/70 font-medium hover:bg-white/15 transition-all"
                onClick={() => goToStep("note")}
                whileTap={{ scale: 0.97 }}
              >
                Next
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Handwritten note */}
        {step === "note" && (
          <motion.div
            key="note"
            className="w-full max-w-sm flex flex-col items-center gap-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <HandwrittenNote
              ref={noteRef}
              mode="create"
            />

            <p className="text-xs text-white/20 text-center max-w-[250px]">
              this note is revealed after they listen to the full voicenote
            </p>

            <div className="flex gap-3 mt-2">
              <button
                className="px-6 py-3 rounded-full bg-white/5 text-white/30 text-sm hover:bg-white/10 transition-all"
                onClick={() => goToStep("customize")}
              >
                Back
              </button>
              <motion.button
                className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-700/60 to-amber-600/40 text-amber-100 font-medium hover:from-amber-700/80 hover:to-amber-600/60 transition-all border border-amber-500/20"
                onClick={handlePress}
                whileTap={{ scale: 0.97 }}
              >
                Press Vinyl
              </motion.button>
            </div>

            <button
              className="text-[10px] text-white/15 hover:text-white/30 transition-all"
              onClick={handlePress}
            >
              skip, no note
            </button>
          </motion.div>
        )}

        {/* Pressing animation with progress */}
        {step === "pressing" && (
          <motion.div
            key="pressing"
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="w-24 h-24 rounded-full border-2 border-amber-500/30"
              animate={{ rotate: 360, scale: [1, 0.95, 1] }}
              transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } }}
            >
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-amber-900/50 border border-amber-700/30" />
              </div>
            </motion.div>

            {/* Upload progress bar */}
            <div className="w-48 flex flex-col items-center gap-2">
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-amber-500/40 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-sm text-white/30 font-mono">
                {uploadProgress < 100
                  ? `uploading ${uploadProgress}%`
                  : "finalizing..."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
