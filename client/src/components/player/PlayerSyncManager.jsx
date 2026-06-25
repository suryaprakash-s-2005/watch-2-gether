import { useEffect, useRef, useCallback } from 'react';
import usePlayerStore from '../../store/playerStore';
import useRoomStore from '../../store/roomStore';
import useAuthStore from '../../store/authStore';
import useSocketStore from '../../store/socketStore';

const PlayerSyncManager = ({ playerRef, isReady, isValidVideo, children }) => {
  const {
    currentVideoId, isPlaying, isSynced,
    setIsPlaying, setCurrentTime, setPlaybackRate, setIsSynced, setSyncStatus,
  } = usePlayerStore();

  const { currentRoom, playbackCommand, setPlaybackCommand, updateRoomPlayback } = useRoomStore();
  const { user } = useAuthStore();
  const { emitVideoPlay, emitVideoPause, emitVideoSeek, emitVideoSync } = useSocketStore();

  const localVersionRef = useRef(0);
  const suppressUntil = useRef(0);
  const localPlaybackRateRef = useRef(1);
  const lastSyncVideoIdRef = useRef(null);

  const isHost = currentRoom?.hostId && user?._id &&
    String(currentRoom.hostId._id || currentRoom.hostId) === String(user._id);

  const hasControl = isHost || currentRoom?.guestControlEnabled;

  const getCurrentTime = useCallback(() => {
    if (!playerRef?.current) return 0;
    if (typeof playerRef.current.getCurrentTime === 'function') {
      return playerRef.current.getCurrentTime();
    }
    return playerRef.current.currentTime || 0;
  }, [playerRef]);

  const seekTo = useCallback((time) => {
    if (!playerRef?.current) return;
    if (typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(time, 'seconds');
    } else {
      playerRef.current.currentTime = time;
    }
  }, [playerRef]);

  const applyPlaybackRate = useCallback((rate) => {
    if (!playerRef?.current) return;
    if (typeof playerRef.current.playbackRate !== 'undefined') {
      playerRef.current.playbackRate = rate;
    }
    localPlaybackRateRef.current = rate;
    setPlaybackRate(rate);
  }, [playerRef, setPlaybackRate]);

  const suppress = useCallback((ms = 1200) => {
    suppressUntil.current = Date.now() + ms;
  }, []);

  const isSuppressed = useCallback(() => Date.now() < suppressUntil.current, []);

  const getDriftThreshold = useCallback((duration) => {
    const base = Math.max(0.5, Math.min(3, (duration || 600) * 0.01));
    return base;
  }, []);

  const handlePlay = useCallback(() => {
    if (!hasControl || isSuppressed()) return;
    const time = getCurrentTime();
    setIsPlaying(true);
    updateRoomPlayback({ isPlaying: true, currentTime: time });
    emitVideoPlay(time);
    suppress(1200);
  }, [hasControl, getCurrentTime, setIsPlaying, updateRoomPlayback, emitVideoPlay, suppress, isSuppressed]);

  const handlePause = useCallback(() => {
    if (!hasControl || isSuppressed()) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const time = getCurrentTime();
    setIsPlaying(false);
    updateRoomPlayback({ isPlaying: false, currentTime: time });
    emitVideoPause(time);
    suppress(1200);
  }, [hasControl, getCurrentTime, setIsPlaying, updateRoomPlayback, emitVideoPause, suppress, isSuppressed]);

  const emitSeekToServer = useCallback((seconds) => {
    if (!hasControl) return;
    updateRoomPlayback({ currentTime: seconds });
    emitVideoSeek(seconds);
    suppress(1200);
  }, [hasControl, updateRoomPlayback, emitVideoSeek, suppress]);

  const onPlayerReady = useCallback(() => {
    if (lastSyncVideoIdRef.current === currentVideoId) return;
    if (currentVideoId) {
      lastSyncVideoIdRef.current = currentVideoId;
      suppress(2000);
      const roomRate = currentRoom?.playbackRate || 1;
      applyPlaybackRate(roomRate);
    }
  }, [currentVideoId, currentRoom?.playbackRate, applyPlaybackRate, suppress]);

  useEffect(() => {
    if (!isValidVideo || !playbackCommand || !isReady) return;

    const { type, time, isPlaying: shouldPlay, syncVersion, rate, playbackRate: cmdRate } = playbackCommand;

    if (syncVersion !== undefined && syncVersion <= localVersionRef.current) {
      setPlaybackCommand(null);
      return;
    }
    if (syncVersion !== undefined) {
      localVersionRef.current = syncVersion;
    }

    if (type === 'play') {
      suppress(1200); setIsPlaying(true); seekTo(time); setCurrentTime(time);
      updateRoomPlayback({ isPlaying: true, currentTime: time });
      setIsSynced(true); setSyncStatus('synced');
    } else if (type === 'pause') {
      suppress(1200); setIsPlaying(false); seekTo(time); setCurrentTime(time);
      updateRoomPlayback({ isPlaying: false, currentTime: time });
      setIsSynced(true); setSyncStatus('synced');
    } else if (type === 'seek') {
      suppress(1200); seekTo(time); setCurrentTime(time);
      updateRoomPlayback({ currentTime: time });
      setIsSynced(true); setSyncStatus('synced');
    } else if (type === 'change') {
      suppress(1200); setIsPlaying(false); setIsSynced(false);
      seekTo(0); setCurrentTime(0);
      updateRoomPlayback({ currentTime: 0, isPlaying: false });
      setIsSynced(true); setSyncStatus('synced');
    } else if (type === 'rate') {
      if (rate && rate !== localPlaybackRateRef.current) {
        applyPlaybackRate(rate);
        updateRoomPlayback({ playbackRate: rate });
      }
    } else if (type === 'sync' || type === 'drift-sync') {
      const localTime = getCurrentTime();
      const diff = localTime - time;
      const absDiff = Math.abs(diff);
      const isRoomPlaying = shouldPlay !== undefined ? shouldPlay : type === 'drift-sync';

      if (cmdRate && cmdRate !== localPlaybackRateRef.current) {
        applyPlaybackRate(cmdRate);
      }

      const threshold = getDriftThreshold(currentRoom?.duration || 600);

      if (absDiff < threshold) {
        setSyncStatus('synced');
      } else if (absDiff < threshold * 2) {
        setSyncStatus('drifted');
      } else {
        setSyncStatus('unsynced');
      }

      if (absDiff >= threshold * 2) {
        suppress(1200); seekTo(time); setCurrentTime(time);
        updateRoomPlayback({ isPlaying: isRoomPlaying, currentTime: time });
      }
      if (isPlaying !== isRoomPlaying) {
        setIsPlaying(isRoomPlaying);
      }
      setIsSynced(true);
    }

    setPlaybackCommand(null);
  }, [playbackCommand, isValidVideo, isReady, isPlaying, setIsPlaying, setIsSynced, setPlaybackCommand,
      updateRoomPlayback, setSyncStatus, applyPlaybackRate, seekTo, suppress, getCurrentTime,
      setCurrentTime, currentRoom?.duration, getDriftThreshold]);

  // Host periodic synchronization broadcast
  useEffect(() => {
    if (!isHost || !isValidVideo || !isPlaying || !isReady) return;

    const interval = setInterval(() => {
      const time = getCurrentTime();
      if (time > 0) {
        emitVideoSync(time);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isHost, isValidVideo, isPlaying, isReady, getCurrentTime, emitVideoSync]);

  useEffect(() => {
    if (isHost || !isValidVideo || !isPlaying) return;
    const interval = setInterval(() => {
      const currentRate = localPlaybackRateRef.current;
      const roomRate = currentRoom?.playbackRate || 1;
      if (Math.abs(currentRate - roomRate) > 0.01) {
        applyPlaybackRate(roomRate);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [isHost, isValidVideo, isPlaying, currentRoom?.playbackRate, applyPlaybackRate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) return;
      const player = playerRef?.current;
      if (!player) return;

      if (player.paused !== false && isHost && currentRoom?.isPlaying && isSynced) {
        suppress(2000);
        setIsPlaying(true);
        const localTime = getCurrentTime();
        const roomTime = currentRoom?.currentTime;
        if (roomTime !== undefined && Math.abs(localTime - roomTime) > 3) {
          seekTo(roomTime);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isHost, currentRoom?.isPlaying, currentRoom?.currentTime, isSynced, setIsPlaying,
      playerRef, getCurrentTime, seekTo, suppress]);

  /* eslint-disable react-hooks/refs */
  return children({
    handlePlay,
    handlePause,
    emitSeekToServer,
    onPlayerReady,
    applyPlaybackRate,
    isSuppressed,
    seekTo,
    getCurrentTime,
    localPlaybackRateRef,
    suppress,
  });
  /* eslint-enable react-hooks/refs */
};

export default PlayerSyncManager;
