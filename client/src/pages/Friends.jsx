import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useFriendStore from '../store/friendStore';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { 
  Users, UserPlus, Send, Check, X, 
  Trash2, TrendingUp, Sparkles, MessageCircle, Info, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Friends = () => {
  const navigate = useNavigate();
  const { 
    friends, pendingIncoming, pendingOutgoing, suggestions, isLoading, error,
    fetchFriends, sendRequest, acceptRequest, rejectRequest, removeFriend, fetchSuggestions 
  } = useFriendStore();

  const [activeTab, setActiveTab] = useState('all'); 
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [requestStatus, setRequestStatus] = useState({ success: null, message: '' });
  const [searchLoading, setSearchLoading] = useState(false);
  const bubbleContainerRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchFriends();
    fetchSuggestions();
  }, [fetchFriends, fetchSuggestions]);

  
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const query = searchUsername.trim();
      if (query.length >= 1) {
        try {
          const { data } = await api.get(`/friends/search-users?query=${encodeURIComponent(query)}`);
          setSearchResults(data);
          setShowDropdown(true);
        } catch (err) {
          console.error('Error searching users:', err);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 250); 

    return () => clearTimeout(delayDebounce);
  }, [searchUsername]);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    const target = searchUsername.trim();
    if (!target) return;

    setSearchLoading(true);
    setRequestStatus({ success: null, message: '' });
    setShowDropdown(false);

    const res = await sendRequest(target);
    if (res.success) {
      setRequestStatus({ success: true, message: res.message });
      setSearchUsername('');
    } else {
      setRequestStatus({ success: false, message: res.message });
    }
    setSearchLoading(false);

    
    setTimeout(() => {
      setRequestStatus({ success: null, message: '' });
    }, 4000);
  };

  
  const isMobile = windowWidth < 768;
  const getBubbleSizeClass = (hoursTogether, maxHours) => {
    const scale = isMobile ? 0.65 : 1.0;
    if (friends.length === 1) return { size: Math.round(120 * scale), label: 'Largest Bubble' };
    if (hoursTogether === maxHours && maxHours > 0) {
      return { size: Math.round(120 * scale), label: 'Largest Bubble' }; 
    } else if (hoursTogether > 0.1 || hoursTogether >= maxHours * 0.4) {
      return { size: Math.round(95 * scale), label: 'Medium Bubble' };  
    }
    return { size: Math.round(75 * scale), label: 'Small Bubble' };      
  };

  const maxHours = friends.length > 0 ? Math.max(...friends.map(f => f.hoursTogether || 0)) : 0;

  
  const formatLastSeen = (dateStr) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 5 * 60 * 1000) return 'Online';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col relative overflow-hidden">
      {}
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-youtube-red/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Side: Friends List, Requests & Suggestions (8 columns on lg) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Add Friend Box */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-slate-750 transition duration-300 relative z-20">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <UserPlus className="text-youtube-red" size={20} />
              Add Friend by Username
            </h2>
            <form onSubmit={handleAddFriend} className="flex flex-col sm:flex-row gap-2 relative w-full">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  placeholder="Enter the username"
                  className="glass-input px-4 py-3 rounded-xl w-full text-sm focus:ring-2 focus:ring-youtube-red focus:outline-none"
                  disabled={searchLoading}
                  onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                  onBlur={() => { 
                    // Delayed close to allow clicks in suggestions list first
                    setTimeout(() => setShowDropdown(false), 200); 
                  }}
                />

                {/* Suggestions Autocomplete List */}
                <AnimatePresence>
                  {showDropdown && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 backdrop-blur-md"
                    >
                      {searchResults.map(match => (
                        <div
                          key={match._id}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-900/60 transition cursor-pointer"
                          onMouseDown={() => {
                            setSearchUsername(match.username);
                            setShowDropdown(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <img 
                              src={match.avatar} 
                              alt={match.displayName} 
                              className="w-7 h-7 rounded-full object-cover border border-slate-850"
                            />
                            <div>
                              <div className="text-xs font-bold text-white leading-none">{match.displayName}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">@{match.username}</div>
                            </div>
                          </div>

                          {/* Quick Friendship actions inside autocomplete */}
                          <div className="text-[9px] font-bold">
                            {match.friendshipStatus === 'accepted' && (
                              <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/10">Friends</span>
                            )}
                            {match.friendshipStatus === 'pending_sent' && (
                              <span className="text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/10">Requested</span>
                            )}
                            {match.friendshipStatus === 'pending_received' && (
                              <button
                                onMouseDown={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  await acceptRequest(match._id);
                                  // Refresh query result status
                                  setSearchUsername('');
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg transition font-extrabold cursor-pointer"
                              >
                                Accept
                              </button>
                            )}
                            {match.friendshipStatus === 'none' && (
                              <button
                                onMouseDown={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  await sendRequest(null, match._id);
                                  setSearchUsername('');
                                }}
                                className="bg-youtube-red hover:bg-youtube-hover text-white px-2.5 py-1 rounded-lg transition font-extrabold cursor-pointer"
                              >
                                Add Friend
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="submit"
                disabled={searchLoading || !searchUsername.trim()}
                className="w-full sm:w-auto bg-youtube-red hover:bg-youtube-hover disabled:opacity-55 text-white font-bold py-2.5 px-5 rounded-xl transition flex items-center justify-center gap-2 text-sm h-fit shrink-0"
              >
                {searchLoading ? 'Sending...' : 'Send Request'}
                <Send size={14} />
              </button>
            </form>

            <AnimatePresence>
              {requestStatus.message && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed ${
                    requestStatus.success 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-youtube-red/10 border-youtube-red/20 text-youtube-red'
                  }`}
                >
                  {requestStatus.message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main Friends Management Card */}
          <div className="glass-panel rounded-3xl border border-slate-800 flex flex-col flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="flex flex-wrap border-b border-slate-800 bg-slate-900/40 p-2 gap-1.5">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'all' 
                    ? 'bg-slate-800 text-white border border-slate-700/50 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users size={14} />
                <span>Friends ({friends.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 relative cursor-pointer ${
                  activeTab === 'pending' 
                    ? 'bg-slate-800 text-white border border-slate-700/50 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageCircle size={14} />
                <span>Requests</span>
                {pendingIncoming.length > 0 && (
                  <span className="absolute -top-1.5 -right-1 bg-youtube-red text-white text-[9px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                    {pendingIncoming.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'suggestions' 
                    ? 'bg-slate-800 text-white border border-slate-700/50 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles size={14} />
                <span>Suggestions</span>
              </button>
            </div>

            {/* List Panels */}
            <div className="p-5 overflow-y-auto max-h-[420px] flex-1">
              {isLoading && (
                <div className="py-12 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-youtube-red"></div>
                </div>
              )}

              {!isLoading && (
                <AnimatePresence mode="wait">
                  {activeTab === 'all' && (
                    <motion.div 
                      key="all"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      {friends.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-sm">
                          <Users className="mx-auto text-slate-700 mb-3" size={40} />
                          No friends added yet. Send requests to invite friends!
                        </div>
                      ) : (
                        friends.map(friend => (
                          <div 
                            key={friend._id}
                            className="flex items-center justify-between p-3.5 bg-slate-900/50 rounded-2xl border border-slate-800 hover:border-slate-750 transition duration-200 group"
                          >
                            <div 
                              className="flex items-center gap-3.5 cursor-pointer"
                              onClick={() => navigate(`/profile/${friend.username}`)}
                            >
                              <div className="relative">
                                <img 
                                  src={friend.avatar} 
                                  alt={friend.displayName} 
                                  className="w-11 h-11 rounded-full object-cover border border-slate-800 bg-slate-950"
                                />
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                                  formatLastSeen(friend.lastSeen) === 'Online' ? 'bg-emerald-500' : 'bg-slate-500'
                                }`}></div>
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-youtube-red transition-colors">{friend.displayName}</h4>
                                <p className="text-[11px] text-slate-400">@{friend.username} • {friend.hoursTogether}h watched together</p>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => removeFriend(friend._id)}
                              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-700/50 hover:border-red-500/20 transition cursor-pointer"
                              title="Remove Friend"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'pending' && (
                    <motion.div 
                      key="pending"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {/* Incoming Requests */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Incoming Requests ({pendingIncoming.length})</h3>
                        {pendingIncoming.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-2">No pending incoming requests.</p>
                        ) : (
                          <div className="space-y-2">
                            {pendingIncoming.map(req => (
                              <div key={req.friendshipId} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-2xl border border-slate-850">
                                <div 
                                  className="flex items-center gap-3 cursor-pointer"
                                  onClick={() => navigate(`/profile/${req.user.username}`)}
                                >
                                  <img src={req.user.avatar} alt={req.user.displayName} className="w-9 h-9 rounded-full object-cover border border-slate-850" />
                                  <div>
                                    <h4 className="text-xs font-bold text-white">{req.user.displayName}</h4>
                                    <p className="text-[10px] text-slate-400">@{req.user.username}</p>
                                  </div>
                                </div>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => acceptRequest(req.user._id)}
                                    className="p-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition flex items-center gap-1 shadow-sm"
                                  >
                                    <Check size={12} /> Accept
                                  </button>
                                  <button
                                    onClick={() => rejectRequest(req.user._id)}
                                    className="p-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-[10px] border border-slate-700/60 transition flex items-center gap-1"
                                  >
                                    <X size={12} /> Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {}
                      <div className="pt-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sent Requests ({pendingOutgoing.length})</h3>
                        {pendingOutgoing.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-2">No pending sent requests.</p>
                        ) : (
                          <div className="space-y-2">
                            {pendingOutgoing.map(req => (
                              <div key={req.friendshipId} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-2xl border border-slate-850">
                                <div 
                                  className="flex items-center gap-3 cursor-pointer"
                                  onClick={() => navigate(`/profile/${req.user.username}`)}
                                >
                                  <img src={req.user.avatar} alt={req.user.displayName} className="w-9 h-9 rounded-full object-cover opacity-70" />
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-300">{req.user.displayName}</h4>
                                    <p className="text-[10px] text-slate-500">@{req.user.username}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeFriend(req.user._id)} // Delete pending request
                                  className="p-1.5 px-3 rounded-lg bg-slate-850 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 transition text-[10px] font-medium"
                                >
                                  Cancel Request
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'suggestions' && (
                    <motion.div 
                      key="suggestions"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      {suggestions.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-sm">
                          <TrendingUp className="mx-auto text-slate-700 mb-3" size={40} />
                          No recommendations found. Keep watching rooms with others!
                        </div>
                      ) : (
                        suggestions.map(sug => (
                          <div key={sug.user._id} className="flex items-center justify-between p-3.5 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <div 
                              className="flex items-center gap-3 cursor-pointer"
                              onClick={() => navigate(`/profile/${sug.user.username}`)}
                            >
                              <img src={sug.user.avatar} alt={sug.user.displayName} className="w-10 h-10 rounded-full object-cover border border-slate-850" />
                              <div>
                                <h4 className="text-xs font-bold text-white">{sug.user.displayName}</h4>
                                <p className="text-[10px] text-slate-400">@{sug.user.username}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {sug.reasons.slice(0, 2).map((r, i) => (
                                    <span key={i} className="text-[9px] font-semibold bg-slate-800/80 text-sky-400 px-1.5 py-0.5 rounded border border-slate-750/30">
                                      {r}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => sendRequest(null, sug.user._id)}
                              className="p-2 px-3 rounded-lg bg-youtube-red hover:bg-youtube-hover text-white font-bold text-[10px] transition shadow-sm"
                            >
                              Add Friend
                            </button>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Animated Floating Bubble Graph (5 columns on lg) */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-[450px]">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col flex-1 overflow-hidden hover:border-slate-750 transition duration-300">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="text-sky-400 animate-pulse" size={18} />
                Friends Social Graph
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Bubbles sizes map to watch time together. Grabs bubbles to float/drag them!
              </p>
            </div>

            {}
            <div 
              ref={bubbleContainerRef}
              className="flex-1 bg-slate-950/40 rounded-2xl border border-slate-900 relative overflow-hidden min-h-[360px] flex items-center justify-center cursor-grab active:cursor-grabbing"
            >
              {friends.length === 0 ? (
                <div className="text-center text-slate-600 text-xs px-6">
                  <Users className="mx-auto text-slate-850 mb-3" size={48} />
                  Floating bubbles will appear here once you watch videos with friends.
                </div>
              ) : (
                
                friends.map((friend, idx) => {
                  const bubble = getBubbleSizeClass(friend.hoursTogether, maxHours);
                  
                  
                  const total = friends.length;
                  const angle = (idx / total) * 2 * Math.PI;
                  const radius = (isMobile ? 55 : 80) + idx * (isMobile ? 5 : 8); // spiral spread scaled for mobile
                  
                  const initX = Math.cos(angle) * radius;
                  const initY = Math.sin(angle) * radius;

                  // Unique animated float settings per bubble
                  const duration = 6 + (idx % 3) * 2;
                  const yFloat = [initY, initY - 15, initY + 5, initY];
                  const xFloat = [initX, initX + 8, initX - 8, initX];
                  
                  return (
                    <motion.div
                      key={friend._id}
                      drag
                      dragConstraints={bubbleContainerRef}
                      dragElastic={0.4}
                      dragMomentum={true}
                      initial={{ scale: 0, x: initX, y: initY }}
                      animate={{ 
                        scale: 1,
                        x: xFloat,
                        y: yFloat
                      }}
                      transition={{
                        scale: { duration: 0.5, delay: idx * 0.1 },
                        x: { repeat: Infinity, duration: duration, ease: "easeInOut" },
                        y: { repeat: Infinity, duration: duration - 1, ease: "easeInOut" }
                      }}
                      className="absolute flex items-center justify-center group"
                      style={{
                        width: bubble.size,
                        height: bubble.size,
                        zIndex: 10 + idx
                      }}
                    >
                      {/* Glow backing */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-youtube-red to-sky-500 rounded-full opacity-20 group-hover:opacity-40 blur transition duration-300"></div>
                      
                      {}
                      <div 
                        className="w-[92%] h-[92%] rounded-full overflow-hidden border border-white/10 group-hover:border-youtube-red/50 shadow-xl bg-slate-900 flex flex-col items-center justify-center relative z-10 transition duration-300 cursor-pointer"
                        onClick={() => navigate(`/profile/${friend.username}`)}
                      >
                        <img 
                          src={friend.avatar} 
                          alt={friend.displayName} 
                          className="w-full h-full object-cover absolute inset-0 pointer-events-none group-hover:scale-105 group-hover:brightness-[0.35] transition-all duration-300"
                        />
                        
                        {/* Text Overlay on Hover */}
                        <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-2 text-center transition-opacity duration-200">
                          <p className="text-[10px] font-bold text-white truncate max-w-full">{friend.displayName}</p>
                          <p className="text-[8px] text-sky-400 font-bold mt-0.5">{friend.hoursTogether}h watched</p>
                        </div>
                      </div>

                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-950/95 border border-slate-800 text-white rounded-xl p-2.5 shadow-xl w-36 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50 text-[10px]">
                        <div className="font-bold border-b border-slate-800 pb-1 mb-1 truncate text-white">{friend.displayName}</div>
                        <div className="flex items-center gap-1 mt-1 text-slate-400"><Clock size={10} /> {formatLastSeen(friend.lastSeen)}</div>
                        <div className="flex items-center gap-1 mt-0.5 text-sky-400 font-bold"><Sparkles size={10} /> {friend.hoursTogether}h watched</div>
                        <div className="text-[8px] text-slate-500 mt-1 italic leading-none">{bubble.label}</div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Friends;
