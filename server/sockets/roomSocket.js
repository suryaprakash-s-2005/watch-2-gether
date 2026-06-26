import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import Friendship from '../models/Friendship.js';
import WatchSession from '../models/WatchSession.js';
import UserAnalytics from '../models/UserAnalytics.js';
import { registerChatHandlers } from './chatSocket.js';
import roomState from '../utils/RoomState.js';


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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'watch2gether-dev-jwt-secret');
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

  const handleLeaveRoom = async (socket) => {
    const code = socket.roomCode;
    if (!code) return;

    socket.roomCode = null;
    socket.leave(code);

    try {
      let initialRoom = await Room.findOne({ roomCode: code });
      if (!initialRoom) return;

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

          const user = await User.findById(socket.user._id);
          if (user && (!user.longestWatchSession || sessionDuration > user.longestWatchSession)) {
            await User.findByIdAndUpdate(socket.user._id, {
              $set: { longestWatchSession: Math.round(sessionDuration) }
            });
          }
        }
        socket.joinTime = null;
      }

      let success = false;
      let retries = 5;
      while (!success && retries > 0) {
        try {
          let room = await Room.findOne({ roomCode: code });
          if (!room) return;

          room.users = room.users.filter(u => u.socketId !== socket.id);

          let hostPromoted = false;
          let newHostId = room.hostId;

          if (room.hostId.toString() === socket.user._id.toString() && room.users.length > 0) {
            const nextHost = room.users[0]; // Oldest connected client is at index 0
            room.hostId = nextHost.userId;
            newHostId = nextHost.userId;
            hostPromoted = true;
            console.log(`Promoting ${nextHost.username} to host in Room: ${code}`);
          }

          await room.save();
          success = true;

          if (room.users.length === 0) {
            roomState.delete(code);
          } else if (hostPromoted) {
            roomState.update(code, { hostId: newHostId });
          }

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
            console.warn(`[roomSocket] VersionError during room cleanup for ${code}. Retrying... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      console.error('Error during room leave cleanup:', err);
    }
  };

  io.on('connection', (socket) => {
    // Register upgraded chat socket events
    registerChatHandlers(io, socket);
    
    socket.join(socket.user._id.toString());

    // Update lastSeen immediately when connecting
    User.findByIdAndUpdate(socket.user._id, { $set: { lastSeen: new Date() } }).catch(err => {
      console.error('Error updating user lastSeen on connection:', err.message);
    });

    socket.on('join-room', async ({ roomCode }) => {
      const code = roomCode.toUpperCase();

      // If already in a room, leave it first
      if (socket.roomCode && socket.roomCode !== code) {
        await handleLeaveRoom(socket);
      }

      let success = false;
      let retries = 3;
      while (!success && retries > 0) {
        try {
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
          success = true;

          let currentTime = room.currentTime;
          if (room.isPlaying && room.lastStateChange) {
            const elapsed = (Date.now() - new Date(room.lastStateChange).getTime()) / 1000;
            currentTime += elapsed * (room.playbackRate || 1);
          }

          roomState.set(code, {
            currentVideo: room.currentVideo,
            currentTime: currentTime,
            isPlaying: room.isPlaying,
            hostId: room.hostId,
            guestControlEnabled: room.guestControlEnabled,
            permissionMode: room.permissionMode || 'guest-control',
            coHosts: room.coHosts || [],
            syncVersion: room.syncVersion,
            playbackRate: room.playbackRate || 1,
            lastStateChange: room.lastStateChange,
            sourceType: room.sourceType || 'youtube',
            lastHostPing: Date.now(),
          });

          io.to(code).emit('user-joined', {
            userId: socket.user._id,
            username: socket.user.name,
            users: room.users
          });

          socket.emit('room-state', {
            currentVideo: room.currentVideo,
            currentTime: currentTime,
            isPlaying: room.isPlaying,
            hostId: room.hostId,
            guestControlEnabled: room.guestControlEnabled,
            permissionMode: room.permissionMode || 'guest-control',
            coHosts: room.coHosts || [],
            users: room.users,
            syncVersion: room.syncVersion,
            queue: room.queue || [],
            playbackRate: room.playbackRate || 1,
            sourceType: room.sourceType || 'youtube',
            lastStateChange: room.lastStateChange,
            serverTime: new Date().toISOString(),
          });

          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const messages = await Message.find({
            roomId: room._id,
            createdAt: { $gte: yesterday }
          }).sort({ createdAt: 1 });
          socket.emit('chat-history', messages);
        } catch (error) {
          if (error.name === 'VersionError' && retries > 0) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
          } else {
            console.error('Socket join-room error:', error);
            socket.emit('error-msg', 'Failed to join room');
            return;
          }
        }
      }
    });

    // Helper: Validates if sender is the host of the active room
    const validateHost = async (roomCode, userId) => {
      const room = await Room.findOne({ roomCode });
      return room && room.hostId.toString() === userId.toString();
    };

    // Helper: Checks if user can control playback based on permission mode
    const canUserControl = async (roomCode, userId) => {
      const room = await Room.findOne({ roomCode });
      if (!room) return false;
      const hostIdStr = room.hostId.toString();
      const userIdStr = userId.toString();
      if (hostIdStr === userIdStr) return true;
      if (room.coHosts?.some(c => c.toString() === userIdStr)) return true;

      const mode = room.permissionMode || 'guest-control';
      if (mode === 'host-only') return false;
      if (mode === 'guest-control') return room.guestControlEnabled === true;
      if (mode === 'democratic') return true;
      if (mode === 'anarchy') return true;
      return false;
    };

    // Helper: Checks if user is host or co-host
    const isHostOrCoHost = async (roomCode, userId) => {
      const room = await Room.findOne({ roomCode });
      if (!room) return false;
      const hostIdStr = room.hostId.toString();
      const userIdStr = userId.toString();
      if (hostIdStr === userIdStr) return true;
      if (room.coHosts?.some(c => c.toString() === userIdStr)) return true;
      return false;
    };

    // Video events
    socket.on('video-change', async ({ videoId, sourceType }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const isHost = await validateHost(code, socket.user._id);
        if (!isHost) {
          socket.emit('error-msg', 'Access denied: Only the Host can change the video');
          return;
        }

        const title = await getVideoTitle(videoId);

        const detectedSource = sourceType || (videoId && videoId.length === 11 ? 'youtube' : 'youtube');
        const updateFields = {
          currentVideo: videoId,
          currentVideoTitle: title,
          currentTime: 0,
          isPlaying: false,
          lastStateChange: new Date(),
          sourceType: detectedSource,
        };

        const room = await Room.findOneAndUpdate(
          { roomCode: code },
          { $set: updateFields, $inc: { syncVersion: 1 } },
          { new: true }
        );

        io.to(code).emit('video-change', { videoId, sourceType: detectedSource, syncVersion: room.syncVersion });

        roomState.update(code, {
          currentVideo: videoId,
          currentTime: 0,
          isPlaying: false,
          syncVersion: room.syncVersion,
          lastStateChange: new Date(),
          sourceType: detectedSource,
        });

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

        roomState.update(code, {
          isPlaying: true,
          currentTime,
          lastStateChange: new Date(),
          syncVersion: room.syncVersion,
        });
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

        roomState.update(code, {
          isPlaying: false,
          currentTime,
          lastStateChange: new Date(),
          syncVersion: room.syncVersion,
        });
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

        roomState.update(code, {
          currentTime,
          lastStateChange: new Date(),
          syncVersion: room.syncVersion,
        });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('video-playback-rate', async ({ playbackRate }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const authorized = await isHostOrCoHost(code, socket.user._id);
        if (!authorized) {
          socket.emit('error-msg', 'Access denied: Only the Host or Co-Host can change playback speed');
          return;
        }

        const room = await Room.findOneAndUpdate(
          { roomCode: code },
          { $set: { playbackRate, lastStateChange: new Date() }, $inc: { syncVersion: 1 } },
          { new: true }
        );

        socket.broadcast.to(code).emit('video-playback-rate', { playbackRate, syncVersion: room.syncVersion });

        roomState.update(code, {
          playbackRate,
          lastStateChange: new Date(),
          syncVersion: room.syncVersion,
        });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('video-ended', async () => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const isHost = await validateHost(code, socket.user._id);
        if (!isHost) {
          socket.emit('error-msg', 'Access denied: Only the Host can advance the video');
          return;
        }

        let success = false;
        let retries = 3;
        while (!success && retries > 0) {
          try {
            const room = await Room.findOne({ roomCode: code });
            if (!room) return;

            if (!room.queue || room.queue.length === 0) {
              room.isPlaying = false;
              room.currentTime = 0;
              room.lastStateChange = new Date();
              room.syncVersion += 1;
              await room.save();
              success = true;

              roomState.update(code, {
                isPlaying: false,
                currentTime: 0,
                lastStateChange: new Date(),
                syncVersion: room.syncVersion,
              });

              io.to(code).emit('video-pause', { currentTime: 0, syncVersion: room.syncVersion });
              return;
            }

            const nextItem = room.queue[0];
            const videoId = nextItem.videoId;
            const title = nextItem.title;

            room.currentVideo = videoId;
            room.currentVideoTitle = title;
            room.currentTime = 0;
            room.isPlaying = true;
            room.lastStateChange = new Date();
            room.syncVersion += 1;
            room.queue.shift();

            await room.save();
            success = true;

            roomState.update(code, {
              currentVideo: videoId,
              currentTime: 0,
              isPlaying: true,
              lastStateChange: new Date(),
              syncVersion: room.syncVersion,
            });

            io.to(code).emit('video-change', { videoId, syncVersion: room.syncVersion });
            io.to(code).emit('video-play', { currentTime: 0, syncVersion: room.syncVersion });
            io.to(code).emit('queue-updated', { queue: room.queue });

            const sysMsg = await Message.create({
              roomId: room._id,
              senderName: 'System',
              message: `🎵 Auto-advancing to next video: ${title}`,
              isSystem: true
            });
            io.to(code).emit('chat-message', sysMsg);
          } catch (err) {
            if (err.name === 'VersionError' && retries > 0) {
              retries--;
              await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
            } else {
              console.error(err);
              return;
            }
          }
        }
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
            isPlaying: true,
            playbackRate: room.playbackRate || 1
          });

          roomState.update(code, {
            currentTime,
            lastStateChange: new Date(),
          });
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Allow any user to request a fresh sync of the current room state
    socket.on('request-sync', async () => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const room = await Room.findOne({ roomCode: code });
        if (!room) return;

        let currentTime = room.currentTime;
        if (room.isPlaying && room.lastStateChange) {
          const elapsed = (Date.now() - new Date(room.lastStateChange).getTime()) / 1000;
          currentTime += elapsed * (room.playbackRate || 1);
        }

        socket.emit('room-state', {
          currentVideo: room.currentVideo,
          currentTime,
          isPlaying: room.isPlaying,
          hostId: room.hostId,
          guestControlEnabled: room.guestControlEnabled,
          permissionMode: room.permissionMode || 'guest-control',
          coHosts: room.coHosts || [],
          users: room.users,
          syncVersion: room.syncVersion,
          queue: room.queue || [],
          playbackRate: room.playbackRate || 1,
          sourceType: room.sourceType || 'youtube'
        });
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

      const isHost = await validateHost(code, socket.user._id);
      if (!isHost) {
        socket.emit('error-msg', 'Access denied: Only the Host can approve queue items');
        return;
      }

      let success = false;
      let retries = 3;
      while (!success && retries > 0) {
        try {
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
          success = true;

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
          if (err.name === 'VersionError' && retries > 0) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
          } else {
            console.error(err);
            return;
          }
        }
      }
    });

    socket.on('remove-from-queue', async ({ itemId }) => {
      const code = socket.roomCode;
      if (!code) return;

      const isHost = await validateHost(code, socket.user._id);
      if (!isHost) {
        socket.emit('error-msg', 'Access denied: Only the Host can remove queue items');
        return;
      }

      let success = false;
      let retries = 3;
      while (!success && retries > 0) {
        try {
          const room = await Room.findOne({ roomCode: code });
          if (!room) return;

          const queueItem = room.queue.id(itemId);
          if (!queueItem) return;

          const title = queueItem.title;
          room.queue.pull(itemId);
          await room.save();
          success = true;

          io.to(code).emit('queue-updated', { queue: room.queue });

          const chatMsg = await Message.create({
            roomId: room._id,
            senderName: 'System',
            message: `❌ Removed request: ${title} (rejected by Host)`,
            isSystem: true
          });
          io.to(code).emit('chat-message', chatMsg);
        } catch (err) {
          if (err.name === 'VersionError' && retries > 0) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
          } else {
            console.error(err);
            return;
          }
        }
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

    socket.on('set-permission-mode', async ({ mode }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const isHost = await validateHost(code, socket.user._id);
        if (!isHost) {
          socket.emit('error-msg', 'Access denied: Only the Host can change permission mode');
          return;
        }

        const validModes = ['host-only', 'guest-control', 'democratic', 'anarchy'];
        if (!validModes.includes(mode)) {
          socket.emit('error-msg', 'Invalid permission mode');
          return;
        }

        const room = await Room.findOneAndUpdate(
          { roomCode: code },
          { permissionMode: mode },
          { new: true }
        );

        io.to(code).emit('permission-mode-changed', { permissionMode: room.permissionMode });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('set-co-host', async ({ userId: targetUserId, isCoHost }) => {
      const code = socket.roomCode;
      if (!code) return;

      try {
        const isHost = await validateHost(code, socket.user._id);
        if (!isHost) {
          socket.emit('error-msg', 'Access denied: Only the Host can manage co-hosts');
          return;
        }

        const room = await Room.findOne({ roomCode: code });
        if (!room) return;

        if (isCoHost) {
          if (!room.coHosts.some(c => c.toString() === targetUserId)) {
            room.coHosts.push(targetUserId);
          }
        } else {
          room.coHosts = room.coHosts.filter(c => c.toString() !== targetUserId);
        }

        await room.save();
        io.to(code).emit('co-host-updated', { coHosts: room.coHosts });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('host-ping', async () => {
      const code = socket.roomCode;
      if (!code) return;
      const state = roomState.get(code);
      if (state) {
        roomState.update(code, { lastHostPing: Date.now() });
      }
    });

    socket.on('transfer-host', async ({ newHostId }) => {
      const code = socket.roomCode;
      if (!code) return;

      const isHost = await validateHost(code, socket.user._id);
      if (!isHost) {
        socket.emit('error-msg', 'Access denied: Only the Host can transfer leadership');
        return;
      }

      let success = false;
      let retries = 3;
      while (!success && retries > 0) {
        try {
          const room = await Room.findOne({ roomCode: code });
          if (!room) return;

          const targetUser = room.users.find(u => u.userId.toString() === newHostId.toString());
          if (!targetUser) {
            socket.emit('error-msg', 'User not found in this room');
            return;
          }

          room.hostId = targetUser.userId;
          await room.save();
          success = true;

          io.to(code).emit('host-change', {
            hostId: targetUser.userId,
            message: `Host transferred leadership to ${targetUser.username}! 👑`
          });
        } catch (err) {
          if (err.name === 'VersionError' && retries > 0) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
          } else {
            console.error(err);
            socket.emit('error-msg', 'Failed to transfer host role');
            return;
          }
        }
      }
    });

    
    // Note: Upgraded chat messaging is now handled in chatSocket.js
    
    
    socket.on('leave-room', async () => {
      await handleLeaveRoom(socket);
    });

    socket.on('disconnect', async () => {
      await handleLeaveRoom(socket);
    });
  });

  // Server-authoritative periodic drift-correction heartbeat.
  // Uses in-memory RoomState cache instead of querying MongoDB.
  // Runs every 3s and sends estimated playback position to GUESTS only.
  setInterval(() => {
    try {
      const activeRooms = roomState.getAllPlaying();
      for (const room of activeRooms) {
        const roomSockets = io.sockets.adapter.rooms.get(room.roomCode);
        if (!roomSockets || roomSockets.size === 0) continue;

        const estimatedTime = roomState.estimateCurrentTime(room.roomCode);

        const hostSocketId = [...roomSockets].find((sid) => {
          const s = io.sockets.sockets.get(sid);
          return s && s.user && s.user._id.toString() === String(room.hostId);
        });

        if (hostSocketId) {
          for (const sid of roomSockets) {
            if (sid === hostSocketId) continue;
            const guestSocket = io.sockets.sockets.get(sid);
            if (guestSocket) {
              guestSocket.emit('video-sync', {
                currentTime: estimatedTime,
                syncVersion: room.syncVersion,
                isPlaying: true,
                playbackRate: room.playbackRate || 1
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Server heartbeat error:', err.message);
    }
  }, 3000);

  // Send host-health-check ping to all room hosts every 5s
  setInterval(() => {
    roomState.forEach((code, state) => {
      if (!state.hostId) return;
      const roomSockets = io.sockets.adapter.rooms.get(code);
      if (!roomSockets || roomSockets.size === 0) return;
      for (const sid of roomSockets) {
        const s = io.sockets.sockets.get(sid);
        if (s && s.user && s.user._id.toString() === state.hostId.toString()) {
          s.emit('host-health-check');
          break;
        }
      }
    });
  }, 5000);

  // Host health check — monitors host ping/pong and auto-promotes if host is unresponsive
  setInterval(async () => {
    try {
      const hostsToPromote = [];
      roomState.forEach((code, state) => {
        if (!state.lastHostPing) return;
        const timeSinceLastPing = Date.now() - state.lastHostPing;
        if (timeSinceLastPing < 15000) return;
        hostsToPromote.push(code);
      });

      for (const code of hostsToPromote) {
        try {
          const state = roomState.get(code);
          if (!state) continue;

          const room = await Room.findOne({ roomCode: code });
          if (!room || room.users.length === 0) {
            roomState.delete(code);
            continue;
          }

          const currentHostId = state.hostId?.toString();
          const nextUser = room.users.find(u => u.userId.toString() !== currentHostId);
          if (!nextUser) continue;

          room.hostId = nextUser.userId;
          await room.save();

          roomState.update(code, { hostId: nextUser.userId, lastHostPing: Date.now() });

          io.to(code).emit('host-change', {
            hostId: nextUser.userId,
            message: `Host was unresponsive. ${nextUser.username} is the new host! 👑`
          });
        } catch (err) {
          console.error('Host auto-promotion error:', err.message);
        }
      }
    } catch (err) {
      console.error('Host health check error:', err.message);
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
        for (const f of activeFriendships) {
          const reqStr = f.requesterId.toString();
          const recStr = f.receiverId.toString();
          if (!friendMap[reqStr]) friendMap[reqStr] = new Set();
          if (!friendMap[recStr]) friendMap[recStr] = new Set();
          friendMap[reqStr].add(recStr);
          friendMap[recStr].add(reqStr);

          f.sharedMinutes = (f.sharedMinutes || 0) + 1;
          f.lastInteraction = new Date();
          await f.save();
        }

        
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

          
          const existingEntry = await UserAnalytics.findOneAndUpdate(
            { userId: u.userId, 'dailyWatchData.date': todayStr },
            { $inc: { 'dailyWatchData.$.minutes': 1, [`categoryWatchMinutes.${category}`]: 1 } },
            { new: true }
          );

          if (!existingEntry) {
            await UserAnalytics.findOneAndUpdate(
              { userId: u.userId },
              {
                $push: { dailyWatchData: { date: todayStr, minutes: 1 } },
                $inc: { [`categoryWatchMinutes.${category}`]: 1 },
              },
              { upsert: true }
            );
          }
        }
      }
    } catch (err) {
      console.error('Error in watch time tracking heartbeat:', err);
    }
  }, 60000);
};
