import { useState, useCallback, useEffect, useRef } from 'react';

const usePictureInPicture = (playerRef) => {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [nativePiPSupported, setNativePiPSupported] = useState(false);
  const pipWindowRef = useRef(null);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setNativePiPSupported(
      typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled
    );
  }, []);

  useEffect(() => {
    const handleEnterPiP = () => setIsPiPActive(true);
    const handleLeavePiP = () => setIsPiPActive(false);

    if (typeof document !== 'undefined') {
      document.addEventListener('enterpictureinpicture', handleEnterPiP);
      document.addEventListener('leavepictureinpicture', handleLeavePiP);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('enterpictureinpicture', handleEnterPiP);
        document.removeEventListener('leavepictureinpicture', handleLeavePiP);
      }
    };
  }, []);

  const requestNativePiP = useCallback(async () => {
    if (!playerRef?.current || !nativePiPSupported) return false;

    try {
      const internal = playerRef.current.getInternalPlayer?.();
      if (!internal) return false;

      let videoEl = null;
      if (internal.video) {
        videoEl = internal.video;
      } else if (internal instanceof HTMLVideoElement) {
        videoEl = internal;
      } else if (internal.getIframe) {
        const iframe = internal.getIframe();
        if (iframe?.contentDocument) {
          videoEl = iframe.contentDocument.querySelector('video');
        }
      }

      if (videoEl && 'requestPictureInPicture' in videoEl) {
        await videoEl.requestPictureInPicture();
        return true;
      }
    } catch {
      // Cross-origin iframe, YouTube restriction, etc.
    }
    return false;
  }, [playerRef, nativePiPSupported]);

  const exitNativePiP = useCallback(async () => {
    if (typeof document !== 'undefined' && document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch { /* noop */ }
    }
  }, []);

  const togglePiP = useCallback(async () => {
    if (isPiPActive) {
      await exitNativePiP();
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
      }
      return;
    }

    const nativeSuccess = await requestNativePiP();
    if (!nativeSuccess) {
      // Fall back: we let the existing mini player handle it.
      // The caller will detect absence of native PiP and switch to mini mode.
      return false;
    }
    return true;
  }, [isPiPActive, requestNativePiP, exitNativePiP]);

  return {
    isPiPActive,
    nativePiPSupported,
    togglePiP,
    exitNativePiP,
  };
};

export default usePictureInPicture;
