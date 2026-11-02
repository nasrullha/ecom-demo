/**
 * Browser-side image compression.
 *
 * Photos from a phone or camera are often 3-10 MB. We shrink and re-encode them
 * BEFORE they leave the visitor's device, so uploads are fast and the server
 * only ever receives a few hundred KB. The server compresses again and checks
 * the file (see image-server.ts), so this step is a convenience, not security.
 */

export class ImageError extends Error {}

export interface CompressOptions {
  /** Longest side in pixels */
  maxDimension: number;
  /** Target size; quality/size are reduced until the file fits */
  maxBytes: number;
  startQuality?: number;
}

export const PRODUCT_IMAGE_OPTIONS: CompressOptions = {
  maxDimension: 1600,
  maxBytes: 350 * 1024,
  startQuality: 0.82,
};

// Slips must stay readable (account numbers, amounts), so keep more detail.
export const SLIP_IMAGE_OPTIONS: CompressOptions = {
  maxDimension: 1600,
  maxBytes: 450 * 1024,
  startQuality: 0.8,
};

const MAX_INPUT_BYTES = 30 * 1024 * 1024;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File, options: CompressOptions): Promise<File> {
  const looksLikeImage =
    /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!looksLikeImage) {
    throw new ImageError("Please choose a JPG, PNG or WebP image.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageError("That image is too large (30 MB maximum).");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError("This image could not be read. Try a different file.");
  }

  const canvas = document.createElement("canvas");
  let scale = Math.min(1, options.maxDimension / Math.max(bitmap.width, bitmap.height));
  let quality = options.startQuality ?? 0.82;
  let best: Blob | null = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageError("Your browser could not process this image.");
    ctx.fillStyle = "#ffffff"; // flatten transparency onto white
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Safari cannot encode WebP and silently returns PNG, so check the result.
    let blob = await canvasToBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }
    if (!blob) throw new ImageError("Your browser could not process this image.");

    best = blob;
    if (blob.size <= options.maxBytes) break;

    if (quality > 0.56) quality -= 0.1;
    else scale *= 0.85;
  }

  bitmap.close();
  if (!best) throw new ImageError("Your browser could not process this image.");

  const extension = best.type === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 40) || "image";
  return new File([best], `${baseName}.${extension}`, { type: best.type });
}
