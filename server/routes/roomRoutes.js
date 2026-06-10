import express from 'express';
import { createRoom, joinRoom, getRoom } from '../controllers/roomController.js';
import protect from '../middleware/auth.js';

const router = express.Router();


router.use(protect);

router.post('/create', createRoom);
router.post('/join', joinRoom);
router.get('/:roomCode', getRoom);

export default router;
