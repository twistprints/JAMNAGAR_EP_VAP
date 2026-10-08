/**
 * Mobile-Safe Client-Side Image Optimizer
 * Designed for Android/iOS devices with limited memory and bandwidth.
 * Resizes smartphone camera captures (12MP-48MP) to crisp OCR-ready 2000-2400px JPEGs (<2MB)
 * without leaking canvas/blob memory or crashing low-RAM devices.
 */

export interface OptimizationConfig {
  maxDimension?: number;
  quality?: number;
  maxFileSizeMB?: number;
}

export interface OptimizationResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  originalWidth: number;
  originalHeight: number;
  optimizedWidth: number;
  optimizedHeight: number;
  durationMs: number;
}

export const DEFAULT_OPTIMIZATION_CONFIG: Required<OptimizationConfig> = {
  maxDimension: 2400, // Longest dimension for high-accuracy OCR text
  quality: 0.82,      // Quality balance for text sharpness vs small payload
  maxFileSizeMB: 2.5,  // Target max file size
};

/**
 * Checks if the file is HEIC/HEIF
 */
export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    type.includes("heic") ||
    type.includes("heif")
  );
}

/**
 * Optimizes an image file client-side before uploading.
 * Handles downscaling, compression, and memory release.
 */
export async function optimizeImageForUpload(
  file: File,
  customConfig?: OptimizationConfig
): Promise<OptimizationResult> {
  const startTime = performance.now();
  const config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...customConfig };

  // 1. Check for unsupported HEIC format
  if (isHeicFile(file)) {
    throw new Error(
      "This image is in HEIC format. Please take a photo directly or upload a JPG/PNG document."
    );
  }

  // If file is already very small (e.g. < 400KB) and not a huge dimension image, pass through safely
  if (file.size < 400 * 1024 && (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")) {
    const durationMs = Math.round(performance.now() - startTime);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[ImageOptimizer] Small file (${Math.round(file.size / 1024)} KB) - passing through without resize.`);
    }
    return {
      file,
      originalSize: file.size,
      optimizedSize: file.size,
      originalWidth: 0,
      originalHeight: 0,
      optimizedWidth: 0,
      optimizedHeight: 0,
      durationMs,
    };
  }

  let objectUrl: string | null = null;
  let canvas: HTMLCanvasElement | null = null;

  try {
    objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";

    // Wait for image to load
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Unable to decode image file. The file may be corrupt."));
      img.src = objectUrl!;
    });

    const originalWidth = img.naturalWidth || img.width;
    const originalHeight = img.naturalHeight || img.height;

    // Calculate constrained dimensions
    let { width, height } = calculateConstrainedDimensions(
      originalWidth,
      originalHeight,
      config.maxDimension
    );

    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: false, alpha: false });
    if (!ctx) {
      throw new Error("Unable to create canvas rendering context.");
    }

    // Set white background in case of transparent PNGs
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Render downscaled image
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to JPEG Blob
    let blob = await new Promise<Blob | null>((resolve) => {
      canvas!.toBlob(
        (b) => resolve(b),
        "image/jpeg",
        config.quality
      );
    });

    if (!blob) {
      throw new Error("Canvas compression failed.");
    }

    // If still larger than target, perform secondary pass with lower quality
    if (blob.size > config.maxFileSizeMB * 1024 * 1024) {
      const fallbackDim = 1800;
      const secondDims = calculateConstrainedDimensions(originalWidth, originalHeight, fallbackDim);
      canvas.width = secondDims.width;
      canvas.height = secondDims.height;
      width = secondDims.width;
      height = secondDims.height;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const smallerBlob = await new Promise<Blob | null>((resolve) => {
        canvas!.toBlob((b) => resolve(b), "image/jpeg", 0.75);
      });

      if (smallerBlob && smallerBlob.size < blob.size) {
        blob = smallerBlob;
      }
    }

    // Create optimized File object
    const cleanFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    const optimizedFile = new File([blob], cleanFileName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    const durationMs = Math.round(performance.now() - startTime);

    // Development Diagnostics Logging
    console.log("----------------------------------------");
    console.log("MOBILE IMAGE OPTIMIZATION COMPLETE");
    console.log(`Original: ${(file.size / (1024 * 1024)).toFixed(2)} MB (${originalWidth}x${originalHeight})`);
    console.log(`Optimized: ${(optimizedFile.size / (1024 * 1024)).toFixed(2)} MB (${width}x${height})`);
    console.log(`Compression Ratio: ${Math.round((1 - optimizedFile.size / file.size) * 100)}% reduction`);
    console.log(`Processing Time: ${durationMs} ms`);
    console.log("----------------------------------------");

    return {
      file: optimizedFile,
      originalSize: file.size,
      optimizedSize: optimizedFile.size,
      originalWidth,
      originalHeight,
      optimizedWidth: width,
      optimizedHeight: height,
      durationMs,
    };
  } finally {
    // Explicitly release object URLs and canvas memory to prevent mobile RAM leaks
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
  }
}

function calculateConstrainedDimensions(
  origW: number,
  origH: number,
  maxDim: number
): { width: number; height: number } {
  if (origW <= 0 || origH <= 0) return { width: 1920, height: 1080 };
  if (origW <= maxDim && origH <= maxDim) {
    return { width: origW, height: origH };
  }

  let width = origW;
  let height = origH;

  if (origW > origH) {
    if (origW > maxDim) {
      height = Math.round((origH * maxDim) / origW);
      width = maxDim;
    }
  } else {
    if (origH > maxDim) {
      width = Math.round((origW * maxDim) / origH);
      height = maxDim;
    }
  }

  return { width, height };
}
