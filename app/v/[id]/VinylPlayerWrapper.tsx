"use client";
import { useEffect, useRef } from "react";
import VinylPlayer from "@/components/VinylPlayer";

interface Props {
  id: string;
  title: string;
  artist: string;
  vinylColor: "black" | "red" | "blue" | "clear";
  audioUrl: string;
  photos: string[];
  noteData?: string | null;
  firstPlayedAt: string | null;
  useSupabase: boolean;
}

export default function VinylPlayerWrapper({
  id,
  title,
  artist,
  vinylColor,
  audioUrl,
  photos,
  noteData,
  firstPlayedAt,
  useSupabase,
}: Props) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current || !useSupabase) return;
    hasTracked.current = true;
    fetch(`/api/vinyl/${id}`, { method: "PATCH" }).catch(() => {});
  }, [id, useSupabase]);

  return (
    <VinylPlayer
      title={title}
      artist={artist}
      vinylColor={vinylColor}
      audioUrl={audioUrl}
      photos={photos}
      noteData={noteData}
      firstPlayedAt={firstPlayedAt}
    />
  );
}
