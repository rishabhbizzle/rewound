import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS = 10;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const title = (formData.get("title") as string) || "Untitled";
    const artist = (formData.get("artist") as string) || "Anonymous";
    const vinylColor = (formData.get("vinylColor") as string) || "black";
    const noteDataRaw = formData.get("noteData") as string | null;
    const audioFile = formData.get("audio") as File | null;
    const photoFiles = formData.getAll("photos") as File[];

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: `Audio file too large: ${(audioFile.size / 1024 / 1024).toFixed(1)}MB (max 10MB)` },
        { status: 400 }
      );
    }

    if (photoFiles.length > MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Too many photos: ${photoFiles.length} (max ${MAX_PHOTOS})` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const vinylId = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();

    // Upload audio
    const audioExt = audioFile.name.split(".").pop() || "webm";
    const audioPath = `${vinylId}/${timestamp}.${audioExt}`;
    const audioBuffer = await audioFile.arrayBuffer();

    const { error: audioError } = await supabase.storage
      .from("audio")
      .upload(audioPath, audioBuffer, {
        contentType: audioFile.type || "audio/webm",
        upsert: false,
      });

    if (audioError) {
      console.error("Audio upload error:", audioError);
      return NextResponse.json(
        { error: `Audio upload failed: ${audioError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl: audioUrl },
    } = supabase.storage.from("audio").getPublicUrl(audioPath);

    // Upload photos
    const photoUrls: string[] = [];
    const photoErrors: string[] = [];

    for (let i = 0; i < photoFiles.length; i++) {
      const photo = photoFiles[i];
      if (photo.size > MAX_PHOTO_SIZE) {
        photoErrors.push(`Photo ${i + 1} skipped: ${(photo.size / 1024 / 1024).toFixed(1)}MB (max 5MB)`);
        continue;
      }

      const photoExt = photo.name.split(".").pop() || "jpg";
      const photoPath = `${vinylId}/${timestamp}_${i}.${photoExt}`;
      const photoBuffer = await photo.arrayBuffer();

      const { error: photoError } = await supabase.storage
        .from("photos")
        .upload(photoPath, photoBuffer, {
          contentType: photo.type || "image/jpeg",
          upsert: false,
        });

      if (photoError) {
        console.error(`Photo ${i} upload error:`, photoError);
        photoErrors.push(`Photo ${i + 1} failed: ${photoError.message}`);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("photos").getPublicUrl(photoPath);
      photoUrls.push(publicUrl);
    }

    // Insert vinyl record into database
    const { error: dbError } = await supabase.from("vinyls").insert({
      id: vinylId,
      title: title.slice(0, 50),
      artist: artist.slice(0, 30),
      vinyl_color: vinylColor,
      audio_url: audioUrl,
      photos: photoUrls,
      note_data: noteDataRaw || null,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return NextResponse.json(
        { error: `Database error: ${dbError.message} (code: ${dbError.code})` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: vinylId,
      ...(photoErrors.length > 0 && { warnings: photoErrors }),
    });
  } catch (error) {
    console.error("Vinyl creation error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Unexpected error: ${message}` },
      { status: 500 }
    );
  }
}
