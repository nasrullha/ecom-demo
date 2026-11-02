import "server-only";
import sharp from "sharp";

export class ImageProcessingError extends Error {}

export interface ProcessOptions {
  /** Longest side in pixels */
  maxDimension: number;
  /** Starting WebP quality (1-100) */
  quality: number;
  /** Quality is lowered until the result is at most this many bytes */
  maxBytes: number;
  /** Reject uploads bigger than this before touching them */
  maxInputBytes?: number;
}

export const PRODUCT_PROCESS_OPTIONS: ProcessOptions = {
  maxDimension: 1600,
  quality: 82,
  maxBytes: 350 * 1024,
};

export const SLIP_PROCESS_OPTIONS: ProcessOptions = {
  maxDimension: 1600,
  quality: 80,
  maxBytes: 450 * 1024,
};

const ALLOWED_FORMATS = ["jpeg", "png", "webp"];
const MAX_PIXELS = 50_000_000;

/**
 * Validates an uploaded file by reading its real contents (not its name or the
 * type the browser claims), fixes rotation, strips metadata such as GPS
 * location, resizes, and re-encodes as WebP. Anything that is not a genuine
 * JPG/PNG/WebP image is rejected.
 */
export async function processImage(file: unknown, options: ProcessOptions) {
  if (!(file instanceof File) || file.size === 0) {
    throw new ImageProcessingError("No image was received. Please choose a file.");
  }
  const maxInput = options.maxInputBytes ?? 4 * 1024 * 1024;
  if (file.size > maxInput) {
    throw new ImageProcessingError("That image is too large. Please choose a smaller photo.");
  }

  const input = Buffer.from(await file.arrayBuffer());

  let format: string | undefined;
  try {
    const meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
    format = meta.format;
  } catch {
    throw new ImageProcessingError("This file is not a valid image.");
  }
  if (!format || !ALLOWED_FORMATS.includes(format)) {
    throw new ImageProcessingError("Only JPG, PNG or WebP images are allowed.");
  }

  let quality = options.quality;
  let output: Buffer = input;
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      output = await sharp(input, { limitInputPixels: MAX_PIXELS })
        .rotate() // apply the camera's orientation, then metadata is dropped
        .resize({
          width: options.maxDimension,
          height: options.maxDimension,
          fit: "inside",
          withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .webp({ quality, effort: 4 })
        .toBuffer();
      if (output.length <= options.maxBytes || quality <= 45) break;
      quality -= 12;
    }
  } catch {
    throw new ImageProcessingError("This image could not be processed. Try a different file.");
  }

  return { buffer: output, contentType: "image/webp" as const, bytes: output.length };
}
