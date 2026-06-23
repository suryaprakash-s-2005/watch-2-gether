import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import PlayerFactory from './PlayerFactory';
import PlayerSyncManager from './PlayerSyncManager';
import PlayerControls from './PlayerControls';
import { detectSourceType, buildUrl } from './sources/BasePlayer';
import usePlayerStore from '../../store/playerStore';
import useRoomStore from '../../store/roomStore';
import useAuthStore from '../../store/authStore';
import useSocketStore from '../../store/socketStore';
import useAmbientGlow from '../../hooks/useAmbientGlow';
import usePictureInPicture from '../../hooks/usePictureInPicture';
import { useNavigate } from 'react-router-dom';

const PlayerContainer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const playerStore = usePlayerStore();
  const {
    currentVideoId, currentTime, isPlaying, volume, isMuted, playbackRate,
    isMiniPlayer, isClosed, slotRect, isSynced, sourceType: storeSourceType,
    setCurrentTime, setIsMuted, setPlaybackRate,
    setIsMiniPlayer, setIsPlaying,
  } = playerStore;

  const { currentRoom, updateRoomPlayback } = useRoomStore();
  const { user, isAuthenticated } = useAuthStore();

  const playerRef = useRef(null);
  const dragConstraintsRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [localVolume, setLocalVolume] = useState(volume);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [seekHoverPos, setSeekHoverPos] = useState(0);
  const [seekHoverTime, setSeekHoverTime] = useState(0);
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const progressRef = useRef(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [miniWidth, setMiniWidth] = useState(320);
  const [videoTitle, setVideoTitle] = useState('');

  useEffect(() => {
    setHasPlayedOnce(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [currentVideoId]); 

  const isHost = currentRoom?.hostId && user?._id &&
    String(currentRoom.hostId._id || currentRoom.hostId) === String(user._id);
  const hasControl = isHost || currentRoom?.guestControlEnabled;

  const isRoomRoute = location.pathname.startsWith('/room/');
  const isRoomMode = isRoomRoute && !isMiniPlayer && !!slotRect;

  const sourceType = useMemo(() => {
    if (storeSourceType) return storeSourceType;
    const url = currentVideoId ? buildUrl(currentVideoId, 'youtube') : null;
    return detectSourceType(url) || 'youtube';
  }, [storeSourceType, currentVideoId]);

  const isValidVideo = !!(currentVideoId && sourceType);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isRoomRoute) {
      setIsMiniPlayer(false);
    } else if (!isClosed) {
      setIsMiniPlayer(true);
    }
  }, [isRoomRoute, isClosed, setIsMiniPlayer]);

  const handleResizePointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = miniWidth;
    const startX = e.clientX;
    const handleMove = (me) => {
      const deltaX = startX - me.clientX;
      setMiniWidth(Math.max(240, Math.min(640, startWidth + deltaX)));
    };
    const handleUp = () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  }, [miniWidth]);

  const handleTogglePlay = useCallback(() => {
    if (!hasControl) return;
    if (isPlaying && !hasPlayedOnce) {
      flushSync(() => setIsPlaying(false));
      setIsPlaying(true);
      return;
    }
    setIsPlaying(!isPlaying);
  }, [hasControl, isPlaying, hasPlayedOnce, setIsPlaying]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted, setIsMuted]);

  const handleVolumeChange = useCallback((newVolume) => {
    setLocalVolume(newVolume);
  }, []);

  const handlePlaybackRateChange = useCallback((newRate) => {
    if (!hasControl) return;
    if (playerRef.current && typeof playerRef.current.playbackRate !== 'undefined') {
      playerRef.current.playbackRate = newRate;
    }
    setPlaybackRate(newRate);
    updateRoomPlayback({ playbackRate: newRate });
    useSocketStore.getState().emitVideoPlaybackRate(newRate);
  }, [hasControl, setPlaybackRate, updateRoomPlayback]);

  const handleSeekTo = useCallback((time) => {
    const validTime = Math.max(0, Math.min(time, duration));
    if (playerRef.current) {
      if (typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(validTime, 'seconds');
      } else {
        playerRef.current.currentTime = validTime;
      }
    }
    setCurrentTime(validTime);
    updateRoomPlayback({ currentTime: validTime });
    useSocketStore.getState().emitVideoSeek(validTime);
  }, [duration, setCurrentTime, updateRoomPlayback]);

  const handleToggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      const el = progressRef.current?.closest('[data-fullscreen-container]');
      if (el) {
        try { await el.requestFullscreen(); setIsFullscreen(true); } catch { /* noop */ }
      }
    } else {
      try { await document.exitFullscreen(); setIsFullscreen(false); } catch { /* noop */ }
      }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.reason?.name === 'AbortError' && e.reason?.message?.includes('play()')) {
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  useEffect(() => {
    if (!currentVideoId) return;
    if (sourceType !== 'youtube') return;
    const fetchTitle = async () => {
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${currentVideoId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.title) setVideoTitle(data.title);
        }
      } catch { /* noop */ }
    };
    fetchTitle();
  }, [currentVideoId, sourceType]);

  const handleEnded = useCallback(() => {
    if (!isHost) return;
    useSocketStore.getState().emitVideoEnded();
  }, [isHost]);

  const handleError = useCallback((e) => {
    console.warn('Player error:', e);
    setHasError(true);
    const msg = e?.message || '';
    if (msg.includes('not found') || msg.includes('404')) {
      setErrorMessage('Video not found or is private.');
    } else if (msg.includes('unavailable')) {
      setErrorMessage('This video is unavailable in your region.');
    } else {
      setErrorMessage('Failed to load video. Please try again.');
    }
  }, []);

  const ambientColor = useAmbientGlow(playerRef, isPlaying && isSynced);

  const { isPiPActive, nativePiPSupported, togglePiP } = usePictureInPicture(playerRef);

  const handleTogglePiP = useCallback(async () => {
    const result = await togglePiP();
    if (!result && nativePiPSupported) {
      setIsMiniPlayer(true);
    }
  }, [togglePiP, nativePiPSupported, setIsMiniPlayer]);

  const handleToggleTheaterMode = useCallback(() => {
    setIsTheaterMode((prev) => !prev);
  }, []);

  const handleExpand = useCallback(() => {
    const store = usePlayerStore.getState();
    if (store.roomId) {
      store.setIsMiniPlayer(false);
      navigate(`/room/${store.roomId}`);
    }
  }, [navigate]);

  const handleClose = useCallback(() => {
    const playerState = usePlayerStore.getState();
    playerState.resetPlayer();
    useSocketStore.getState().disconnectSocket();
    useRoomStore.getState().clearRoomState();
  }, []);

  const skipForward = useCallback(() => {
    if (!hasControl) return;
    setHasPlayedOnce(true);
    handleSeekTo(Math.min(currentTime + 10, duration));
  }, [hasControl, currentTime, duration, handleSeekTo, setHasPlayedOnce]);

  const skipBackward = useCallback(() => {
    if (!hasControl) return;
    setHasPlayedOnce(true);
    handleSeekTo(Math.max(currentTime - 10, 0));
  }, [hasControl, currentTime, handleSeekTo, setHasPlayedOnce]);

  const formatTime = useCallback((seconds) => {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  const handleProgressPointerDown = useCallback((e) => {
    if (!progressRef.current || duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    const time = x * duration;
    handleSeekTo(time);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [duration, handleSeekTo]);

  const handleProgressPointerMove = useCallback((e) => {
    if (!progressRef.current || duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    setSeekHoverPos(x);
    setSeekHoverTime(x * duration);
    setIsHoveringSeek(true);
  }, [duration]);

  const handleProgressPointerUp = useCallback((e) => {
    if (duration <= 0) return;
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    handleSeekTo(x * duration);
  }, [duration, handleSeekTo]);

  const handleProgressPointerLeave = useCallback(() => {
    setIsHoveringSeek(false);
  }, []);

  const doubleTapRef = useRef({ lastTap: 0, timer: null });
  const handlePlayerClick = useCallback((e) => {
    if (!isMobile || !hasControl || !duration) return;
    const now = Date.now();
    const dt = doubleTapRef.current;
    if (now - dt.lastTap < 300) {
      if (dt.timer) clearTimeout(dt.timer);
      dt.timer = null;
      dt.lastTap = 0;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width / 2) {
        handleSeekTo(Math.max(currentTime - 10, 0));
      } else {
        handleSeekTo(Math.min(currentTime + 10, duration));
      }
    } else {
      dt.lastTap = now;
      dt.timer = setTimeout(() => {
        dt.lastTap = 0;
        dt.timer = null;
        handleTogglePlay();
      }, 300);
    }
  }, [isMobile, hasControl, duration, currentTime, handleSeekTo, handleTogglePlay]);

  useEffect(() => {
    if (!isRoomMode || !isMobile) return;
    const el = document.querySelector('[data-fullscreen-container]');
    if (!el) return;
    el.addEventListener('click', handlePlayerClick);
    return () => el.removeEventListener('click', handlePlayerClick);
  }, [isRoomMode, isMobile, handlePlayerClick]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isRoomMode && !isMiniPlayer) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleTogglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, localVolume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, localVolume - 0.1));
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          handleToggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          handleToggleMute();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          handleToggleTheaterMode();
          break;
      }

      if (e.key >= '0' && e.key <= '9' && duration > 0) {
        e.preventDefault();
        handleSeekTo((parseInt(e.key) / 10) * duration);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRoomMode, isMiniPlayer, handleTogglePlay, skipBackward, skipForward,
      handleVolumeChange, localVolume, handleToggleFullscreen, handleToggleMute,
      handleToggleTheaterMode, handleSeekTo, duration]);

  const controlsCommonProps = {
    duration, currentTime, isPlaying, volume: localVolume, isMuted, playbackRate,
    onTogglePlay: handleTogglePlay, onSeekTo: handleSeekTo,
    onToggleMute: handleToggleMute, onVolumeChange: handleVolumeChange,
    onPlaybackRateChange: handlePlaybackRateChange,
    hasControl, isHost, syncStatus: playerStore.syncStatus || 'synced',
    formatTime, sourceType,
    progressPercent, progressRef, seekHoverPos, seekHoverTime, isHoveringSeek,
    onProgressPointerDown: handleProgressPointerDown,
    onProgressPointerMove: handleProgressPointerMove,
    onProgressPointerUp: handleProgressPointerUp,
    onProgressPointerLeave: handleProgressPointerLeave,

    videoTitle, onExpand: handleExpand, onClose: handleClose,
    onToggleFullscreen: handleToggleFullscreen, isFullscreen,
    onToggleTheaterMode: handleToggleTheaterMode, isTheaterMode,
    onTogglePiP: handleTogglePiP, isPiPActive, nativePiPSupported,
    onSkipForward: skipForward, onSkipBackward: skipBackward,
  };

  if (!isAuthenticated || isClosed || !isValidVideo) return null;

  const style = isRoomMode
    ? {
        position: 'fixed',
        left: `${slotRect?.left || 0}px`,
        top: `${slotRect?.top || 0}px`,
        width: `${slotRect?.width || 640}px`,
        height: `${slotRect?.height || 360}px`,
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

  const playerContent = (
    <PlayerSyncManager
      playerRef={playerRef}
      sourceType={sourceType}
      isReady={isReady}
      isValidVideo={isValidVideo}
    >
      {(syncApi) => (
        <div className="w-full h-full relative" data-fullscreen-container>
          {hasError && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-youtube-red/10 border border-youtube-red/20 flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Playback Error</h4>
              <p className="text-[11px] text-slate-400 max-w-xs">{errorMessage}</p>
            </div>
          )}
          {!hasError && isMobile && isMiniPlayer && (
            <div className="absolute inset-0 opacity-0 pointer-events-none">
              <PlayerFactory
                ref={playerRef}
                sourceType={sourceType}
                videoId={currentVideoId}
                playing={isSynced && isPlaying}
                volume={localVolume}
                muted={!hasPlayedOnce ? true : isMuted}
                playbackRate={playbackRate}
                onReady={() => { setIsReady(true); syncApi.onPlayerReady(); }}
                onPlay={() => { setHasPlayedOnce(true); syncApi.handlePlay(); }}
                onPause={syncApi.handlePause}
                onEnded={handleEnded}
                onDuration={setDuration}
                onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)}
                onSeek={(seconds) => setCurrentTime(seconds)}
                onError={handleError}
              />
            </div>
          )}
          {!hasError && !(isMobile && isMiniPlayer) && (
            <PlayerFactory
              ref={playerRef}
              sourceType={sourceType}
              videoId={currentVideoId}
              playing={isSynced && isPlaying}
              volume={localVolume}
              muted={!hasPlayedOnce ? true : isMuted}
              playbackRate={playbackRate}
              onReady={() => { setIsReady(true); syncApi.onPlayerReady(); }}
              onPlay={() => { setHasPlayedOnce(true); syncApi.handlePlay(); }}
              onPause={syncApi.handlePause}
              onEnded={handleEnded}
              onDuration={setDuration}
              onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)}
              onSeek={(seconds) => setCurrentTime(seconds)}
              onError={handleError}
            />
          )}

          {isRoomMode && (
            <PlayerControls
              mode="full"
              {...controlsCommonProps}
            />
          )}

          {isMiniPlayer && (
            isMobile
              ? <PlayerControls mode="mini-mobile" {...controlsCommonProps} />
              : <PlayerControls mode="mini-desktop" {...controlsCommonProps} />
          )}
        </div>
      )}
    </PlayerSyncManager>
  );

  return (
    <>
      <div ref={dragConstraintsRef}
        className={`fixed ${isMobile ? 'inset-3' : 'inset-6'} pointer-events-none z-40`} />
      <motion.div
        layout={!isMobile}
        drag={isMiniPlayer && !isMobile}
        dragConstraints={dragConstraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        className={`bg-slate-950/85 backdrop-blur-md border border-slate-800/80 pointer-events-auto flex items-center justify-center select-none transition-all duration-500 ${
          isRoomMode && isTheaterMode ? '!fixed !inset-x-0 !top-0 !bottom-0 !w-full !h-full !z-40 rounded-none border-0' : ''
        }`}
        style={{
          ...style,
          ...(ambientColor && isPlaying && isSynced ? {
            boxShadow: `0 0 60px 20px rgba(${ambientColor.replace('rgb(', '').replace(')', '')},0.15), 0 0 120px 40px rgba(${ambientColor.replace('rgb(', '').replace(')', '')},0.08)`,
          } : {}),
        }}
      >
        {isMiniPlayer && !isMobile && (
          <div onPointerDown={handleResizePointerDown}
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-20 hover:bg-slate-800/50 flex items-center justify-center rounded-br"
            title="Drag to resize">
            <svg width="8" height="8" viewBox="0 0 8 8" className="text-slate-500 hover:text-white">
              <path d="M6 0 L0 6 M7 2 L2 7 M8 4 L4 8" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
        )}

        {isRoomMode && isTheaterMode && (
          <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm pointer-events-none" />
        )}

        {playerContent}
      </motion.div>
    </>
  );
};

export default PlayerContainer;
