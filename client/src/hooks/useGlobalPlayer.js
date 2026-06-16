import usePlayerStore from '../store/playerStore';
import useSocketStore from '../store/socketStore';
import useRoomStore from '../store/roomStore';
import { useNavigate } from 'react-router-dom';

const useGlobalPlayer = () => {
  const navigate = useNavigate();
  const socketStore = useSocketStore();
  const roomStore = useRoomStore();
  const {
    emitVideoEnded,
    emitVideoPlaybackRate,
  } = socketStore;
  
  const {
    currentVideoId,
    roomId,
    currentTime,
    isPlaying,
    volume,
    isMuted,
    playbackRate,
    isMiniPlayer,
    isClosed,
    mediaType,
    slotRect,
    isSynced,
    hasSyncedInitial,
    syncStatus,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setIsMuted,
    setPlaybackRate,
    setIsMiniPlayer,
    setIsClosed,
    setSlotRect,
    setIsSynced,
    setHasSyncedInitial,
    setSyncStatus,
    resetPlayer,
    initPlayer,
  } = usePlayerStore();

  const play = () => {
    setIsPlaying(true);
  };

  const pause = () => {
    setIsPlaying(false);
  };

  const mute = () => {
    setIsMuted(true);
  };

  const unmute = () => {
    setIsMuted(false);
  };

  const expand = () => {
    if (roomId) {
      setIsMiniPlayer(false);
      navigate(`/room/${roomId}`);
    }
  };

  const close = () => {
    resetPlayer();
    socketStore.disconnectSocket();
    roomStore.clearRoomState();
  };

  return {
    currentVideoId,
    roomId,
    currentTime,
    isPlaying,
    volume,
    isMuted,
    playbackRate,
    isMiniPlayer,
    isClosed,
    mediaType,
    slotRect,
    isSynced,
    hasSyncedInitial,
    syncStatus,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setIsMuted,
    setPlaybackRate,
    setIsMiniPlayer,
    setIsClosed,
    setSlotRect,
    setIsSynced,
    setHasSyncedInitial,
    setSyncStatus,
    initPlayer,
    resetPlayer,
    play,
    pause,
    mute,
    unmute,
    expand,
    close,
    emitVideoEnded,
    emitVideoPlaybackRate,
  };
};

export default useGlobalPlayer;
