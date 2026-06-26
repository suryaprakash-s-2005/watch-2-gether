import Message from '../models/Message.js';
import Room from '../models/Room.js';
import DirectMessage from '../models/DirectMessage.js';
import Friendship from '../models/Friendship.js';

/**
 * Register upgraded real-time chat socket handlers.
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Individual client socket connection
 */
export const registerChatHandlers = (io, socket) => {
  
  // 1. Typing status: Started typing
  socket.on('typing-start', ({ roomCode }) => {
    if (!roomCode) return;
    const code = roomCode.toUpperCase();
    
    // Broadcast typing event to everyone else in the room
    socket.to(code).emit('typing-start', {
      userId: socket.user._id,
      username: socket.user.name
    });
  });

  // 2. Typing status: Stopped typing
  socket.on('typing-stop', ({ roomCode }) => {
    if (!roomCode) return;
    const code = roomCode.toUpperCase();
    
    // Broadcast typing-stop to everyone else in the room
    socket.to(code).emit('typing-stop', {
      userId: socket.user._id,
      username: socket.user.name
    });
  });

  // 3. Message Reactions: Toggle reaction
  socket.on('message-reaction', async ({ messageId, emoji }) => {
    const code = socket.roomCode;
    if (!code || !messageId || !emoji) return;

    try {
      const userId = socket.user._id;
      const message = await Message.findById(messageId);
      if (!message) return;

      const existingReactionIdx = message.reactions.findIndex(r => r.emoji === emoji);
      let wasAdded = false;

      if (existingReactionIdx !== -1) {
        const reactionObj = message.reactions[existingReactionIdx];
        const userIdx = reactionObj.users.findIndex(id => id.toString() === userId.toString());

        if (userIdx !== -1) {
          // User already reacted with this emoji -> remove it
          reactionObj.users.splice(userIdx, 1);
          
          // Remove emoji block completely if no users remain
          if (reactionObj.users.length === 0) {
            message.reactions.splice(existingReactionIdx, 1);
          }
          wasAdded = false;
        } else {
          // User hasn't reacted with this emoji -> add it
          reactionObj.users.push(userId);
          wasAdded = true;
        }
      } else {
        // Emoji reaction doesn't exist -> create it
        message.reactions.push({
          emoji,
          users: [userId]
        });
        wasAdded = true;
      }

      await message.save();

      // Emit updated reactions array to the room
      if (wasAdded) {
        io.to(code).emit('reaction-added', {
          messageId,
          emoji,
          userId,
          reactions: message.reactions
        });
      } else {
        io.to(code).emit('reaction-removed', {
          messageId,
          emoji,
          userId,
          reactions: message.reactions
        });
      }
    } catch (err) {
      console.error('Error handling message reaction:', err);
    }
  });

  // 4. Send Message: Upgraded logic supporting replies and mentions
  socket.on('chat-message', async ({ message, replyTo, mentions }) => {
    const code = socket.roomCode;
    if (!code) return;

    try {
      const room = await Room.findOne({ roomCode: code });
      if (!room) return;

      const chatMsg = await Message.create({
        roomId: room._id,
        senderId: socket.user._id,
        senderName: socket.user.name,
        message,
        replyTo: replyTo || undefined,
        mentions: mentions || [],
        createdAt: new Date(),
        timestamp: new Date()
      });

      // Broadcast the new message to everyone in the room
      io.to(code).emit('chat-message', chatMsg);

      // Handle notifications if users are mentioned
      if (mentions && mentions.length > 0) {
        // Emit room-wide notification event
        io.to(code).emit('user-mentioned', {
          messageId: chatMsg._id,
          mentions
        });

        // Emit private notification messages to all mentioned users
        mentions.forEach(mentionedUserId => {
          // Skip notifying oneself
          if (mentionedUserId.toString() === socket.user._id.toString()) return;

          io.to(mentionedUserId.toString()).emit('mention-notification', {
            messageId: chatMsg._id,
            senderName: socket.user.name,
            roomId: room._id,
            roomCode: code,
            preview: message.substring(0, 60)
          });
        });
      }
    } catch (err) {
      console.error('Error saving/broadcasting chat message:', err);
    }
  });

  // 4a. Direct Messages: Send private message
  socket.on('direct-message', async ({ receiverId, message }) => {
    if (!receiverId || !message || !message.trim()) return;

    try {
      const senderId = socket.user._id;

      // Verify friendship exists and is accepted
      const friendship = await Friendship.findOne({
        status: 'accepted',
        $or: [
          { requesterId: senderId, receiverId: receiverId },
          { requesterId: receiverId, receiverId: senderId }
        ]
      });

      if (!friendship) {
        socket.emit('error-msg', 'You can only message accepted friends.');
        return;
      }

      // Save direct message
      const dm = await DirectMessage.create({
        senderId,
        receiverId,
        message: message.trim(),
        createdAt: new Date()
      });

      // Emit to both sender and receiver's private channels
      io.to(senderId.toString()).emit('direct-message', dm);
      io.to(receiverId.toString()).emit('direct-message', dm);

      // Update friendship last interaction
      friendship.lastInteraction = new Date();
      await friendship.save();
    } catch (err) {
      console.error('Error handling direct-message event:', err);
    }
  });

  // 4b. Direct Messages: Direct Typing start
  socket.on('direct-typing-start', ({ receiverId }) => {
    if (!receiverId) return;
    io.to(receiverId.toString()).emit('direct-typing-start', {
      userId: socket.user._id,
      username: socket.user.username
    });
  });

  // 4c. Direct Messages: Direct Typing stop
  socket.on('direct-typing-stop', ({ receiverId }) => {
    if (!receiverId) return;
    io.to(receiverId.toString()).emit('direct-typing-stop', {
      userId: socket.user._id,
      username: socket.user.username
    });
  });

  // 5. Cleanup on disconnect: Ensure typing indicators are cleared
  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code) return;

    socket.to(code).emit('typing-stop', {
      userId: socket.user._id,
      username: socket.user.name
    });
  });
};
