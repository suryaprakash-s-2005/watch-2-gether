import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useFriendStore from '../store/friendStore';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { 
  Film, Tv, Sparkles, Users, Moon, Award, 
  Milestone, Edit3, Check, Plus, X, UserMinus, 
  Clock, Calendar, ShieldCheck, CornerDownLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap = {
  Film: Film,
  Tv: Tv,
  Sparkles: Sparkles,
  Users: Users,
  Moon: Moon,
  Award: Award,
  Milestone: Milestone
};

const badgeColors = {
  cinephile: 'from-amber-500 to-red-500',
  room_master: 'from-purple-500 to-indigo-500',
  party_animal: 'from-emerald-500 to-teal-500',
  social_butterfly: 'from-pink-500 to-rose-500',
  night_owl: 'from-cyan-500 to-blue-500',
  crowd_pleaser: 'from-yellow-400 to-orange-500',
  early_adopter: 'from-slate-500 to-slate-700'
};

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, getMe } = useAuthStore();
  const { sendRequest, acceptRequest, rejectRequest, removeFriend } = useFriendStore();

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const isOwnProfile = currentUser && profileUser && currentUser._id.toString() === profileUser._id.toString();

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/profile/${username}`);
      setProfileUser(data);
      setEditUsername(data.username || '');
      setEditDisplayName(data.displayName || data.username);
      setEditBio(data.bio || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username, currentUser]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const { data } = await api.put('/auth/profile', {
        username: editUsername,
        displayName: editDisplayName,
        bio: editBio
      });
      setProfileUser(prev => ({
        ...prev,
        username: data.username,
        displayName: data.displayName,
        bio: data.bio
      }));
      setIsEditing(false);
      
      getMe();
      
      
      if (data.username !== username) {
        navigate(`/profile/${data.username}`, { replace: true });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFriendAction = async (action) => {
    if (!profileUser) return;
    
    let success = false;
    if (action === 'request') {
      const res = await sendRequest(null, profileUser._id);
      success = res.success;
    } else if (action === 'accept') {
      success = await acceptRequest(profileUser._id);
    } else if (action === 'reject') {
      success = await rejectRequest(profileUser._id);
    } else if (action === 'remove') {
      if (confirm(`Are you sure you want to remove ${profileUser.displayName || profileUser.username} from your friends?`)) {
        success = await removeFriend(profileUser._id);
      } else {
        return;
      }
    } else if (action === 'cancel') {
      success = await removeFriend(profileUser._id); 
    }

    if (success) {
      
      fetchProfile();
    }
  };

  
  const formatMinutes = (minutes) => {
    if (!minutes) return '0h';
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours}h`;
  };

  const isOnline = (lastSeenDate) => {
    if (!lastSeenDate) return false;
    const diff = Date.now() - new Date(lastSeenDate).getTime();
    return diff < 5 * 60 * 1000; 
  };

  const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return 'Never';
    if (isOnline(lastSeenDate)) return 'Online now';
    
    const diff = Date.now() - new Date(lastSeenDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    return new Date(lastSeenDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-r-2 border-youtube-red"></div>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col animate-fadeIn">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="bg-youtube-red/10 border border-youtube-red/20 p-4 rounded-full text-youtube-red mb-6 animate-pulse">
            <X size={48} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Profile</h2>
          <p className="text-slate-400 mb-6 text-sm">{error || 'User not found'}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-xl border border-slate-700 flex items-center gap-2 transition-all duration-200"
          >
            <CornerDownLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Mesh gradients for premium design background */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-youtube-red/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 relative z-10">
        <div className="flex flex-col gap-6">
          {/* Header Card (Glassmorphism) */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 hover:border-slate-700/50 transition-all duration-300">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 w-full text-center md:text-left">
              {/* Profile Avatar with status indicator */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-tr from-youtube-red to-sky-500 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-slate-800 bg-slate-950 flex items-center justify-center">
                  {profileUser.avatar ? (
                    <img 
                      src={profileUser.avatar} 
                      alt={profileUser.displayName} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-4xl font-extrabold text-slate-600">
                      {profileUser.name?.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Status indicator */}
                <div className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-slate-900 shadow-md ${
                  isOnline(profileUser.lastSeen) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                }`} title={isOnline(profileUser.lastSeen) ? 'Online' : 'Offline'}></div>
              </div>

              {/* Name Details */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                  <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none">
                    {profileUser.displayName || profileUser.username}
                  </h1>
                  <span className="text-sm font-mono font-bold bg-slate-800/80 px-2.5 py-0.5 rounded-full text-slate-400 border border-slate-700/50">
                    @{profileUser.username}
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-2 flex items-center justify-center md:justify-start gap-1">
                  <Calendar size={13} className="text-slate-500" />
                  Joined {new Date(profileUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
                <p className="text-slate-400 text-xs mt-1 flex items-center justify-center md:justify-start gap-1">
                  <Clock size={13} className="text-slate-500" />
                  Last active: {formatLastSeen(profileUser.lastSeen)}
                </p>

                {/* Bio Display */}
                {!isEditing ? (
                  <p className="text-slate-300 text-sm mt-4 max-w-lg leading-relaxed italic bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800/30">
                    {profileUser.bio || "No bio written yet."}
                  </p>
                ) : (
                  <form onSubmit={handleSaveProfile} className="mt-4 space-y-3.5 w-full max-w-lg">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Username</label>
                      <input 
                        type="text" 
                        value={editUsername} 
                        onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="glass-input px-3.5 py-2 w-full text-sm rounded-xl focus:ring-2 focus:ring-youtube-red font-mono"
                        placeholder="username"
                        maxLength={20}
                        required
                      />
                      <span className="text-[9px] text-slate-500 mt-1 block">
                        Letters, numbers, and underscores only. Must be unique.
                      </span>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Display Name</label>
                      <input 
                        type="text" 
                        value={editDisplayName} 
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        className="glass-input px-3.5 py-2 w-full text-sm rounded-xl focus:ring-2 focus:ring-youtube-red"
                        maxLength={25}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bio</label>
                      <textarea 
                        value={editBio} 
                        onChange={(e) => setEditBio(e.target.value)}
                        className="glass-input px-3.5 py-2 w-full text-sm rounded-xl focus:ring-2 focus:ring-youtube-red h-20 resize-none"
                        placeholder="Write something about yourself..."
                        maxLength={160}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button 
                        type="button" 
                        onClick={() => setIsEditing(false)}
                        className="bg-slate-800 hover:bg-slate-700/80 text-white text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-700 transition"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={saveLoading}
                        className="bg-youtube-red hover:bg-youtube-hover text-white text-xs font-semibold py-1.5 px-4.5 rounded-lg transition disabled:opacity-50"
                      >
                        {saveLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Profile Action Buttons */}
            {!isEditing && (
              <div className="flex flex-col gap-2.5 w-full md:w-fit shrink-0">
                {isOwnProfile ? (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-slate-800 hover:bg-slate-750 text-white font-bold py-2.5 px-4 rounded-xl border border-slate-700/60 hover:border-slate-650 transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Edit3 size={16} />
                    Edit Profile
                  </button>
                ) : (
                  <>
                    {profileUser.friendshipState === 'none' && (
                      <button 
                        onClick={() => handleFriendAction('request')}
                        className="w-full bg-youtube-red hover:bg-youtube-hover text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-youtube-red/20 transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Plus size={16} />
                        Add Friend
                      </button>
                    )}
                    {profileUser.friendshipState === 'pending_sent' && (
                      <button 
                        onClick={() => handleFriendAction('cancel')}
                        className="w-full bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-300 font-bold py-2.5 px-4 rounded-xl border border-slate-750 hover:border-red-500/30 transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <X size={16} />
                        Cancel Request
                      </button>
                    )}
                    {profileUser.friendshipState === 'pending_received' && (
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handleFriendAction('accept')}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Check size={16} />
                          Accept Friend
                        </button>
                        <button 
                          onClick={() => handleFriendAction('reject')}
                          className="w-full bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2 px-4 rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <X size={16} />
                          Decline Request
                        </button>
                      </div>
                    )}
                    {profileUser.friendshipState === 'accepted' && (
                      <div className="flex flex-col gap-2">
                        <div className="w-full bg-slate-800/80 text-emerald-400 font-bold py-2.5 px-4 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-2">
                          <ShieldCheck size={16} />
                          Friends
                        </div>
                        <button 
                          onClick={() => handleFriendAction('remove')}
                          className="w-full bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 font-semibold py-2 px-4 rounded-xl border border-slate-700 hover:border-red-500/10 transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <UserMinus size={15} />
                          Remove Friend
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Stats Grid Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4 hover:border-slate-700/50 transition">
              <div className="bg-youtube-red/10 p-3.5 rounded-xl text-youtube-red">
                <Film size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Watch Time</p>
                <h3 className="text-xl font-extrabold text-white mt-0.5">{formatMinutes(profileUser.totalWatchMinutes)}</h3>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4 hover:border-slate-700/50 transition">
              <div className="bg-sky-500/10 p-3.5 rounded-xl text-sky-400">
                <Tv size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rooms Hosted</p>
                <h3 className="text-xl font-extrabold text-white mt-0.5">{profileUser.totalHostedRooms}</h3>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4 hover:border-slate-700/50 transition">
              <div className="bg-purple-500/10 p-3.5 rounded-xl text-purple-400">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rooms Joined</p>
                <h3 className="text-xl font-extrabold text-white mt-0.5">{profileUser.totalJoinedRooms}</h3>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4 hover:border-slate-700/50 transition">
              <div className="bg-amber-500/10 p-3.5 rounded-xl text-amber-400">
                <Moon size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Longest Session</p>
                <h3 className="text-xl font-extrabold text-white mt-0.5">{profileUser.longestWatchSession ? `${profileUser.longestWatchSession}m` : '0m'}</h3>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4 hover:border-slate-700/50 transition">
              <div className="bg-emerald-500/10 p-3.5 rounded-xl text-emerald-400">
                <Award size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Largest Room Hosted</p>
                <h3 className="text-xl font-extrabold text-white mt-0.5">{profileUser.largestHostedRoom || 0} user{profileUser.largestHostedRoom !== 1 ? 's' : ''}</h3>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4 hover:border-slate-700/50 transition">
              <div className="bg-pink-500/10 p-3.5 rounded-xl text-pink-400">
                <Users size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Friend Network</p>
                <h3 className="text-xl font-extrabold text-white mt-0.5">{profileUser.friendsCount || 0} friend{profileUser.friendsCount !== 1 ? 's' : ''}</h3>
              </div>
            </div>
          </div>

          {}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 hover:border-slate-700/50 transition-all duration-300">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Award className="text-youtube-red" />
              Achievement Badges
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {profileUser.badges && profileUser.badges.length > 0 ? (
                profileUser.badges.map((badge) => {
                  const BadgeIcon = iconMap[badge.icon] || Award;
                  const badgeColorClass = badgeColors[badge.id] || badge.color;
                  return (
                    <motion.div 
                      key={badge.id}
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 relative group overflow-hidden"
                    >
                      {}
                      <div className={`absolute inset-0 bg-gradient-to-tr ${badgeColorClass} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 pointer-events-none`}></div>
                      
                      <div className={`bg-gradient-to-tr ${badgeColorClass} p-3.5 rounded-xl text-white shadow-lg shrink-0 force-white-text`}>
                        <BadgeIcon size={20} />
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-bold text-white">{badge.name}</h4>
                        <p className="text-[11px] text-slate-400 leading-normal mt-0.5">{badge.desc}</p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full py-6 text-center text-slate-500 text-sm">
                  No achievement badges unlocked yet. Keep watching and hosting rooms to earn them!
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
