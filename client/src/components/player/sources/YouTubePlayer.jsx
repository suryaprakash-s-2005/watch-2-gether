import { forwardRef, useEffect, useRef, useImperativeHandle, useCallback } from 'react';

const YT_PLAYER_STATES = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

let ytApiPromise = null;

function loadYtApi() {
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player && window.YT.Player.prototype && window.YT.Player.prototype.playVideo) {
      resolve(window.YT);
      return;
    }

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve(window.YT);
    };

    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const first = document.getElementsByTagName('script')[0];
    if (first && first.parentNode) {
      first.parentNode.insertBefore(tag, first);
    } else {
      document.head.appendChild(tag);
    }
  });

  return ytApiPromise;
}

const buildPlayerVars = (config, captionsEnabled) => {
  const custom = config?.youtube?.playerVars || {};
  return {
    autoplay: 1,
    controls: 0,
    modestbranding: 1,
    rel: 0,
    iv_load_policy: 3,
    playsinline: 1,
    fs: 0,
    disablekb: 1,
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    enablejsapi: 1,
    cc_load_policy: 1,
    ...custom,
  };
};

const YouTubePlayer = forwardRef(({
  videoId,
  playing,
  volume,
  muted,
  playbackRate,
  captionsEnabled,
  onReady,
  onPlay,
  onPause,
  onEnded,
  onProgress,
  onDuration,
  onSeek,
  onError,
  config,
}, ref) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const callbacksRef = useRef({ onReady, onPlay, onPause, onEnded, onProgress, onDuration, onSeek, onError });
  const stateRef = useRef({ playing, volume, muted, playbackRate, videoId, captionsEnabled });
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    callbacksRef.current = { onReady, onPlay, onPause, onEnded, onProgress, onDuration, onSeek, onError };
  });

  useEffect(() => {
    stateRef.current = { ...stateRef.current, playing, volume, muted, playbackRate, videoId, captionsEnabled };
  });

  const destroyPlayer = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
        }
      } catch (e) { /* ignore */ }
      playerRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  }, []);

  const createPlayer = useCallback(() => {
    if (!containerRef.current || !window.YT) return;
    destroyPlayer();

    const playerEl = document.createElement('div');
    playerEl.style.width = '100%';
    playerEl.style.height = '100%';
    containerRef.current.appendChild(playerEl);

    const p = new window.YT.Player(playerEl, {
      videoId,
      height: '100%',
      width: '100%',
      playerVars: buildPlayerVars(config, stateRef.current.captionsEnabled),
      events: {
        onReady: () => {
          const s = stateRef.current;
          callbacksRef.current.onReady?.();
          try {
            const dur = p.getDuration();
            if (dur > 0) callbacksRef.current.onDuration?.(dur);
          } catch (e) { /* ignore */ }
          try {
            if (s.muted) { p.mute(); } else { p.unMute(); }
            p.setVolume(s.volume * 100);
            p.setPlaybackRate(s.playbackRate);
          } catch (e) { /* ignore */ }
          try {
            if (s.captionsEnabled) {
              p.loadModule('captions');
              p.setOption('captions', 'track', {});
            } else {
              p.unloadModule('captions');
              p.setOption('captions', 'track', null);
            }
          } catch (e) { /* ignore */ }
          if (s.playing) { try { p.playVideo(); } catch (e) { /* ignore */ } }
        },
        onStateChange: (event) => {
          const state = event.data;
          if (state === YT_PLAYER_STATES.PLAYING) {
            if (!progressIntervalRef.current) {
              progressIntervalRef.current = setInterval(() => {
                try {
                  if (playerRef.current) {
                    const time = playerRef.current.getCurrentTime();
                    const dur = playerRef.current.getDuration();
                    callbacksRef.current.onProgress?.({
                      playedSeconds: time,
                      played: dur > 0 ? time / dur : 0,
                      loadedSeconds: dur,
                      loaded: 1,
                    });
                    if (dur > 0) {
                      callbacksRef.current.onDuration?.(dur);
                    }
                  }
                } catch (e) { /* ignore */ }
              }, 250);
            }
            callbacksRef.current.onPlay?.();
          } else if (state === YT_PLAYER_STATES.PAUSED) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            try {
              callbacksRef.current.onSeek?.(p.getCurrentTime());
            } catch (e) { /* ignore */ }
            callbacksRef.current.onPause?.();
          } else if (state === YT_PLAYER_STATES.ENDED) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            callbacksRef.current.onEnded?.();
          } else if (state === YT_PLAYER_STATES.CUED) {
            try {
              const dur = p.getDuration();
              if (dur > 0) callbacksRef.current.onDuration?.(dur);
            } catch (e) { /* ignore */ }
          }
        },
        onError: (event) => {
          callbacksRef.current.onError?.(event);
        },
      },
    });
    playerRef.current = p;
  }, [videoId, config, destroyPlayer]);

  useEffect(() => {
    if (!videoId) return;
    let active = true;
    loadYtApi().then(() => {
      if (active) {
        createPlayer();
      }
    });
    return () => {
      active = false;
      destroyPlayer();
    };
  }, [videoId, createPlayer, destroyPlayer]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      const currentState = p.getPlayerState();
      const isPlaying_ = currentState === YT_PLAYER_STATES.PLAYING;
      if (playing && !isPlaying_) {
        p.playVideo();
      } else if (!playing && isPlaying_) {
        p.pauseVideo();
      }
    } catch (e) { /* ignore */ }
  }, [playing]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try { p.setVolume(volume * 100); } catch (e) { /* ignore */ }
  }, [volume]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try { if (muted) p.mute(); else p.unMute(); } catch (e) { /* ignore */ }
    const retryTimer = (!muted && p) ? setInterval(() => {
      try {
        if (p.isMuted()) { p.unMute(); } else { clearInterval(retryTimer); }
      } catch { clearInterval(retryTimer); }
    }, 500) : null;
    return () => { if (retryTimer) clearInterval(retryTimer); };
  }, [muted]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try { p.setPlaybackRate(playbackRate); } catch (e) { /* ignore */ }
  }, [playbackRate]);

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      try { return playerRef.current?.getCurrentTime() ?? 0; } catch (e) { return 0; }
    },
    seekTo: (time) => {
      try { playerRef.current?.seekTo(time, true); } catch (e) { /* ignore */ }
    },
    getDuration: () => {
      try { return playerRef.current?.getDuration() ?? 0; } catch (e) { return 0; }
    },
    get paused() {
      try {
        if (!playerRef.current) return true;
        return playerRef.current.getPlayerState() !== YT_PLAYER_STATES.PLAYING;
      } catch (e) { return true; }
    },
    set playbackRate(rate) {
      try { playerRef.current?.setPlaybackRate(rate); } catch (e) { /* ignore */ }
    },
    get playbackRate() {
      try { return playerRef.current?.getPlaybackRate() ?? 1; } catch (e) { return 1; }
    },
    set currentTime(time) {
      try { playerRef.current?.seekTo(time, true); } catch (e) { /* ignore */ }
    },
    get currentTime() {
      try { return playerRef.current?.getCurrentTime() ?? 0; } catch (e) { return 0; }
    },
    play: () => {
      try {
        playerRef.current?.playVideo();
      } catch (e) { console.warn("playVideo error:", e); }
    },
    pause: () => {
      try {
        playerRef.current?.pauseVideo();
      } catch (e) { console.warn("pauseVideo error:", e); }
    },
    toggleCaptions: () => {
      try { playerRef.current?.toggleCaptions(); } catch (e) { /* ignore */ }
    },
    setCaptions: (enabled) => {
      try {
        if (enabled) {
          playerRef.current?.loadModule('captions');
          playerRef.current?.setOption('captions', 'track', {});
        } else {
          playerRef.current?.unloadModule('captions');
          playerRef.current?.setOption('captions', 'track', null);
        }
      } catch (e) { console.warn("setCaptions error:", e); }
    },
    isMuted: () => {
      try { return playerRef.current?.isMuted() ?? false; } catch (e) { return false; }
    },
    getIframe: () => {
      try { return playerRef.current?.getIframe(); } catch (e) { return null; }
    },
    resize: (width, height) => {
      try { playerRef.current?.setSize(width, height); } catch (e) { /* ignore */ }
    },
  }), []);

  if (!videoId) return null;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    />
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';

export default YouTubePlayer;
