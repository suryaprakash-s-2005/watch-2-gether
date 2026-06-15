import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useFriendStore from '../store/friendStore';
import Navbar from '../components/Navbar';
import { 
  Trophy, ArrowLeft, Users, Clock, Award
} from 'lucide-react';
import { motion } from 'framer-motion';

const TopFriends = () => {
  const navigate = useNavigate();
  const { topFriends, isLoading, fetchTopFriends } = useFriendStore();

  useEffect(() => {
    fetchTopFriends();
  }, [fetchTopFriends]);

  const top3 = topFriends.slice(0, 3);
  
  const podiumLayout = [];
  if (top3[1]) podiumLayout.push({ friend: top3[1], rank: 2, color: 'border-slate-400 bg-slate-800/40 text-slate-300', podiumHeight: 'h-28 sm:h-40', glow: 'shadow-slate-400/10' });
  if (top3[0]) podiumLayout.push({ friend: top3[0], rank: 1, color: 'border-yellow-500 bg-yellow-500/10 text-yellow-500', podiumHeight: 'h-36 sm:h-48', glow: 'shadow-yellow-500/15' });
  if (top3[2]) podiumLayout.push({ friend: top3[2], rank: 3, color: 'border-amber-700 bg-amber-800/10 text-amber-600', podiumHeight: 'h-20 sm:h-32', glow: 'shadow-amber-700/10' });

  const listFriends = topFriends.slice(3);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col relative overflow-hidden">
      {}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-youtube-red/5 rounded-full blur-3xl pointer-events-none"></div>

      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 relative z-10 flex flex-col gap-6">
        
        {}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/friends')}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition duration-200"
          >
            <ArrowLeft size={14} />
            Back to Friends Graph
          </button>
          
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="text-yellow-500 animate-bounce" size={20} />
            Top Watch Buddies
          </h1>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-youtube-red"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {topFriends.length === 0 ? (
              <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center">
                <Users className="mx-auto text-slate-700 mb-4" size={48} />
                <h3 className="text-lg font-bold text-white mb-2">No watch sessions recorded yet</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Join a room with friends and play a video! Your watch times together will display ranked leaderboards here.
                </p>
              </div>
            ) : (
              <>
                {/* Podium visualization */}
                <div className="flex items-end justify-center gap-2.5 sm:gap-6 pt-12 border-b border-slate-800/60 pb-8">
                  {podiumLayout.map(({ friend, rank, color, podiumHeight, glow }) => (
                    <motion.div 
                      key={friend._id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: rank * 0.1 }}
                      className="flex flex-col items-center flex-1 min-w-[75px] max-w-[150px] group cursor-pointer"
                      onClick={() => navigate(`/profile/${friend.username}`)}
                    >
                      {/* Avatar with dynamic glow */}
                      <div className="relative mb-3">
                        <div className={`absolute inset-0 bg-gradient-to-tr rounded-full blur opacity-30 group-hover:opacity-60 transition duration-300 ${
                          rank === 1 ? 'from-yellow-400 to-amber-500' : rank === 2 ? 'from-slate-300 to-slate-400' : 'from-amber-600 to-amber-800'
                        }`}></div>
                        <img 
                          src={friend.avatar} 
                          alt={friend.displayName} 
                          className={`w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover border-2 bg-slate-950 relative z-10 ${
                            rank === 1 ? 'border-yellow-500' : rank === 2 ? 'border-slate-400' : 'border-amber-700'
                          }`}
                        />
                        {/* Crown/Crown Indicator */}
                        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center p-0.5 rounded-full ${
                          rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-slate-300' : 'text-amber-600'
                        }`}>
                          <Award size={rank === 1 ? 18 : 15} className={rank === 1 ? 'animate-pulse' : ''} />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="text-center mb-2">
                        <div className="text-[10px] sm:text-xs font-bold text-white group-hover:text-youtube-red transition truncate max-w-[70px] sm:max-w-[110px]">{friend.displayName}</div>
                        <div className="text-[8px] sm:text-[10px] text-slate-400 truncate max-w-[70px] sm:max-w-[110px]">@{friend.username}</div>
                      </div>

                      {/* Podium Pillar */}
                      <div className={`w-full ${podiumHeight} border-t-2 border-x border-slate-800/80 rounded-t-2xl flex flex-col justify-between p-2 sm:p-3.5 text-center shadow-lg shadow-black/30 backdrop-blur-md ${color} ${glow}`}>
                        <div className="text-lg sm:text-2xl font-extrabold tracking-tight">{rank}</div>
                        <div className="flex flex-col items-center gap-0.5 mt-2">
                          <Clock size={10} className="text-slate-400" />
                          <span className="text-[10px] sm:text-[11px] font-extrabold text-white">{friend.hoursTogether}h</span>
                          <span className="text-[7px] sm:text-[8px] uppercase tracking-wider text-slate-400 leading-none">Together</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Tabular ranking list for rank 4 and below */}
                {listFriends.length > 0 && (
                  <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/20">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Friends Leaderboard</h3>
                    </div>
                    <div className="divide-y divide-slate-800/80">
                      {listFriends.map((friend, idx) => (
                        <div 
                          key={friend._id}
                          className="flex items-center justify-between p-4 hover:bg-slate-900/30 transition duration-150 cursor-pointer group"
                          onClick={() => navigate(`/profile/${friend.username}`)}
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-slate-500 w-5 text-center">#{idx + 4}</span>
                            <img 
                              src={friend.avatar} 
                              alt={friend.displayName} 
                              className="w-9 h-9 rounded-full object-cover border border-slate-850"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-white group-hover:text-youtube-red transition">{friend.displayName}</h4>
                              <p className="text-[10px] text-slate-500">@{friend.username}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-slate-300 font-bold text-xs bg-slate-800/40 border border-slate-800 px-3 py-1 rounded-xl">
                            <Clock size={11} className="text-slate-400" />
                            {friend.hoursTogether}h together
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TopFriends;
