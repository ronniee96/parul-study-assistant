/**
 * Screen Capture utilities for Parul Study Assistant
 * Supports continuous frame capture, 1-second auto-capture, duplicate suppression,
 * and high-fidelity JPEG compression for smooth PDF slide scanning.
 */

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

export function captureFrame(videoElement, maxWidth = 1600) {
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return null;
  }
  
  const canvas = document.createElement('canvas');
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
  
  // JPEG format at 0.85 quality gives ~150KB per frame instead of 4MB PNG, keeping browser fast
  return canvas.toDataURL('image/jpeg', 0.85);
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

export async function isFrameDifferent(newFrame, lastFrame, threshold = 8) {
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
        const frame = captureFrame(videoElement);
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
