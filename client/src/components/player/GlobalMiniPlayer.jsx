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
      autoplay: 1,
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
    setIsSynced,
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
  const isDraggingRef = useRef(false);
  const localPlaybackRateRef = useRef(1);
  const [duration, setDuration] = useState(0);
  const [localVolume, setLocalVolume] = useState(volume);
  
  // Custom mini player size state for desktop/tablet resizing
  const [miniWidth, setMiniWidth] = useState(320);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const [isReady, setIsReady] = useState(false);
  const [seekHoverPos, setSeekHoverPos] = useState(0);
  const [seekHoverTime, setSeekHoverTime] = useState(0);
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const progressRef = useRef(null);
  const lastSyncedVideoId = useRef(null);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleProgressBarPointerDown = (e) => {
    if (!progressRef.current || duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    const time = x * duration;
    seekTo(time);
    setCurrentTime(time);
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleProgressBarPointerMove = (e) => {
    if (!progressRef.current || duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    const time = x * duration;
    setSeekHoverPos(x);
    setSeekHoverTime(time);
    setIsHoveringSeek(true);
    if (isDraggingRef.current) {
      seekTo(time);
      setCurrentTime(time);
    }
  };

  const handleProgressBarPointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    suppressUntil.current = 0;
    handleSeek(x * duration);
  };

  const handleProgressBarPointerLeave = () => {
    if (!isDraggingRef.current) {
      setIsHoveringSeek(false);
    }
  };

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

      // Initial seek and play state are handled by the playbackCommand handler.
      // Skipping them here avoids a race with the command-effect that runs when isReady becomes true.
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

    if (syncVersion !== undefined && syncVersion <= localVersionRef.current) {
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
      setCurrentTime(time);
      updateRoomPlayback({ isPlaying: true, currentTime: time });
      setIsSynced(true);
      setSyncStatus('synced');

    } else if (type === 'pause') {
      suppress(1200);
      setIsPlaying(false);
      seekTo(time);
      setCurrentTime(time);
      updateRoomPlayback({ isPlaying: false, currentTime: time });
      setIsSynced(true);
      setSyncStatus('synced');

    } else if (type === 'seek') {
      suppress(1200);
      seekTo(time);
      setCurrentTime(time);
      updateRoomPlayback({ currentTime: time });
      setIsSynced(true);
      setSyncStatus('synced');

    } else if (type === 'change') {
      suppress(1200);
      setIsPlaying(false);
      setIsSynced(false);
      seekTo(0);
      setCurrentTime(0);
      updateRoomPlayback({ currentTime: 0, isPlaying: false });
      setIsSynced(true);
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
      } else if (absDiff < 2) {
        setSyncStatus('drifted');
      } else {
        setSyncStatus('unsynced');
      }

      if (absDiff >= 2) {
        suppress(1200);
        seekTo(time);
        setCurrentTime(time);
        updateRoomPlayback({ isPlaying: isRoomPlaying, currentTime: time });
      }
      if (isPlaying !== isRoomPlaying) {
        setIsPlaying(isRoomPlaying);
      }
      setIsSynced(true);
    }

    setPlaybackCommand(null);
  }, [playbackCommand, isValidYoutube, isReady, isPlaying, setIsPlaying, setIsSynced, setPlaybackCommand, updateRoomPlayback, setSyncStatus, applyPlaybackRate]);

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
    emitVideoPlaybackRate(newRate);
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

  const handleSeekTo = (time, force = false) => {
    seekTo(time);
    setCurrentTime(time);
    if (force) suppressUntil.current = 0;
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
                setCurrentTime(playedSeconds);
              }}
              config={PLAYER_CONFIG}
            />
          </Suspense>
        </div>

        {/* Persistent progress bar (always visible at bottom of player) */}
        {isValidYoutube && (
          <div className="absolute bottom-0 left-0 right-0 z-30 group px-1.5 pb-1">
            {isHoveringSeek && (
              <div
                className="absolute bottom-full mb-2 -translate-x-1/2 pointer-events-none z-30"
                style={{ left: `${seekHoverPos * 100}%` }}
              >
                <div className="bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 shadow-2xl relative">
                  <span className="text-[11px] font-bold text-white tabular-nums whitespace-nowrap">
                    {formatTime(seekHoverTime)}
                  </span>
                  <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-r border-b border-slate-700/80 rotate-45" />
                </div>
              </div>
            )}
            <div
              ref={progressRef}
              className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer group-hover:h-2 transition-all duration-150 relative"
              onPointerDown={handleProgressBarPointerDown}
              onPointerMove={handleProgressBarPointerMove}
              onPointerUp={handleProgressBarPointerUp}
              onPointerLeave={handleProgressBarPointerLeave}
              onPointerCancel={() => { isDraggingRef.current = false; }}
            >
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full relative transition-[width] duration-75"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg shadow-black/30 ring-2 ring-white/20 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-150" />
              </div>
            </div>
          </div>
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
