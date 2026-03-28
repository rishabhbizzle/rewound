// Client-side image processing — resize + compress before upload
// Uses browser Canvas API, no server needed
// Falls back to original file if processing fails for any reason

const MAX_DIMENSION = 1200; // Max width or height
const QUALITY = 0.82; // WebP/JPEG quality (0.82 is visually lossless)

export async function processImage(file: File): Promise<File> {
  try {
    // Skip non-image files
    if (!file.type.startsWith("image/")) return file;

    // Skip if already small enough
    if (file.size < 200 * 1024) return file;

    // Skip GIFs (animated, can't process with canvas)
    if (file.type === "image/gif") return file;

    // Check if OffscreenCanvas is supported
    if (typeof OffscreenCanvas === "undefined") {
      return processImageFallback(file);
    }

    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    // Calculate new dimensions keeping aspect ratio
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

    const canvas = new OffscreenCanvas(newW, newH);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file; // fallback to original
    }

    ctx.drawImage(bitmap, 0, 0, newW, newH);
    bitmap.close();

    // Try WebP first, fall back to JPEG
    let blob: Blob;
    try {
      blob = await canvas.convertToBlob({ type: "image/webp", quality: QUALITY });
    } catch {
      // WebP not supported (older Safari), use JPEG
      blob = await canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });
    }

    // If somehow bigger after processing, use original
    if (blob.size >= file.size) return file;

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const name = file.name.replace(/\.[^.]+$/, `.${ext}`);

    return new File([blob], name, { type: blob.type });
  } catch {
    // Any failure → return original file unmodified
    return file;
  }
}

// Fallback for browsers without OffscreenCanvas (older Safari)
function processImageFallback(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let newW = img.width;
        let newH = img.height;

        if (newW > MAX_DIMENSION || newH > MAX_DIMENSION) {
          if (newW > newH) {
            newW = MAX_DIMENSION;
            newH = Math.round((img.height / img.width) * MAX_DIMENSION);
          } else {
            newH = MAX_DIMENSION;
            newW = Math.round((img.width / img.height) * MAX_DIMENSION);
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, newW, newH);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
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
        resolve(file);
      }
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

// Process multiple images in parallel — each one independently falls back
export async function processImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(processImage));
}
