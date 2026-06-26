import Message from '../models/Message.js';
import Room from '../models/Room.js';
import DirectMessage from '../models/DirectMessage.js';
import Friendship from '../models/Friendship.js';

/**
 * Get chat history for a specific room code from the last 24 hours.
 * @route GET /api/chat/:roomCode/history
 */
export const getChatHistory = async (req, res) => {
  try {
    const { roomCode } = req.params;
    if (!roomCode) {
      return res.status(400).json({ message: 'Room code is required' });
    }

    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Find messages from the last 24 hours, sorted oldest to newest (ascending)
    const messages = await Message.find({
      roomId: room._id,
      createdAt: { $gte: yesterday }
    }).sort({ createdAt: 1 });

    return res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch chat history', 
      error: error.message 
    });
  }
};

/**
 * Get direct chat history between current user and a friend.
 * @route GET /api/chat/direct/:friendId
 */
export const getDirectChatHistory = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user._id;

    if (!friendId) {
      return res.status(400).json({ message: 'Friend ID is required' });
    }

    // Verify friendship exists and is accepted
    const isFriend = await Friendship.findOne({
      status: 'accepted',
      $or: [
        { requesterId: userId, receiverId: friendId },
        { requesterId: friendId, receiverId: userId }
      ]
    });

    if (!isFriend) {
      return res.status(403).json({ message: 'You are not friends with this user' });
    }

    // Fetch messages sorting oldest to newest
    const messages = await DirectMessage.find({
      $or: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });

    return res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching direct chat history:', error);
    return res.status(500).json({
      message: 'Failed to fetch direct chat history',
      error: error.message
    });
  }
};

/**
 * Mark direct messages sent by a friend to current user as read.
 * @route POST /api/chat/direct/:friendId/read
 */
export const markDirectMessagesAsRead = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user._id;

    if (!friendId) {
      return res.status(400).json({ message: 'Friend ID is required' });
    }

    // Mark messages from friend to user as read
    await DirectMessage.updateMany(
      { senderId: friendId, receiverId: userId, read: false },
      { $set: { read: true } }
    );

    // Emit event to the sender so they can update ticks in real-time
    const io = req.app.get('socketio');
    if (io) {
      io.to(friendId.toString()).emit('direct-messages-read', {
        readerId: userId
      });
    }

    return res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return res.status(500).json({
      message: 'Failed to mark messages as read',
      error: error.message
    });
  }
};

