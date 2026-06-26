import express from 'express';
import { 
  getChatHistory, 
  getDirectChatHistory, 
  markDirectMessagesAsRead 
} from '../controllers/chatController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// Apply authentication protection to all chat routes
router.use(protect);

// Get chat history for a room
router.get('/:roomCode/history', getChatHistory);

// Direct message chat routes
router.get('/direct/:friendId', getDirectChatHistory);
router.post('/direct/:friendId/read', markDirectMessagesAsRead);

export default router;

