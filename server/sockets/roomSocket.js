import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import Friendship from '../models/Friendship.js';
import WatchSession from '../models/WatchSession.js';
import UserAnalytics from '../models/UserAnalytics.js';


const getVideoTitle = async (videoId) => {
  try {
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (response.ok) {
      const data = await response.json();
      return data.title || 'YouTube Video';
    }
  } catch (error) {
    console.error('Error fetching video title:', error.message);
  }
  return 'YouTube Video';
};


export const socketAuth = async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultjwtsecretkey');
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket Auth Error:', error.message);
    return next(new Error('Authentication error: Invalid token'));
  }
};

export const roomSocketHandler = (io) => {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.user?.name})`);
    
    
    socket.join(socket.user._id.toString());

    
    socket.on('join-room', async ({ roomCode }) => {
      try {
        const code = roomCode.toUpperCase();
        let room = await Room.findOne({ roomCode: code });
        if (!room) {
          socket.emit('error-msg', 'Room not found');
          return;
        }

        socket.join(code);
        socket.roomCode = code;
        socket.joinTime = Date.now();

        
        const userIndex = room.users.findIndex(u => u.userId.toString() === socket.user._id.toString());
        if (userIndex === -1) {
          room.users.push({
            userId: socket.user._id,
            username: socket.user.name,
            avatar: socket.user.avatar,
            socketId: socket.id
          });
          
          await User.findByIdAndUpdate(socket.user._id, { $inc: { totalJoinedRooms: 1 } });
        } else {
          
          room.users[userIndex].socketId = socket.id;
          room.users[userIndex].avatar = socket.user.avatar;
        }

        await room.save();

        
        io.to(code).emit('user-joined', {
          userId: socket.user._id,
          username: socket.user.name,
          users: room.users
        });

        let currentTime = room.currentTime;
        if (room.isPlaying && room.lastStateChange) {
          const elapsed = (Date.now() - new Date(room.lastStateChange).getTime()) / 1000;
          currentTime += elapsed;
        }

        // Sync state to current connector
        socket.emit('room-state', {
          currentVideo: room.currentVideo,
          currentTime: currentTime,
          isPlaying: room.isPlaying,
          hostId: room.hostId,
          guestControlEnabled: room.guestControlEnabled,
          users: room.users,
          syncVersion: room.syncVersion,
          queue: room.queue || []
        });

        // Load chat history
        const messages = await Message.find({ roomId: room._id })
          .sort({ timestamp: 1 })
          .limit(50);
        socket.emit('chat-history', messages);

      } catch (error) {
        console.error('Socket join-room error:', error);
        socket.emit('error-msg', 'Failed to join room');
      }
    });

    // Helper: Validates if sender is the host of the active room
    const validateHost = async (roomCode, userId) => {
      const room = await Room.findOne({ roomCode });
      return room && room.hostId.toString() === userId.toString();
    };

    // Helper: Checks if user can control playback (host OR guest control enabled)
    const canUserControl = async (roomCode, userId) => {
      const room = await Room.findOne({ roomCode });
      if (!room) return false;
      if (room.hostId.toString() === userId.toString()) return true;
      return room.guestControlEnabled === true;
    };

    // Video events
    socket.on('video-change', async ({ videoId }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const isHost = await validateHost(code, socket.user._id);
        if (!isHost) {
          socket.emit('error-msg', 'Access denied: Only the Host can change the video');
          return;
        }

        // Fetch title and print system chat message
        const title = await getVideoTitle(videoId);

        const room = await Room.findOneAndUpdate(
          { roomCode: code },
          { currentVideo: videoId, currentVideoTitle: title, currentTime: 0, isPlaying: false, lastStateChange: new Date() },
          { new: true }
        );

        io.to(code).emit('video-change', { videoId });

        const systemMsg = await Message.create({
          roomId: room._id,
          senderName: 'System',
          message: `🎵 Now playing: ${title}`,
          isSystem: true
        });

        io.to(code).emit('chat-message', systemMsg);
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('video-play', async ({ currentTime }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const hasControl = await canUserControl(code, socket.user._id);
        if (!hasControl) {
          socket.emit('error-msg', 'Access denied: You do not have control permissions');
          return;
        }

        const room = await Room.findOneAndUpdate(
          { roomCode: code },
          { $set: { isPlaying: true, currentTime, lastStateChange: new Date() }, $inc: { syncVersion: 1 } },
          { new: true }
        );

        // Use broadcast so the emitter doesn't receive their own event back (prevents play/pause loop)
        socket.broadcast.to(code).emit('video-play', { currentTime, syncVersion: room.syncVersion });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('video-pause', async ({ currentTime }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const hasControl = await canUserControl(code, socket.user._id);
        if (!hasControl) {
          socket.emit('error-msg', 'Access denied: You do not have control permissions');
          return;
        }

        const room = await Room.findOneAndUpdate(
          { roomCode: code },
          { $set: { isPlaying: false, currentTime, lastStateChange: new Date() }, $inc: { syncVersion: 1 } },
          { new: true }
        );

        
        socket.broadcast.to(code).emit('video-pause', { currentTime, syncVersion: room.syncVersion });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('video-seek', async ({ currentTime }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const hasControl = await canUserControl(code, socket.user._id);
        if (!hasControl) {
          socket.emit('error-msg', 'Access denied: You do not have control permissions');
          return;
        }

        const room = await Room.findOneAndUpdate(
          { roomCode: code },
          { $set: { currentTime, lastStateChange: new Date() }, $inc: { syncVersion: 1 } },
          { new: true }
        );

        
        socket.broadcast.to(code).emit('video-seek', { currentTime, syncVersion: room.syncVersion });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('video-sync', async ({ currentTime }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const isHost = await validateHost(code, socket.user._id);
        if (isHost) {
          const room = await Room.findOneAndUpdate(
            { roomCode: code },
            { $set: { currentTime, lastStateChange: new Date() } },
            { new: true }
          );
          
          socket.broadcast.to(code).emit('video-sync', {
            currentTime,
            syncVersion: room.syncVersion,
            isPlaying: true
          });
        }
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('add-to-queue', async ({ videoId }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const title = await getVideoTitle(videoId);
        const room = await Room.findOneAndUpdate(
          { roomCode: code },
          { $push: { queue: { videoId, title, requestedBy: socket.user.name } } },
          { new: true }
        );

        if (!room) return;

        io.to(code).emit('queue-updated', { queue: room.queue });

        const chatMsg = await Message.create({
          roomId: room._id,
          senderName: 'System',
          message: `➕ Added to queue: ${title} (requested by ${socket.user.name})`,
          isSystem: true
        });
        io.to(code).emit('chat-message', chatMsg);
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('approve-queue-item', async ({ itemId }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const isHost = await validateHost(code, socket.user._id);
        if (!isHost) {
          socket.emit('error-msg', 'Access denied: Only the Host can approve queue items');
          return;
        }

        const room = await Room.findOne({ roomCode: code });
        if (!room) return;

        const queueItem = room.queue.id(itemId);
        if (!queueItem) {
          socket.emit('error-msg', 'Queue item not found');
          return;
        }

        const videoId = queueItem.videoId;
        const title = queueItem.title;

        room.currentVideo = videoId;
        room.currentVideoTitle = title;
        room.currentTime = 0;
        room.isPlaying = true;
        room.lastStateChange = new Date();
        room.syncVersion += 1;
        room.queue.pull(itemId);

        await room.save();

        io.to(code).emit('video-change', { videoId });
        io.to(code).emit('video-play', { currentTime: 0, syncVersion: room.syncVersion });
        io.to(code).emit('queue-updated', { queue: room.queue });

        const sysMsgQueue = await Message.create({
          roomId: room._id,
          senderName: 'System',
          message: `🎵 Now playing: ${title} (approved by Host)`,
          isSystem: true
        });
        io.to(code).emit('chat-message', sysMsgQueue);
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('remove-from-queue', async ({ itemId }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const isHost = await validateHost(code, socket.user._id);
        if (!isHost) {
          socket.emit('error-msg', 'Access denied: Only the Host can remove queue items');
          return;
        }

        const room = await Room.findOne({ roomCode: code });
        if (!room) return;

        const queueItem = room.queue.id(itemId);
        if (!queueItem) return;

        const title = queueItem.title;
        room.queue.pull(itemId);
        await room.save();

        io.to(code).emit('queue-updated', { queue: room.queue });

        const chatMsg = await Message.create({
          roomId: room._id,
          senderName: 'System',
          message: `❌ Removed request: ${title} (rejected by Host)`,
          isSystem: true
        });
        io.to(code).emit('chat-message', chatMsg);
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('set-guest-control', async ({ enabled }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const isHost = await validateHost(code, socket.user._id);
        if (!isHost) {
          socket.emit('error-msg', 'Access denied: Only the Host can change room permissions');
          return;
        }

        const room = await Room.findOneAndUpdate(
          { roomCode: code },
          { guestControlEnabled: enabled },
          { new: true }
        );

        io.to(code).emit('guest-control-changed', { guestControlEnabled: room.guestControlEnabled });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('transfer-host', async ({ newHostId }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const isHost = await validateHost(code, socket.user._id);
        if (!isHost) {
          socket.emit('error-msg', 'Access denied: Only the Host can transfer leadership');
          return;
        }

        const room = await Room.findOne({ roomCode: code });
        if (!room) return;

        const targetUser = room.users.find(u => u.userId.toString() === newHostId.toString());
        if (!targetUser) {
          socket.emit('error-msg', 'User not found in this room');
          return;
        }

        room.hostId = targetUser.userId;
        await room.save();

        io.to(code).emit('host-change', {
          hostId: targetUser.userId,
          message: `Host transferred leadership to ${targetUser.username}! 👑`
        });
      } catch (err) {
        console.error(err);
        socket.emit('error-msg', 'Failed to transfer host role');
      }
    });

    
    socket.on('chat-message', async ({ message }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const room = await Room.findOne({ roomCode: code });
        if (!room) return;

        const chatMsg = await Message.create({
          roomId: room._id,
          senderId: socket.user._id,
          senderName: socket.user.name,
          message
        });

        io.to(code).emit('chat-message', chatMsg);
      } catch (err) {
        console.error('Error broadcasting chat message:', err);
      }
    });

    
    socket.on('disconnect', async () => {
      const code = socket.roomCode;
      if (!code) return;

      console.log(`Socket disconnected: ${socket.id} (User: ${socket.user?.name})`);
      try {
        let initialRoom = await Room.findOne({ roomCode: code });
        if (!initialRoom) return;

        // Log watch session duration once
        if (socket.joinTime) {
          const sessionDuration = (Date.now() - socket.joinTime) / 60000; // in minutes
          if (sessionDuration >= 1) {
            await WatchSession.create({
              roomId: initialRoom._id,
              participants: [socket.user._id],
              startTime: new Date(socket.joinTime),
              endTime: new Date(),
              duration: sessionDuration
            });

            // Update user's longest watch session record
            const user = await User.findById(socket.user._id);
            if (user && (!user.longestWatchSession || sessionDuration > user.longestWatchSession)) {
              await User.findByIdAndUpdate(socket.user._id, {
                $set: { longestWatchSession: Math.round(sessionDuration) }
              });
            }
          }
        }

        // Concurrency retry loop for modifying active members list and host reassignment
        let success = false;
        let retries = 5;
        while (!success && retries > 0) {
          try {
            let room = await Room.findOne({ roomCode: code });
            if (!room) return;

            // Evict from active members list
            room.users = room.users.filter(u => u.socketId !== socket.id);

            let hostPromoted = false;
            let newHostId = room.hostId;

            // Reassign host if previous host left and people remain
            if (room.hostId.toString() === socket.user._id.toString() && room.users.length > 0) {
              const nextHost = room.users[0]; // Oldest connected client is at index 0
              room.hostId = nextHost.userId;
              newHostId = nextHost.userId;
              hostPromoted = true;
              console.log(`Promoting ${nextHost.username} to host in Room: ${code}`);
            }

            await room.save();
            success = true; // Saved successfully without version conflict!

            io.to(code).emit('user-left', {
              userId: socket.user._id,
              username: socket.user.name,
              users: room.users
            });

            if (hostPromoted) {
              io.to(code).emit('host-change', {
                hostId: newHostId,
                message: `Host left. ${room.users[0].username} is the new host!`
              });
            }
          } catch (err) {
            if (err.name === 'VersionError') {
              retries--;
              console.warn(`[roomSocket] VersionError during disconnect cleanup for room ${code}. Retrying... (${retries} left)`);
              // Wait a brief randomized interval to let the concurrent transaction commit
              await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
            } else {
              throw err; // Re-throw other errors
            }
          }
        }
      } catch (err) {
        console.error('Error during socket cleanup:', err);
      }
    });
  });

  // Server-authoritative periodic drift-correction heartbeat.
  // Runs every 10s and sends the estimated playback position to GUESTS only.
  // The host is excluded — they are the source of truth and don't need to be corrected.
  setInterval(async () => {
    try {
      const activeRooms = await Room.find({ isPlaying: true });
      for (const room of activeRooms) {
        const roomSockets = io.sockets.adapter.rooms.get(room.roomCode);
        if (!roomSockets || roomSockets.size === 0) continue;

        const elapsed = (Date.now() - new Date(room.lastStateChange).getTime()) / 1000;
        const estimatedTime = room.currentTime + elapsed;

        
        const hostSocketId = [...roomSockets].find((sid) => {
          const s = io.sockets.sockets.get(sid);
          return s && s.user && s.user._id.toString() === room.hostId.toString();
        });

        
        for (const sid of roomSockets) {
          if (sid === hostSocketId) continue;
          const guestSocket = io.sockets.sockets.get(sid);
          if (guestSocket) {
            guestSocket.emit('video-sync', {
              currentTime: estimatedTime,
              syncVersion: room.syncVersion,
              isPlaying: true
            });
          }
        }
      }
    } catch (err) {
      console.error('Server heartbeat error:', err.message);
    }
  }, 10000);

  
  const classifyCategory = (title) => {
    if (!title) return 'Entertainment';
    const t = title.toLowerCase();
    if (t.includes('music') || t.includes('song') || t.includes('mv') || t.includes('official video') || t.includes('audio') || t.includes('remix') || t.includes('soundtrack')) {
      return 'Music';
    }
    if (t.includes('game') || t.includes('gameplay') || t.includes('playthrough') || t.includes('minecraft') || t.includes('fortnite') || t.includes('twitch') || t.includes('gaming')) {
      return 'Gaming';
    }
    if (t.includes('tutorial') || t.includes('course') || t.includes('learn') || t.includes('programming') || t.includes('how to') || t.includes('science') || t.includes('education') || t.includes('coding')) {
      return 'Education';
    }
    if (t.includes('trailer') || t.includes('movie') || t.includes('film') || t.includes('series') || t.includes('episode') || t.includes('anime') || t.includes('teaser')) {
      return 'Film & Animation';
    }
    if (t.includes('vlog') || t.includes('life') || t.includes('travel') || t.includes('daily') || t.includes('blog')) {
      return 'People & Blogs';
    }
    if (t.includes('funny') || t.includes('comedy') || t.includes('meme') || t.includes('prank') || t.includes('humor')) {
      return 'Comedy';
    }
    if (t.includes('news') || t.includes('politics') || t.includes('documentary') || t.includes('history')) {
      return 'News & Politics';
    }
    return 'Entertainment';
  };

  
  
  setInterval(async () => {
    try {
      const activeRooms = await Room.find({ isPlaying: true });
      if (activeRooms.length === 0) return;

      const todayStr = new Date().toISOString().split('T')[0];

      for (const room of activeRooms) {
        if (!room.users || room.users.length === 0) continue;

        const participantIds = room.users.map(u => u.userId);
        const hostId = room.hostId;
        const currentCount = room.users.length;

        
        const host = await User.findById(hostId);
        if (host && (!host.largestHostedRoom || currentCount > host.largestHostedRoom)) {
          await User.findByIdAndUpdate(hostId, { $set: { largestHostedRoom: currentCount } });
        }

        
        const activeFriendships = await Friendship.find({
          status: 'accepted',
          $or: [
            { requesterId: { $in: participantIds }, receiverId: { $in: participantIds } }
          ]
        });

        const friendMap = {};
        activeFriendships.forEach(f => {
          const reqStr = f.requesterId.toString();
          const recStr = f.receiverId.toString();
          if (!friendMap[reqStr]) friendMap[reqStr] = new Set();
          if (!friendMap[recStr]) friendMap[recStr] = new Set();
          friendMap[reqStr].add(recStr);
          friendMap[recStr].add(reqStr);

          
          f.sharedMinutes = (f.sharedMinutes || 0) + 1;
          f.lastInteraction = new Date();
          f.save();
        });

        
        const category = classifyCategory(room.currentVideoTitle);

        
        for (const u of room.users) {
          const userIdStr = u.userId.toString();
          const hasFriendPresent = room.users.some(otherU => {
            const otherIdStr = otherU.userId.toString();
            return otherIdStr !== userIdStr && friendMap[userIdStr]?.has(otherIdStr);
          });

          
          const updateObj = { 
            $inc: { totalWatchMinutes: 1 }, 
            $set: { lastSeen: new Date() } 
          };
          if (hasFriendPresent) {
            updateObj.$inc.sharedWatchMinutes = 1;
          }

          await User.findByIdAndUpdate(u.userId, updateObj);

          
          await UserAnalytics.findOneAndUpdate(
            { userId: u.userId, 'dailyWatchData.date': todayStr },
            { $inc: { 'dailyWatchData.$.minutes': 1 } },
            { new: true }
          ).then(async (doc) => {
            if (!doc) {
              const existing = await UserAnalytics.findOne({ userId: u.userId });
              if (existing) {
                existing.dailyWatchData.push({ date: todayStr, minutes: 1 });
                await existing.save();
              } else {
                await UserAnalytics.create({
                  userId: u.userId,
                  dailyWatchData: [{ date: todayStr, minutes: 1 }]
                });
              }
            }
          });

          
          let analyticsDoc = await UserAnalytics.findOne({ userId: u.userId });
          if (!analyticsDoc) {
            analyticsDoc = await UserAnalytics.create({ userId: u.userId, dailyWatchData: [] });
          }
          const currentCategoryMinutes = analyticsDoc.categoryWatchMinutes.get(category) || 0;
          analyticsDoc.categoryWatchMinutes.set(category, currentCategoryMinutes + 1);
          await analyticsDoc.save();
        }
      }
    } catch (err) {
      console.error('Error in watch time tracking heartbeat:', err);
    }
  }, 60000);
};
