/**
 * Screen Capture & Auto-Cropping utilities for Parul Study Assistant
 * Supports continuous frame capture, auto-crop of letterboxing/margins,
 * 1-second auto-capture, duplicate suppression, and full PDF page-by-page slide rendering.
 */

import { ensurePdfJsLoaded } from './clientDocExtractor';

export async function startScreenCapture() {
  // Request display media with full window/screen/tab support
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: "always",
      frameRate: { ideal: 30, max: 60 }
    },
    audio: false
  });
  return stream;
}

/**
 * Automatically crops solid letterboxing (black bars) or excessive margins (white/light gray)
 * from a canvas to return a tightly cropped slide canvas.
 */
export function autoCropCanvas(sourceCanvas) {
  if (!sourceCanvas || sourceCanvas.width < 10 || sourceCanvas.height < 10) {
    return sourceCanvas;
  }

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  let imgData;
  try {
    imgData = ctx.getImageData(0, 0, w, h);
  } catch (e) {
    // Canvas might be tainted or out of memory
    return sourceCanvas;
  }

  const data = imgData.data;

  // Sample corner pixels to detect dominant border/letterbox style
  const samplePixel = (x, y) => {
    const idx = (y * w + x) * 4;
    return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
  };

  const corners = [
    samplePixel(2, 2),
    samplePixel(w - 3, 2),
    samplePixel(2, h - 3),
    samplePixel(w - 3, h - 3)
  ];

  // Check if borders are predominantly dark (letterbox) or white/light gray (document viewer margins)
  const darkCount = corners.filter(c => c[0] < 45 && c[1] < 45 && c[2] < 45).length;
  const whiteCount = corners.filter(c => c[0] > 235 && c[1] > 235 && c[2] > 235).length;

  const isDarkLetterbox = darkCount >= 2;
  const isWhiteMargin = !isDarkLetterbox && whiteCount >= 2;

  // If neither clear dark bars nor clear white margins, return original
  if (!isDarkLetterbox && !isWhiteMargin) {
    return sourceCanvas;
  }

  const isBorderPixel = (r, g, b, a) => {
    if (a < 25) return true;
    if (isDarkLetterbox) {
      return r < 50 && g < 50 && b < 50;
    }
    if (isWhiteMargin) {
      return r > 230 && g > 230 && b > 230;
    }
    return false;
  };

  // Find top boundary
  let top = 0;
  const maxScanY = Math.floor(h * 0.45);
  for (let y = 0; y < maxScanY; y++) {
    let nonBorderCount = 0;
    for (let x = 0; x < w; x += 4) {
      const idx = (y * w + x) * 4;
      if (!isBorderPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
        nonBorderCount++;
      }
    }
    if (nonBorderCount > (w / 4) * 0.05) {
      top = y;
      break;
    }
  }

  // Find bottom boundary
  let bottom = h - 1;
  const minScanY = Math.floor(h * 0.55);
  for (let y = h - 1; y >= minScanY; y--) {
    let nonBorderCount = 0;
    for (let x = 0; x < w; x += 4) {
      const idx = (y * w + x) * 4;
      if (!isBorderPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
        nonBorderCount++;
      }
    }
    if (nonBorderCount > (w / 4) * 0.05) {
      bottom = y;
      break;
    }
  }

  // Find left boundary
  let left = 0;
  const maxScanX = Math.floor(w * 0.45);
  for (let x = 0; x < maxScanX; x++) {
    let nonBorderCount = 0;
    for (let y = top; y <= bottom; y += 4) {
      const idx = (y * w + x) * 4;
      if (!isBorderPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
        nonBorderCount++;
      }
    }
    if (nonBorderCount > ((bottom - top) / 4) * 0.05) {
      left = x;
      break;
    }
  }

  // Find right boundary
  let right = w - 1;
  const minScanX = Math.floor(w * 0.55);
  for (let x = w - 1; x >= minScanX; x--) {
    let nonBorderCount = 0;
    for (let y = top; y <= bottom; y += 4) {
      const idx = (y * w + x) * 4;
      if (!isBorderPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
        nonBorderCount++;
      }
    }
    if (nonBorderCount > ((bottom - top) / 4) * 0.05) {
      right = x;
      break;
    }
  }

  // Add 8px safety padding around content
  const padding = 8;
  const cropLeft = Math.max(0, left - padding);
  const cropTop = Math.max(0, top - padding);
  const cropRight = Math.min(w - 1, right + padding);
  const cropBottom = Math.min(h - 1, bottom + padding);

  const cropW = cropRight - cropLeft + 1;
  const cropH = cropBottom - cropTop + 1;

  // Area guard: ensure cropped area is at least 25% of original canvas
  if (cropW * cropH < w * h * 0.25 || cropW < 60 || cropH < 60) {
    return sourceCanvas;
  }

  // If crop is practically the full canvas (>= 98%), keep original
  if (cropW >= w * 0.98 && cropH >= h * 0.98) {
    return sourceCanvas;
  }

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCtx.drawImage(sourceCanvas, cropLeft, cropTop, cropW, cropH, 0, 0, cropW, cropH);

  return croppedCanvas;
}

/**
 * Capture frame from videoElement with optional downscaling and automatic edge/letterbox cropping.
 */
export function captureFrame(videoElement, maxWidth = 1600, options = { autoCrop: true }) {
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return null;
  }

  let canvas = document.createElement('canvas');
  let w = videoElement.videoWidth;
  let h = videoElement.videoHeight;

  // Scale down if higher than maxWidth to maintain fast performance and crisp text
  if (w > maxWidth) {
    const scale = maxWidth / w;
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, w, h);

  // Auto-crop letterboxing and margins if requested
  if (options && options.autoCrop !== false) {
    canvas = autoCropCanvas(canvas);
  }

  // High-fidelity JPEG compression (quality 0.88) maintains sharp text and minimal file size
  return canvas.toDataURL('image/jpeg', 0.88);
}

/**
 * Auto-crop an existing image data URL
 */
export function autoCropImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const cropped = autoCropCanvas(canvas);
      resolve(cropped.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Render every page of a user-uploaded PDF file into cropped slides
 */
export async function captureAndCropPDFPages(pdfFile, onProgress = () => {}) {
  const pdfjs = await ensurePdfJsLoaded();
  if (!pdfjs) {
    throw new Error("In-browser PDF renderer is unavailable. Please check internet connection or reload.");
  }

  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfDoc.numPages;
  const capturedSlides = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) onProgress(pageNum, numPages);
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.6 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    const cropped = autoCropCanvas(canvas);
    const dataUrl = cropped.toDataURL('image/jpeg', 0.88);
    capturedSlides.push(dataUrl);
  }

  return capturedSlides;
}

export function stopCapture(stream) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

/**
 * Fast perceptual difference check between two frame data URLs using a 32x32 canvas
 */
let diffCanvas = null;
let diffCtx = null;

function getSamplePixels(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (!diffCanvas) {
        diffCanvas = document.createElement('canvas');
        diffCanvas.width = 32;
        diffCanvas.height = 32;
        diffCtx = diffCanvas.getContext('2d', { willReadFrequently: true });
      }
      diffCtx.drawImage(img, 0, 0, 32, 32);
      const data = diffCtx.getImageData(0, 0, 32, 32).data;
      resolve(data);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function isFrameDifferent(newFrame, lastFrame, threshold = 6) {
  if (!lastFrame) return true;
  if (!newFrame) return false;

  try {
    const [p1, p2] = await Promise.all([getSamplePixels(newFrame), getSamplePixels(lastFrame)]);
    if (!p1 || !p2) return true;

    let totalDiff = 0;
    const len = p1.length;
    for (let i = 0; i < len; i += 4) {
      const r = Math.abs(p1[i] - p2[i]);
      const g = Math.abs(p1[i+1] - p2[i+1]);
      const b = Math.abs(p1[i+2] - p2[i+2]);
      totalDiff += (r + g + b) / 3;
    }
    const avgDiff = totalDiff / (len / 4);
    return avgDiff > threshold;
  } catch (e) {
    return true;
  }
}

export function setupAutoCapture(videoElement, intervalMs, onCapture, options = { skipDuplicates: false }) {
  let lastCapturedFrame = null;
  let isCapturing = false;

  const timer = setInterval(async () => {
    if (isCapturing) return;
    if (videoElement && videoElement.readyState >= 2) {
      isCapturing = true;
      try {
        const frame = captureFrame(videoElement, 1600, { autoCrop: true });
        if (frame) {
          if (options.skipDuplicates && lastCapturedFrame) {
            const different = await isFrameDifferent(frame, lastCapturedFrame);
            if (different) {
              lastCapturedFrame = frame;
              onCapture(frame);
            }
          } else {
            lastCapturedFrame = frame;
            onCapture(frame);
          }
        }
      } catch (err) {
        console.warn("Auto-capture frame error:", err);
      } finally {
        isCapturing = false;
      }
    }
  }, intervalMs);

  return timer;
}
