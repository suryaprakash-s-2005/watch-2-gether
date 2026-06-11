import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import { Users, Star, User, Crown } from 'lucide-react';

const UserList = () => {
  const { currentRoom, roomUsers } = useRoomStore();
  const { user } = useAuthStore();
  const { emitTransferHost } = useSocketStore();

  if (!currentRoom) return null;

  const isCurrentUserHost = currentRoom?.hostId && user?._id && String(currentRoom.hostId._id || currentRoom.hostId) === String(user._id);

  return (
    <div className="glass-panel rounded-3xl p-6 flex flex-col h-full border border-slate-800/80">
      <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-800/60">
        <Users size={18} className="text-youtube-red" />
        <h3 className="font-bold text-white text-base">
          Active Watchers ({roomUsers.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[280px] max-h-[350px] md:max-h-[420px] lg:max-h-[500px] xl:max-h-[600px]">
        {roomUsers.map((member) => {
          const isUserHost = member.userId && currentRoom?.hostId && String(member.userId) === String(currentRoom.hostId._id || currentRoom.hostId);
          return (
            <div
              key={member.socketId || member.userId}
              className={`flex items-center justify-between p-2.5 rounded-2xl transition-all duration-200 ${
                isUserHost 
                  ? 'bg-youtube-red/5 border border-youtube-red/10' 
                  : 'bg-slate-800/20 border border-slate-700/10 hover:border-slate-700/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* User Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-850 border border-slate-750 flex items-center justify-center shrink-0">
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = ''; 
                      }}
                    />
                  ) : (
                    <User size={14} className="text-slate-400" />
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-350 truncate">
                  {member.username}
                </span>
              </div>

              {isUserHost ? (
                <div className="flex items-center gap-1 text-[10px] bg-youtube-red/10 border border-youtube-red/20 text-youtube-red py-0.5 px-2 rounded-full font-bold uppercase tracking-wider shrink-0">
                  <Star size={9} fill="currentColor" />
                  Host
                </div>
              ) : (
                isCurrentUserHost && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to transfer the Host role to ${member.username}?`)) {
                        emitTransferHost(member.userId);
                      }
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-yellow-500/10 hover:text-yellow-500 border border-slate-700/60 text-slate-400 hover:scale-105 active:scale-95 rounded-xl transition duration-150 flex items-center justify-center cursor-pointer shrink-0"
                    title={`Transfer host permissions to ${member.username}`}
                  >
                    <Crown size={12} />
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserList;
