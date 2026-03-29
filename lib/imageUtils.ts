// Client-side image processing — resize + compress before upload
// Handles HEIC (iPhone), HEIF, and all standard formats
// Falls back to original file if processing fails

const MAX_DIMENSION = 1200;
const QUALITY = 0.82;

// iPhone photos are often HEIC — canvas can't read them directly.
// We use the browser's built-in decoding via createImageBitmap which
// handles HEIC on Safari/iOS. For the output we always convert to
// JPEG (universal support, good compression).
export async function processImage(file: File): Promise<File> {
  try {
    // Skip non-image files
    if (!file.type.startsWith("image/") && !isHeic(file)) return file;

    // Skip if already small enough AND not HEIC
    if (file.size < 200 * 1024 && !isHeic(file)) return file;

    // Skip GIFs (animated)
    if (file.type === "image/gif") return file;

    // Use createImageBitmap — it handles HEIC on iOS Safari natively
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      // If createImageBitmap fails (HEIC on non-Safari), try via img element
      return processImageViaImgElement(file);
    }

    const { width, height } = bitmap;

    let newW = width;
    let newH = height;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        newW = MAX_DIMENSION;
        newH = Math.round((height / width) * MAX_DIMENSION);
      } else {
        newH = MAX_DIMENSION;
        newW = Math.round((width / height) * MAX_DIMENSION);
      }
    }

    // Try OffscreenCanvas first, fall back to regular canvas
    let blob: Blob | null = null;

    if (typeof OffscreenCanvas !== "undefined") {
      try {
        const canvas = new OffscreenCanvas(newW, newH);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, newW, newH);
          // Always output JPEG — universal support, HEIC compat
          blob = await canvas.convertToBlob({
            type: "image/jpeg",
            quality: QUALITY,
          });
        }
      } catch {
        // fall through to regular canvas
      }
    }

    if (!blob) {
      // Fallback: regular canvas
      const canvas = document.createElement("canvas");
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        bitmap.close();
        return file;
      }
      ctx.drawImage(bitmap, 0, 0, newW, newH);
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", QUALITY);
      });
    }

    bitmap.close();

    if (!blob || blob.size >= file.size) {
      // If HEIC, we MUST convert even if bigger — Supabase rejects HEIC
      if (isHeic(file) && blob) {
        const name = file.name.replace(/\.[^.]+$/, ".jpg");
        return new File([blob], name, { type: "image/jpeg" });
      }
      return file;
    }

    const name = file.name.replace(/\.[^.]+$/, ".jpg");
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // Last resort: if it's HEIC and everything failed, still try img element path
    if (isHeic(file)) {
      return processImageViaImgElement(file);
    }
    return file;
  }
}

// Check if file is HEIC/HEIF (common iPhone format)
function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "" || // iOS sometimes sends empty type for HEIC
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

// Fallback: load via <img> element (works for formats the browser can display)
function processImageViaImgElement(file: File): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      try {
        let newW = img.naturalWidth;
        let newH = img.naturalHeight;

        if (newW > MAX_DIMENSION || newH > MAX_DIMENSION) {
          if (newW > newH) {
            newW = MAX_DIMENSION;
            newH = Math.round((img.naturalHeight / img.naturalWidth) * MAX_DIMENSION);
          } else {
            newH = MAX_DIMENSION;
            newW = Math.round((img.naturalWidth / img.naturalHeight) * MAX_DIMENSION);
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, newW, newH);
        URL.revokeObjectURL(url);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const name = file.name.replace(/\.[^.]+$/, ".jpg");
            resolve(new File([blob], name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          QUALITY
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export async function processImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(processImage));
}
