export async function startScreenCapture() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser' },
    audio: false
  });
  return stream;
}

export function captureFrame(videoElement) {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0);
  return canvas.toDataURL('image/png');
}

export function stopCapture(stream) {
  if (stream) stream.getTracks().forEach(track => track.stop());
}

export function setupAutoCapture(videoElement, intervalMs, onCapture) {
  return setInterval(() => {
    if (videoElement.readyState >= 2) {
      const frame = captureFrame(videoElement);
      onCapture(frame);
    }
  }, intervalMs);
}
