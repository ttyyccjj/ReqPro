export const IMAGE_TARGET_BYTES = 200 * 1024;
export const IMAGE_FALLBACK_BYTES = 500 * 1024;
export const IMAGE_MAX_EDGE = 1600;
const MIN_QUALITY = 0.6;
const QUALITIES = [0.8, 0.72, MIN_QUALITY] as const;

const COMPRESSIBLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export function canOptimizeImage(file: File) {
  return (
    COMPRESSIBLE.has(file.type.toLowerCase()) ||
    /\.(jpe?g|png|webp)$/i.test(file.name)
  );
}

function withJpegName(name: string) {
  const base = name.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "").trim();
  return `${base || "image"}.jpg`;
}

function scaleToMaxEdge(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function loadBitmap(file: File) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
  }
}

export async function optimizeImageFile(file: File): Promise<File> {
  if (
    typeof createImageBitmap !== "function" ||
    !canOptimizeImage(file) ||
    file.size <= IMAGE_TARGET_BYTES
  ) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await loadBitmap(file);
  } catch {
    return file;
  }

  try {
    const size = scaleToMaxEdge(bitmap.width, bitmap.height, IMAGE_MAX_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);

    let best: File | null = null;
    for (const quality of QUALITIES) {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (!blob || blob.size === 0) continue;
      const next = new File([blob], withJpegName(file.name), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      best = next;
      if (blob.size <= IMAGE_TARGET_BYTES) return next;
    }

    if (!best) return file;
    if (best.size <= IMAGE_FALLBACK_BYTES || best.size < file.size) return best;
    return file;
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
