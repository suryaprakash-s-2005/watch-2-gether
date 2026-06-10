import express from 'express';
import { getProfile } from '../controllers/profileController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.get('/:username', protect, getProfile);

export default router;
