import express from 'express';
import { getChatHistory } from '../controllers/chatController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// Apply authentication protection to all chat routes
router.use(protect);

// Get chat history for a room
router.get('/:roomCode/history', getChatHistory);

export default router;
