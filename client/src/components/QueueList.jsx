import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import { Play, Trash2, ListVideo, Tv } from 'lucide-react';

const QueueList = () => {
  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();
  const { emitApproveQueueItem, emitRemoveFromQueue } = useSocketStore();

  if (!currentRoom) return null;

  const queue = currentRoom.queue || [];
  const isHost = currentRoom?.hostId && user?._id && String(currentRoom.hostId._id || currentRoom.hostId) === String(user._id);

  const handlePlayItem = (itemId) => {
    emitApproveQueueItem(itemId);
  };

  const handleRemoveItem = (itemId) => {
    emitRemoveFromQueue(itemId);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 flex flex-col h-full border border-slate-800/80">
      {}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <ListVideo size={18} className="text-youtube-red" />
          <h3 className="font-bold text-white text-base">Video Requests</h3>
        </div>
        <span className="bg-youtube-red/10 text-youtube-red text-[11px] font-bold px-2 py-0.5 rounded-full">
          {queue.length}
        </span>
      </div>

      {/* Requests list container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0 md:min-h-[280px] max-h-none md:max-h-[420px] lg:max-h-[500px] xl:max-h-[600px]">
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
            <div className="p-3 bg-slate-800/30 rounded-full text-slate-600">
              <Tv size={24} />
            </div>
            <p className="text-center text-xs text-slate-500">
              Queue is empty.
              <br />
              <span className="text-[10px] text-slate-650 mt-0.5 block">Suggest a video using the link input above!</span>
            </p>
          </div>
        ) : (
          queue.map((item) => (
            <div
              key={item._id}
              className="flex items-center justify-between gap-3 p-3 bg-slate-800/25 border border-slate-700/20 hover:border-slate-700/40 rounded-2xl transition-all duration-150"
            >
              {/* Info column */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-slate-200 truncate" title={item.title}>
                  {item.title}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                  Suggested by: <span className="text-slate-400 font-medium">{item.requestedBy}</span>
                </p>
              </div>

              {/* Controls column */}
              <div className="flex shrink-0 items-center gap-1.5">
                {isHost ? (
                  <>
                    <button
                      onClick={() => handlePlayItem(item._id)}
                      className="p-2 bg-youtube-red/15 hover:bg-youtube-red/25 border border-youtube-red/20 text-youtube-red hover:scale-105 active:scale-95 rounded-xl transition-all duration-150"
                      title="Approve and Play Video"
                    >
                      <Play size={12} fill="currentColor" />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      className="p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700/50 text-slate-400 hover:text-slate-250 hover:scale-105 active:scale-95 rounded-xl transition-all duration-150"
                      title="Deny and Remove Request"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                ) : (
                  <span className="text-[9px] bg-slate-800 border border-slate-700/40 text-slate-400 font-bold px-2 py-0.5 rounded-full select-none">
                    Suggested
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QueueList;
