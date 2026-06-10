import User from '../models/User.js';
import Friendship from '../models/Friendship.js';
import WatchSession from '../models/WatchSession.js';
import UserAnalytics from '../models/UserAnalytics.js';


const emitSocketNotification = (req, userId, event, data) => {
  const io = req.app.get('socketio');
  if (io) {
    io.to(userId.toString()).emit(event, data);
  }
};




export const sendFriendRequest = async (req, res) => {
  const { username, receiverId } = req.body;
  const requesterId = req.user._id;

  try {
    let receiver;
    if (username) {
      receiver = await User.findOne({ username: username.toLowerCase().trim() });
    } else if (receiverId) {
      receiver = await User.findById(receiverId);
    }

    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (receiver._id.toString() === requesterId.toString()) {
      return res.status(400).json({ message: 'You cannot add yourself as a friend' });
    }

    
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requesterId, receiverId: receiver._id },
        { requesterId: receiver._id, receiverId: requesterId }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends' });
      }
      if (existingFriendship.status === 'pending') {
        if (existingFriendship.requesterId.toString() === requesterId.toString()) {
          return res.status(400).json({ message: 'Friend request already sent' });
        } else {
          
          existingFriendship.status = 'accepted';
          existingFriendship.lastInteraction = new Date();
          await existingFriendship.save();

          emitSocketNotification(req, receiver._id, 'friend-request-accepted', {
            friend: {
              _id: req.user._id,
              username: req.user.username,
              displayName: req.user.displayName,
              avatar: req.user.avatar,
              lastSeen: req.user.lastSeen
            }
          });

          return res.status(200).json({
            message: 'Friend request accepted automatically (mutual match)',
            friendship: existingFriendship,
            status: 'accepted'
          });
        }
      }
      
      if (existingFriendship.status === 'rejected') {
        existingFriendship.requesterId = requesterId;
        existingFriendship.receiverId = receiver._id;
        existingFriendship.status = 'pending';
        existingFriendship.createdAt = new Date();
        await existingFriendship.save();
      }
    } else {
      
      await Friendship.create({
        requesterId,
        receiverId: receiver._id,
        status: 'pending'
      });
    }

    
    emitSocketNotification(req, receiver._id, 'friend-request-received', {
      requester: {
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatar: req.user.avatar
      }
    });

    res.status(201).json({ message: 'Friend request sent successfully', status: 'pending' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const acceptFriendRequest = async (req, res) => {
  const { requesterId } = req.body;
  const receiverId = req.user._id;

  try {
    const friendship = await Friendship.findOne({
      requesterId,
      receiverId,
      status: 'pending'
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    friendship.status = 'accepted';
    friendship.lastInteraction = new Date();
    await friendship.save();

    
    emitSocketNotification(req, requesterId, 'friend-request-accepted', {
      friend: {
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatar: req.user.avatar,
        lastSeen: req.user.lastSeen
      }
    });

    res.status(200).json({ message: 'Friend request accepted', friendship });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const rejectFriendRequest = async (req, res) => {
  const { requesterId } = req.body;
  const receiverId = req.user._id;

  try {
    const friendship = await Friendship.findOne({
      requesterId,
      receiverId,
      status: 'pending'
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    friendship.status = 'rejected';
    await friendship.save();

    
    emitSocketNotification(req, requesterId, 'friend-request-rejected', {
      receiverId
    });

    res.status(200).json({ message: 'Friend request rejected', friendship });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const removeFriend = async (req, res) => {
  const { friendId } = req.body;
  const userId = req.user._id;

  try {
    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { requesterId: userId, receiverId: friendId },
        { requesterId: friendId, receiverId: userId }
      ]
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Friend relationship not found' });
    }

    emitSocketNotification(req, friendId, 'friend-removed', {
      friendId: userId
    });

    res.status(200).json({ message: 'Friend removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const getFriends = async (req, res) => {
  const userId = req.user._id;

  try {
    
    const acceptedFriendships = await Friendship.find({
      status: 'accepted',
      $or: [{ requesterId: userId }, { receiverId: userId }]
    });

    
    const friendList = [];
    for (const f of acceptedFriendships) {
      const friendId = f.requesterId.toString() === userId.toString() ? f.receiverId : f.requesterId;
      const friendUser = await User.findById(friendId).select('name username displayName avatar bio lastSeen totalWatchMinutes');
      if (friendUser) {
        friendList.push({
          _id: friendUser._id,
          name: friendUser.name,
          username: friendUser.username,
          displayName: friendUser.displayName,
          avatar: friendUser.avatar,
          bio: friendUser.bio,
          lastSeen: friendUser.lastSeen,
          totalWatchMinutes: friendUser.totalWatchMinutes,
          hoursTogether: Math.round((f.sharedMinutes / 60) * 10) / 10,
          lastInteraction: f.lastInteraction
        });
      }
    }

    
    const pendingIncomingRaw = await Friendship.find({
      receiverId: userId,
      status: 'pending'
    }).populate('requesterId', 'name username displayName avatar');

    const pendingIncoming = pendingIncomingRaw
      .filter(p => p.requesterId)
      .map(p => ({
        friendshipId: p._id,
        user: p.requesterId,
        createdAt: p.createdAt
      }));

    
    const pendingOutgoingRaw = await Friendship.find({
      requesterId: userId,
      status: 'pending'
    }).populate('receiverId', 'name username displayName avatar');

    const pendingOutgoing = pendingOutgoingRaw
      .filter(p => p.receiverId)
      .map(p => ({
        friendshipId: p._id,
        user: p.receiverId,
        createdAt: p.createdAt
      }));

    res.status(200).json({
      friends: friendList,
      pendingIncoming,
      pendingOutgoing
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const getTopFriends = async (req, res) => {
  const userId = req.user._id;

  try {
    const friendships = await Friendship.find({
      status: 'accepted',
      $or: [{ requesterId: userId }, { receiverId: userId }]
    }).sort({ sharedMinutes: -1 });

    const topFriends = [];
    for (const f of friendships) {
      const friendId = f.requesterId.toString() === userId.toString() ? f.receiverId : f.requesterId;
      const friendUser = await User.findById(friendId).select('name username displayName avatar');
      if (friendUser) {
        topFriends.push({
          _id: friendUser._id,
          username: friendUser.username,
          displayName: friendUser.displayName,
          avatar: friendUser.avatar,
          hoursTogether: Math.round((f.sharedMinutes / 60) * 10) / 10,
          sharedMinutes: f.sharedMinutes
        });
      }
    }

    res.status(200).json(topFriends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const getSuggestedFriends = async (req, res) => {
  const userId = req.user._id;

  try {
    
    const activeFriendships = await Friendship.find({
      $or: [{ requesterId: userId }, { receiverId: userId }]
    });

    const excludedUserIds = new Set();
    excludedUserIds.add(userId.toString()); 

    activeFriendships.forEach(f => {
      excludedUserIds.add(f.requesterId.toString());
      excludedUserIds.add(f.receiverId.toString());
    });

    
    const myFriends = await Friendship.find({
      status: 'accepted',
      $or: [{ requesterId: userId }, { receiverId: userId }]
    });

    const myFriendIds = myFriends.map(f =>
      f.requesterId.toString() === userId.toString() ? f.receiverId.toString() : f.requesterId.toString()
    );

    
    const myAnalytics = await UserAnalytics.findOne({ userId });
    const myCategories = myAnalytics ? Array.from(myAnalytics.categoryWatchMinutes.keys()) : [];

    
    const mySessions = await WatchSession.find({ participants: userId });
    const mySessionRoomIds = mySessions.map(s => s.roomId.toString());

    
    
    const candidates = await User.find({
      _id: { $nin: Array.from(excludedUserIds) }
    }).limit(30);

    const recommendations = [];

    for (const cand of candidates) {
      let score = 0;
      let reasons = [];

      const candIdStr = cand._id.toString();

      
      const candFriends = await Friendship.find({
        status: 'accepted',
        $or: [{ requesterId: cand._id }, { receiverId: cand._id }]
      });

      const candFriendIds = candFriends.map(f =>
        f.requesterId.toString() === candIdStr ? f.receiverId.toString() : f.requesterId.toString()
      );

      const mutuals = myFriendIds.filter(fid => candFriendIds.includes(fid));
      if (mutuals.length > 0) {
        score += mutuals.length * 3;
        reasons.push(`${mutuals.length} mutual friend${mutuals.length > 1 ? 's' : ''}`);
      }

      
      const candSessions = await WatchSession.find({ participants: cand._id });
      const candSessionRoomIds = candSessions.map(s => s.roomId.toString());
      
      const sharedRooms = mySessionRoomIds.filter(rid => candSessionRoomIds.includes(rid));
      if (sharedRooms.length > 0) {
        score += sharedRooms.length * 2;
        reasons.push(`Watched in the same room ${sharedRooms.length} time${sharedRooms.length > 1 ? 's' : ''}`);
      }

      
      const candAnalytics = await UserAnalytics.findOne({ userId: cand._id });
      if (candAnalytics && myCategories.length > 0) {
        const candCategories = Array.from(candAnalytics.categoryWatchMinutes.keys());
        const overlappingCategories = myCategories.filter(cat => candCategories.includes(cat));

        if (overlappingCategories.length > 0) {
          score += overlappingCategories.length * 1.5;
          reasons.push(`Both watch ${overlappingCategories.slice(0, 2).join(', ')}`);
        }
      }

      
      if (score > 0 || recommendations.length < 5) {
        
        if (Date.now() - new Date(cand.lastSeen).getTime() < 30 * 60 * 1000) {
          score += 1; 
        }

        recommendations.push({
          user: {
            _id: cand._id,
            username: cand.username,
            displayName: cand.displayName,
            avatar: cand.avatar,
            lastSeen: cand.lastSeen
          },
          score,
          reasons: reasons.length > 0 ? reasons : ['Recommended for you']
        });
      }
    }

    
    recommendations.sort((a, b) => b.score - a.score);

    
    res.status(200).json(recommendations.slice(0, 6));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const searchUsers = async (req, res) => {
  const { query } = req.query;
  const userId = req.user._id;

  if (!query || query.trim().length < 1) {
    return res.status(200).json([]);
  }

  try {
    const searchRegex = new RegExp(query.trim(), 'i');
    
    
    const matchedUsers = await User.find({
      _id: { $ne: userId },
      $or: [
        { username: { $regex: searchRegex } },
        { displayName: { $regex: searchRegex } }
      ]
    }).select('name username displayName avatar').limit(8);

    const results = [];

    for (const matchedUser of matchedUsers) {
      const friendship = await Friendship.findOne({
        $or: [
          { requesterId: userId, receiverId: matchedUser._id },
          { requesterId: matchedUser._id, receiverId: userId }
        ]
      });

      let status = 'none'; 
      if (friendship) {
        if (friendship.status === 'accepted') {
          status = 'accepted';
        } else if (friendship.status === 'pending') {
          status = friendship.requesterId.toString() === userId.toString() ? 'pending_sent' : 'pending_received';
        }
      }

      results.push({
        _id: matchedUser._id,
        username: matchedUser.username,
        displayName: matchedUser.displayName,
        avatar: matchedUser.avatar,
        friendshipStatus: status
      });
    }

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
