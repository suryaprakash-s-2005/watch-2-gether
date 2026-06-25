import { useEffect, useRef } from 'react';
import useRoomStore from '../../store/roomStore';
import useAuthStore from '../../store/authStore';
import useSocketStore from '../../store/socketStore';
import usePlayerStore from '../../store/playerStore';
import { Tv } from 'lucide-react';

const PlayerSlot = () => {
  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();
  const { emitRequestSync } = useSocketStore();
  const {
    isSynced, setIsSynced, hasSyncedInitial, setHasSyncedInitial,
    setSlotRect, currentVideoId,
  } = usePlayerStore();

  const containerRef = useRef(null);

  const isHost = currentRoom?.hostId && user?._id &&
    String(currentRoom.hostId._id || currentRoom.hostId) === String(user._id);

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

  useEffect(() => {
    const updateRect = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSlotRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { passive: true });

    const ro = new ResizeObserver(updateRect);
    if (containerRef.current) ro.observe(containerRef.current);

    const mo = new MutationObserver(updateRect);
    if (containerRef.current?.parentElement) {
      mo.observe(containerRef.current.parentElement, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['class', 'style'],
      });
    }

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
      ro.disconnect();
      mo.disconnect();
      setSlotRect(null);
    };
  }, [setSlotRect, currentVideoId]);

  const handleSyncClick = () => {
    setIsSynced(true);
    setHasSyncedInitial(true);
    emitRequestSync();
  };

  const hasVideo = !!(currentRoom?.currentVideo);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800/80 shadow-2xl"
    >
      {!hasVideo ? (
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-30 p-4 text-center">
          <div className="p-4 bg-youtube-red/10 border border-youtube-red/20 rounded-full text-youtube-red mb-4 animate-bounce">
            <Tv className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mb-2">Watch Party is Active</h3>
          <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mb-6">
            The host is streaming. Click below to synchronize your playback.
          </p>
          <button
            onClick={handleSyncClick}
            className="bg-youtube-red hover:bg-youtube-hover text-white font-bold text-sm px-6 py-3 min-h-[44px] rounded-2xl shadow-lg shadow-youtube-red/20 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            Join & Sync Stream
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default PlayerSlot;
