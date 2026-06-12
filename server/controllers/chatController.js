import Message from '../models/Message.js';
import Room from '../models/Room.js';

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
