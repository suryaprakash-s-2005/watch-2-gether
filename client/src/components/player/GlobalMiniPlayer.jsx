import { useEffect, useRef, useState, Suspense, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import useGlobalPlayer from '../../hooks/useGlobalPlayer';
import useRoomStore from '../../store/roomStore';
import useAuthStore from '../../store/authStore';
import useSocketStore from '../../store/socketStore';
import MiniPlayerControls from './MiniPlayerControls';
import SharedPlaybackControls from './SharedPlaybackControls';

const MATCH_URL_YOUTUBE = /(?:youtu\.be\/|youtube(?:-nocookie|education)?\.com\/(?:embed\/|v\/|watch\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))((\w|-){11})|youtube\.com\/playlist\?list=|youtube\.com\/user\//;

const isYoutubeUrl = (url) => {
  return url ? MATCH_URL_YOUTUBE.test(url) : false;
};

const PLAYER_CONFIG = {
  youtube: {
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      cc_load_policy: 1,
      enablejsapi: 1,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    },
  },
};

const GlobalMiniPlayer = () => {
  const location = useLocation();
  
  const {
    currentVideoId,
    currentTime,
    isPlaying,
    volume,
    isMuted,
    playbackRate,
    isMiniPlayer,
    isClosed,
    slotRect,
    isSynced,
    syncStatus,
    setIsPlaying,
    setCurrentTime,
    setIsMuted,
    setPlaybackRate,
    setIsMiniPlayer,
    setSyncStatus,
    emitVideoEnded,
    emitVideoPlaybackRate,
  } = useGlobalPlayer();

  const { currentRoom, playbackCommand, setPlaybackCommand, updateRoomPlayback } = useRoomStore();
  const { user, isAuthenticated } = useAuthStore();
  const { emitVideoPlay, emitVideoPause, emitVideoSeek, emitVideoSync } = useSocketStore();

  const playerRef = useRef(null);
  const dragConstraintsRef = useRef(null);
  const localVersionRef = useRef(0);
  const suppressUntil = useRef(0);
  const localPlaybackRateRef = useRef(1);
  const [duration, setDuration] = useState(0);
  const [localVolume, setLocalVolume] = useState(volume);
  
  // Custom mini player size state for desktop/tablet resizing
  const [miniWidth, setMiniWidth] = useState(320);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const [isReady, setIsReady] = useState(false);
  const lastSyncedVideoId = useRef(null);

  const [prevVideoId, setPrevVideoId] = useState(currentVideoId);
  if (currentVideoId !== prevVideoId) {
    setPrevVideoId(currentVideoId);
    setIsReady(false);
    setIsPlaying(false);
  }

  const applyPlaybackRate = useCallback((rate) => {
    if (!playerRef.current) return;
    const internal = playerRef.current.getInternalPlayer();
    if (internal && typeof internal.setPlaybackRate === 'function') {
      internal.setPlaybackRate(rate);
    }
    localPlaybackRateRef.current = rate;
    setPlaybackRate(rate);
  }, [setPlaybackRate]);

  const onPlayerReady = () => {
    setIsReady(true);
    if (lastSyncedVideoId.current === currentVideoId) return;

    if (currentVideoId) {
      lastSyncedVideoId.current = currentVideoId;
      suppress(2000);
      
      const roomPlaybackRate = currentRoom?.playbackRate || 1;
      applyPlaybackRate(roomPlaybackRate);

      const shouldPlay = currentRoom ? currentRoom.isPlaying : false;
      if (isHost || !shouldPlay) {
        setIsPlaying(shouldPlay);
      } else {
        setIsPlaying(false);
      }
      if (currentRoom) {
        seekTo(currentRoom.currentTime);
      }
    }
  };

  const videoUrl = currentVideoId ? `https://www.youtube.com/watch?v=${currentVideoId}` : null;
  const isValidYoutube = videoUrl && isYoutubeUrl(videoUrl);

  const isHost = currentRoom?.hostId && user?._id && String(currentRoom.hostId._id || currentRoom.hostId) === String(user._id);
  const hasControl = isHost || currentRoom?.guestControlEnabled;

  const isRoomRoute = location.pathname.startsWith('/room/');
  const isRoomMode = isRoomRoute && !isMiniPlayer && slotRect;

  // Track window resizing for mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync isMiniPlayer when navigating away from or back to room
  useEffect(() => {
    if (isRoomRoute) {
      // If we are back in the room, restore room player mode (unless explicitly minimized by user previously)
      // Actually, if we return to the room, we should expand it back automatically.
      setIsMiniPlayer(false);
    } else {
      // If we leave the room page, automatically minimize it
      setIsMiniPlayer(true);
    }
  }, [isRoomRoute, setIsMiniPlayer]);

  const getCurrentTime = () => {
    if (!playerRef.current) return 0;
    if (typeof playerRef.current.getCurrentTime === 'function') {
      return playerRef.current.getCurrentTime();
    }
    return playerRef.current.currentTime || 0;
  };

  const suppress = (ms = 1200) => {
    suppressUntil.current = Date.now() + ms;
  };

  const isSuppressed = () => Date.now() < suppressUntil.current;

  const seekTo = (time) => {
    if (!playerRef.current) return;
    if (typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(time, 'seconds');
    } else {
      playerRef.current.currentTime = time;
    }
  };

  // Process playback commands from the socket store
  useEffect(() => {
    if (!isValidYoutube || !playbackCommand || !isReady) return;

    const { type, time, isPlaying: shouldPlay, syncVersion, rate, playbackRate: cmdRate } = playbackCommand;

    if (syncVersion !== undefined && syncVersion < localVersionRef.current) {
      setPlaybackCommand(null);
      return;
    }
    if (syncVersion !== undefined) {
      localVersionRef.current = syncVersion;
    }

    if (type === 'play') {
      suppress(1200);
      setIsPlaying(true);
      seekTo(time);
      updateRoomPlayback({ isPlaying: true, currentTime: time });
      setSyncStatus('synced');

    } else if (type === 'pause') {
      suppress(1200);
      setIsPlaying(false);
      seekTo(time);
      updateRoomPlayback({ isPlaying: false, currentTime: time });
      setSyncStatus('synced');

    } else if (type === 'seek') {
      suppress(1200);
      seekTo(time);
      updateRoomPlayback({ currentTime: time });
      setSyncStatus('synced');

    } else if (type === 'change') {
      setIsPlaying(false);
      seekTo(0);
      updateRoomPlayback({ currentTime: 0, isPlaying: false });
      setSyncStatus('synced');

    } else if (type === 'rate') {
      if (rate && rate !== localPlaybackRateRef.current) {
        applyPlaybackRate(rate);
        updateRoomPlayback({ playbackRate: rate });
      }

    } else if (type === 'sync' || type === 'drift-sync') {
      const localTime = getCurrentTime();
      const diff = localTime - time; // positive if local is ahead, negative if behind
      const absDiff = Math.abs(diff);
      const isRoomPlaying = shouldPlay !== undefined ? shouldPlay : type === 'drift-sync';

      if (cmdRate && cmdRate !== localPlaybackRateRef.current) {
        applyPlaybackRate(cmdRate);
      }

      if (absDiff < 1) {
        setSyncStatus('synced');
      } else if (absDiff < 3) {
        setSyncStatus('drifted');
      } else {
        setSyncStatus('unsynced');
      }

      if (diff > 0) {
        if (diff < 3) {
          if (isPlaying !== isRoomPlaying) {
            setIsPlaying(isRoomPlaying);
          }
        } else if (diff <= 5) {
          if (isPlaying !== isRoomPlaying) {
            setIsPlaying(isRoomPlaying);
          }
        } else {
          suppress(1200);
          setIsPlaying(isRoomPlaying);
          seekTo(time);
          updateRoomPlayback({ isPlaying: isRoomPlaying, currentTime: time });
        }
      } else {
        if (absDiff > 3) {
          suppress(1200);
          setIsPlaying(isRoomPlaying);
          seekTo(time);
          updateRoomPlayback({ isPlaying: isRoomPlaying, currentTime: time });
        } else {
          if (isPlaying !== isRoomPlaying) {
            setIsPlaying(isRoomPlaying);
          }
        }
      }
    }

    setPlaybackCommand(null);
  }, [playbackCommand, isValidYoutube, isReady, isPlaying, setIsPlaying, setPlaybackCommand, updateRoomPlayback, setSyncStatus, applyPlaybackRate]);

  // Handle player events and report them
  const handlePlay = () => {
    if (isSuppressed()) return;
    if (!hasControl) return;
    const currentTime = getCurrentTime();
    
    setIsPlaying(true);
    updateRoomPlayback({ isPlaying: true, currentTime });
    emitVideoPlay(currentTime);
    suppress(1200);
  };

  const handlePause = () => {
    if (isSuppressed()) return;
    if (!hasControl) return;

    // Ignore pause events triggered by browser auto-suspending video when backgrounded/screen locked
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    const currentTime = getCurrentTime();
    setIsPlaying(false);
    updateRoomPlayback({ isPlaying: false, currentTime });
    emitVideoPause(currentTime);
    suppress(1200);
  };

  const handleSeek = (seconds) => {
    if (isSuppressed()) return;
    if (!hasControl) return;

    updateRoomPlayback({ currentTime: seconds });
    emitVideoSeek(seconds);
    suppress(1200);
  };

  const handleEnded = () => {
    if (!isHost) return;
    emitVideoEnded();
  };

  const handleVolumeChange = (newVolume) => {
    setLocalVolume(newVolume);
  };

  const handlePlaybackRateChange = (newRate) => {
    if (!hasControl) return;
    applyPlaybackRate(newRate);
    if (isHost) {
      emitVideoPlaybackRate(newRate);
    }
    updateRoomPlayback({ playbackRate: newRate });
  };

  // Host periodic sync emission
  useEffect(() => {
    if (!isHost || !isValidYoutube || !isPlaying) return;

    const interval = setInterval(() => {
      const time = getCurrentTime();
      if (time > 0) {
        emitVideoSync(time);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isHost, isValidYoutube, isPlaying, emitVideoSync]);

  // Non-host periodic rate sync — keep in sync with host's rate
  useEffect(() => {
    if (isHost || !isValidYoutube || !isPlaying) return;

    const interval = setInterval(() => {
      const currentRate = localPlaybackRateRef.current;
      const roomRate = currentRoom?.playbackRate || 1;
      if (Math.abs(currentRate - roomRate) > 0.01) {
        applyPlaybackRate(roomRate);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isHost, isValidYoutube, isPlaying, emitVideoSync]);

  // Handle page visibility change (controlled resume of playback when returning to foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) return; // Only trigger on foreground transition

      const player = playerRef.current;
      if (!player) return;

      const internalPlayer = typeof player.getInternalPlayer === 'function' ? player.getInternalPlayer() : null;
      if (!internalPlayer) return;

      let playerState = -1;
      if (typeof internalPlayer.getPlayerState === 'function') {
        playerState = internalPlayer.getPlayerState();
      }

      // 1. If playback never stopped (state is 1 / PLAYING), do nothing
      if (playerState === 1) {
        return;
      }

      // 2. Only recover if playback was genuinely interrupted (Host only, guests are handled via socket syncs)
      if (isHost && currentRoom?.isPlaying && isSynced) {
        suppress(2000);
        setIsPlaying(true);
        
        const localTime = getCurrentTime();
        const roomTime = currentRoom.currentTime;
        const drift = Math.abs(localTime - roomTime);
        if (drift > 3) {
          seekTo(roomTime);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isHost, currentRoom?.isPlaying, currentRoom?.currentTime, isSynced, setIsPlaying]);

  // Pointer event resize logic for desktop mini player
  const handleResizePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = miniWidth;
    const startX = e.clientX;

    const handlePointerMove = (moveEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(240, Math.min(640, startWidth + deltaX));
      setMiniWidth(newWidth);
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  // Volume & Mute helpers
  const handleTogglePlay = () => {
    if (!hasControl) return;
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSeekTo = (time) => {
    if (!hasControl) return;
    seekTo(time);
    handleSeek(time);
  };

  if (!isAuthenticated || isClosed || !isValidYoutube) {
    return null;
  }

  // Define position/size styles based on state
  const style = isRoomMode
    ? {
        position: 'fixed',
        left: `${slotRect.left}px`,
        top: `${slotRect.top}px`,
        width: `${slotRect.width}px`,
        height: `${slotRect.height}px`,
        zIndex: 40,
        borderRadius: '1.5rem',
        overflow: 'hidden',
        opacity: isSynced ? 1 : 0,
        pointerEvents: isSynced ? 'auto' : 'none',
      }
    : isMobile
    ? {
        position: 'fixed',
        bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        left: '12px',
        width: 'calc(100% - 24px)',
        height: '72px',
        zIndex: 50,
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4), 0 20px 25px -5px rgb(0 0 0 / 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
      }
    : {
        // Desktop / Tablet floating mini player
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: `${miniWidth}px`,
        height: `${miniWidth * 9 / 16}px`,
        zIndex: 50,
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      };

  return (
    <>
      {/* Viewport constraints container for dragging the mini player */}
      <div
        ref={dragConstraintsRef}
        className={`fixed ${isMobile ? 'inset-3' : 'inset-6'} pointer-events-none z-40`}
      />
      <motion.div
        layout={!isMobile}
        drag={isMiniPlayer && !isMobile}
        dragConstraints={dragConstraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        style={style}
        className="bg-slate-950/85 backdrop-blur-md border border-slate-800/80 pointer-events-auto flex items-center justify-center select-none"
      >
      {/* Resizing grip for Desktop/Tablet */}
      {isMiniPlayer && !isMobile && (
        <div
          onPointerDown={handleResizePointerDown}
          className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-20 hover:bg-slate-800/50 flex items-center justify-center rounded-br"
          title="Drag to resize"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" className="text-slate-500 hover:text-white">
            <path d="M6 0 L0 6 M7 2 L2 7 M8 4 L4 8" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
      )}

      {/* Actual Player Canvas */}
      <div className="w-full h-full relative" data-fullscreen-container>
        <div className={isMobile && isMiniPlayer ? 'absolute inset-0 opacity-0 pointer-events-none' : 'w-full h-full'}>
          <Suspense fallback={
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-950">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-youtube-red mb-3"></div>
              <p className="text-xs font-semibold tracking-wider text-slate-450 uppercase">Syncing Player...</p>
            </div>
          }>
            <ReactPlayer
              ref={playerRef}
              src={videoUrl}
              width="100%"
              height="100%"
              playing={isSynced && isPlaying}
              controls={false}
              volume={isMuted ? 0 : localVolume}
              onReady={onPlayerReady}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onEnded={handleEnded}
              onDuration={(d) => setDuration(d)}
              onProgress={({ playedSeconds }) => {
                if (isPlaying) {
                  setCurrentTime(playedSeconds);
                }
              }}
              config={PLAYER_CONFIG}
            />
          </Suspense>
        </div>

        {/* Lock controls overlay for non-room/mobile modes */}
        {isRoomMode && !hasControl && !isMiniPlayer && (
          <div
            className="absolute inset-0 bg-transparent cursor-not-allowed"
            style={{ pointerEvents: 'auto' }}
            title="Controls locked. Only the Host can control video playback."
          />
        )}

        {/* Room mode shared playback controls (visible to all users) */}
        {isRoomMode && (
          <SharedPlaybackControls
            duration={duration}
            currentTime={currentTime}
            isPlaying={isPlaying}
            volume={localVolume}
            isMuted={isMuted}
            playbackRate={playbackRate}
            onTogglePlay={handleTogglePlay}
            onSeekTo={handleSeekTo}
            onToggleMute={handleToggleMute}
            onVolumeChange={handleVolumeChange}
            onPlaybackRateChange={handlePlaybackRateChange}
            hasControl={hasControl}
            isHost={isHost}
            isSynced={isSynced}
            syncStatus={syncStatus}
          />
        )}

        {/* Custom Mini Player Overlays */}
        {isMiniPlayer && (
          <MiniPlayerControls
            duration={duration}
            onTogglePlay={handleTogglePlay}
            onToggleMute={handleToggleMute}
            onSeekTo={handleSeekTo}
            layout={isMobile ? 'mobile' : 'desktop'}
          />
        )}
      </div>
    </motion.div>
  </>
  );
};

export default GlobalMiniPlayer;
