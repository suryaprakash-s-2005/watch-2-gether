import { useEffect, useRef, useState, useCallback } from 'react';

const useAmbientGlow = (videoRef, isPlaying, intervalMs = 5000) => {
  const [ambientColor, setAmbientColor] = useState(null);
  const intervalRef = useRef(null);

  const extractColor = useCallback(() => {
    const videoEl = videoRef?.current;
    if (!videoEl) return;

    try {
      let internalEl = videoEl;
      if (internalEl.getInternalPlayer) {
        internalEl = internalEl.getInternalPlayer();
      }
      if (!internalEl || !internalEl.video) return;

      const video = internalEl.video || internalEl;
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 9;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, 16, 9);
      const imageData = ctx.getImageData(0, 0, 16, 9).data;

      let r = 0, g = 0, b = 0, count = 0;
      const step = 4;
      for (let i = 0; i < imageData.length; i += step * 4) {
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
        count++;
      }

      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        setAmbientColor(`rgb(${r},${g},${b})`);
      }
    } catch {
      // Silently fail — ambient glow is decorative
    }
  }, [videoRef]);

  useEffect(() => {
    if (!isPlaying) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setAmbientColor(null);
      return;
    }

    extractColor();
    intervalRef.current = setInterval(extractColor, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, extractColor, intervalMs]);

  return ambientColor;
};

export default useAmbientGlow;
