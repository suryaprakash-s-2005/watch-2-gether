import { useEffect, useRef, useState, Suspense } from 'react';
import ReactPlayer from 'react-player';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import useGlobalPlayer from '../../hooks/useGlobalPlayer';
import useRoomStore from '../../store/roomStore';
import useAuthStore from '../../store/authStore';
import useSocketStore from '../../store/socketStore';
import MiniPlayerControls from './MiniPlayerControls';

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
    isPlaying,
    volume,
    isMuted,
    isMiniPlayer,
    isClosed,
    slotRect,
    isSynced,
    setIsPlaying,
    setCurrentTime,
    setIsMuted,
    setIsMiniPlayer,
  } = useGlobalPlayer();

  const { currentRoom, playbackCommand, setPlaybackCommand, updateRoomPlayback } = useRoomStore();
  const { user, isAuthenticated } = useAuthStore();
  const { emitVideoPlay, emitVideoPause, emitVideoSeek, emitVideoSync } = useSocketStore();

  const playerRef = useRef(null);
  const localVersionRef = useRef(0);
  const suppressUntil = useRef(0);
  const [duration, setDuration] = useState(0);
  
  // Custom mini player size state for desktop/tablet resizing
  const [miniWidth, setMiniWidth] = useState(320);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const [isReady, setIsReady] = useState(false);
  const lastSyncedVideoId = useRef(null);

  const [prevVideoId, setPrevVideoId] = useState(currentVideoId);

  // Reset player ready states on video change (React standard render-reset pattern)
  if (currentVideoId !== prevVideoId) {
    setPrevVideoId(currentVideoId);
    setIsReady(false);
    setIsPlaying(false);
  }

  const onPlayerReady = () => {
    setIsReady(true);
    if (lastSyncedVideoId.current === currentVideoId) return;

    if (currentVideoId) {
      lastSyncedVideoId.current = currentVideoId;
      suppress(2000);
      
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

    const { type, time, isPlaying: shouldPlay, syncVersion } = playbackCommand;

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

    } else if (type === 'pause') {
      suppress(1200);
      setIsPlaying(false);
      seekTo(time);
      updateRoomPlayback({ isPlaying: false, currentTime: time });

    } else if (type === 'seek') {
      suppress(1200);
      seekTo(time);
      updateRoomPlayback({ currentTime: time });

    } else if (type === 'sync' || type === 'drift-sync') {
      const localTime = getCurrentTime();
      const diff = localTime - time; // positive if local is ahead, negative if behind
      const isRoomPlaying = shouldPlay !== undefined ? shouldPlay : type === 'drift-sync';

      if (diff > 0) {
        // Local is ahead of incoming room state
        if (diff < 3) {
          // Ignore sync, do not seek backwards
          console.log(`Ignoring sync: local is ahead by ${diff.toFixed(2)}s (threshold < 3s)`);
          if (isPlaying !== isRoomPlaying) {
            setIsPlaying(isRoomPlaying);
          }
        } else if (diff <= 5) {
          console.log(`Ignoring sync: local is ahead by ${diff.toFixed(2)}s (threshold <= 5s)`);
          if (isPlaying !== isRoomPlaying) {
            setIsPlaying(isRoomPlaying);
          }
        } else {
          // diff > 5, apply correction (seek back)
          console.log(`Applying sync correction: local is ahead by ${diff.toFixed(2)}s (threshold > 5s)`);
          suppress(1200);
          setIsPlaying(isRoomPlaying);
          seekTo(time);
          updateRoomPlayback({ isPlaying: isRoomPlaying, currentTime: time });
        }
      } else {
        // Local is behind incoming room state
        const absDiff = Math.abs(diff);
        if (absDiff > 3) {
          console.log(`Applying sync correction: local is behind by ${absDiff.toFixed(2)}s`);
          suppress(1200);
          setIsPlaying(isRoomPlaying);
          seekTo(time);
          updateRoomPlayback({ isPlaying: isRoomPlaying, currentTime: time });
        } else {
          // Just align playing state
          if (isPlaying !== isRoomPlaying) {
            setIsPlaying(isRoomPlaying);
          }
        }
      }
    }

    setPlaybackCommand(null);
  }, [playbackCommand, isValidYoutube, isReady, isPlaying, setIsPlaying, setPlaybackCommand, updateRoomPlayback]);

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
      console.log('Ignoring background auto-pause');
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

  // Host periodic sync emission
  useEffect(() => {
    if (!isHost || !isValidYoutube || !isPlaying) return;

    const interval = setInterval(() => {
      const time = getCurrentTime();
      if (time > 0) {
        emitVideoSync(time);
      }
    }, 4000); // sync every 4 seconds

    return () => clearInterval(interval);
  }, [isHost, isValidYoutube, isPlaying, emitVideoSync]);

  // Handle page visibility change (controlled resume of playback when returning to foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) return; // Only trigger on foreground transition

      console.log('App returned to foreground, checking playback status...');
      const player = playerRef.current;
      if (!player) return;

      const internalPlayer = typeof player.getInternalPlayer === 'function' ? player.getInternalPlayer() : null;
      if (!internalPlayer) return;

      let playerState = -1;
      if (typeof internalPlayer.getPlayerState === 'function') {
        playerState = internalPlayer.getPlayerState();
      }

      console.log(`Visibility recovery check - playerState: ${playerState}`);

      // 1. If playback never stopped (state is 1 / PLAYING), do nothing
      if (playerState === 1) {
        console.log('App returned to foreground: Playback is already active. Doing nothing.');
        return;
      }

      // 2. Only recover if playback was genuinely interrupted
      if (currentRoom?.isPlaying && isSynced) {
        console.log('App returned to foreground: Playback was interrupted. Recovering state.');
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
  }, [currentRoom?.isPlaying, currentRoom?.currentTime, isSynced, setIsPlaying]);

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
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        zIndex: 50,
        borderTopWidth: '1px',
        borderTopColor: 'rgba(51, 65, 85, 0.5)',
        borderRadius: 0,
        overflow: 'hidden',
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
    <motion.div
      layout
      drag={isMiniPlayer && !isMobile}
      dragConstraints={{
        left: 0,
        right: window.innerWidth - miniWidth,
        top: 0,
        bottom: window.innerHeight - (miniWidth * 9 / 16),
      }}
      dragElastic={0.1}
      dragMomentum={false}
      style={style}
      className="bg-slate-950 border border-slate-800/80 pointer-events-auto flex items-center justify-center"
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
      <div className="w-full h-full relative">
        <Suspense fallback={
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-950">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-youtube-red mb-3"></div>
            <p className="text-xs font-semibold tracking-wider text-slate-450 uppercase">Syncing Player...</p>
          </div>
        }>
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            width="100%"
            height={isMobile && isMiniPlayer ? '0px' : '100%'} // Hide video frame on mobile docked controls
            playing={isSynced && isPlaying}
            controls={hasControl && !isMiniPlayer} // Custom controls overlay on mini mode
            volume={isMuted ? 0 : volume}
            onReady={onPlayerReady}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onDuration={(d) => setDuration(d)}
            onProgress={({ playedSeconds }) => {
              if (isPlaying) {
                setCurrentTime(playedSeconds);
              }
            }}
            config={PLAYER_CONFIG}
          />
        </Suspense>

        {/* Lock controls overlay inside Room page if guest control is off */}
        {isRoomMode && !hasControl && (
          <div
            className="absolute inset-0 bg-transparent cursor-not-allowed"
            style={{ pointerEvents: 'auto' }}
            title="Controls locked. Only the Host can control video playback."
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
  );
};

export default GlobalMiniPlayer;
