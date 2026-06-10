import User from '../models/User.js';
import Friendship from '../models/Friendship.js';


const getBadges = (user, friendsCount) => {
  const badges = [];
  
  if (user.totalWatchMinutes >= 300) {
    badges.push({ id: 'cinephile', name: 'Cinephile', desc: 'Watched over 5 hours of content', icon: 'Film', color: 'from-amber-500 to-red-500' });
  }
  if (user.totalHostedRooms >= 5) {
    badges.push({ id: 'room_master', name: 'Room Master', desc: 'Hosted 5 or more watch rooms', icon: 'Tv', color: 'from-purple-500 to-indigo-500' });
  }
  if (user.totalJoinedRooms >= 10) {
    badges.push({ id: 'party_animal', name: 'Party Animal', desc: 'Joined 10 or more rooms', icon: 'Sparkles', color: 'from-emerald-500 to-teal-500' });
  }
  if (friendsCount >= 3) {
    badges.push({ id: 'social_butterfly', name: 'Social Butterfly', desc: 'Connected with 3 or more friends', icon: 'Users', color: 'from-pink-500 to-rose-500' });
  }
  if (user.longestWatchSession >= 60) {
    badges.push({ id: 'night_owl', name: 'Night Owl', desc: 'Completed a session over 1 hour', icon: 'Moon', color: 'from-cyan-500 to-blue-500' });
  }
  if (user.largestHostedRoom >= 3) {
    badges.push({ id: 'crowd_pleaser', name: 'Crowd Pleaser', desc: 'Hosted 3+ users concurrently', icon: 'Award', color: 'from-yellow-400 to-orange-500' });
  }

  
  badges.push({ id: 'early_adopter', name: 'Early Adopter', desc: 'Joined Watch-2-Gether during early access', icon: 'Milestone', color: 'from-slate-500 to-slate-700' });

  return badges;
};




export const getProfile = async (req, res) => {
  const { username } = req.params;

  try {
    let user = await User.findOne({ username: username.toLowerCase() });
    
    
    if (!user) {
      const allUsers = await User.find({ username: { $exists: false } });
      for (const u of allUsers) {
        const baseUsername = (u.email ? u.email.split('@')[0] : u.name)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        if (baseUsername === username.toLowerCase()) {
          u.username = baseUsername;
          await u.save(); 
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    
    const friendsCount = await Friendship.countDocuments({
      status: 'accepted',
      $or: [{ requesterId: user._id }, { receiverId: user._id }]
    });

    
    let friendshipState = 'none'; 
    if (req.user && req.user._id.toString() !== user._id.toString()) {
      const friendship = await Friendship.findOne({
        $or: [
          { requesterId: req.user._id, receiverId: user._id },
          { requesterId: user._id, receiverId: req.user._id }
        ]
      });

      if (friendship) {
        if (friendship.status === 'accepted') {
          friendshipState = 'accepted';
        } else if (friendship.status === 'pending') {
          if (friendship.requesterId.toString() === req.user._id.toString()) {
            friendshipState = 'pending_sent';
          } else {
            friendshipState = 'pending_received';
          }
        }
      }
    } else if (req.user && req.user._id.toString() === user._id.toString()) {
      friendshipState = 'self';
    }

    const badges = getBadges(user, friendsCount);

    res.status(200).json({
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen,
      totalWatchMinutes: user.totalWatchMinutes,
      totalHostedRooms: user.totalHostedRooms,
      totalJoinedRooms: user.totalJoinedRooms,
      longestWatchSession: user.longestWatchSession,
      largestHostedRoom: user.largestHostedRoom,
      sharedWatchMinutes: user.sharedWatchMinutes,
      friendsCount,
      friendshipState,
      badges
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
