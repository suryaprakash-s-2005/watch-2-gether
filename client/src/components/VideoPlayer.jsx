import { useEffect, useRef } from 'react';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import useGlobalPlayer from '../hooks/useGlobalPlayer';
import { Tv } from 'lucide-react';

const VideoPlayer = () => {
  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();
  const { emitRequestSync } = useSocketStore();
  const { isSynced, setIsSynced, setIsPlaying, setSlotRect, hasSyncedInitial, setHasSyncedInitial } = useGlobalPlayer();

  const containerRef = useRef(null);

  const isHost = currentRoom?.hostId && user?._id && String(currentRoom.hostId._id || currentRoom.hostId) === String(user._id);
  const videoUrl = currentRoom?.currentVideo
    ? `https://www.youtube.com/watch?v=${currentRoom.currentVideo}`
    : null;

  useEffect(() => {
    if (currentRoom) {
      if (!currentRoom.isPlaying) {
        setIsSynced(true);
        setHasSyncedInitial(true);
      } else if (!isHost && !hasSyncedInitial) {
        setIsSynced(false);
      }
    }
  }, [currentRoom, isHost, hasSyncedInitial, setIsSynced, setHasSyncedInitial]);

  // Track position and size of the placeholder slot
  useEffect(() => {
    const updateRect = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();

        setSlotRect({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        });

      }
    };

    updateRect();

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { passive: true });

    // Track layout changes (e.g. sidebar toggle)
    const resizeObserver = new ResizeObserver(() => {
      updateRect();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
      resizeObserver.disconnect();
      setSlotRect(null); // Clear coordinates on unmount
    };
  }, [setSlotRect, videoUrl]);

  const handleSyncClick = () => {
    setIsSynced(true);
    setHasSyncedInitial(true);
    setIsPlaying(true);
    // Request the current server state so the response will trigger a fresh
    // room-state → playbackCommand with the accurate time and syncVersion.
    emitRequestSync();
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800/80 shadow-2xl"
    >
      {!videoUrl ? (
        // No Video Playing Screen
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2 sm:gap-4 p-4 sm:p-8 text-center bg-slate-900/40 overflow-hidden">
          <div className="p-3 sm:p-5 bg-slate-800/40 rounded-full border border-slate-700/50 text-slate-400 animate-pulse flex items-center justify-center">
            <Tv className="w-6 h-6 sm:w-11 sm:h-11" />
          </div>
          <div className="max-w-[85%] sm:max-w-sm">
            <h3 className="text-sm sm:text-xl font-bold text-slate-200 mb-0.5 sm:mb-1">
              No Video Playing
            </h3>
            <p className="text-[10px] sm:text-sm text-slate-400 leading-normal sm:leading-relaxed mx-auto">
              {isHost
                ? "Paste a YouTube link or Video ID in the input box above to start streaming."
                : "Waiting for the Host to start a stream. Hang tight!"}
            </p>
          </div>
        </div>
      ) : !isSynced ? (
        // Join & Sync overlay screen
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-30 p-4 text-center">
          <div className="p-4 bg-youtube-red/10 border border-youtube-red/20 rounded-full text-youtube-red mb-4 animate-bounce">
            <Tv className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mb-2">Watch Party is Active</h3>
          <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mb-6">
            The host is streaming a video. Click below to synchronize your playback and audio.
          </p>
          <button
            onClick={handleSyncClick}
            className="bg-youtube-red hover:bg-youtube-hover text-white font-bold text-sm px-6 py-3 min-h-[44px] rounded-2xl shadow-lg shadow-youtube-red/20 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            Join & Sync Stream
          </button>
        </div>
      ) : (
        // Empty slot showing loading spinner while the Global player overlays on top
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-950">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-youtube-red mb-3"></div>
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Synchronizing...</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
