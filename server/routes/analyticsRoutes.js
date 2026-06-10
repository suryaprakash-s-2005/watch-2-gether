import express from 'express';
import { getWatchStats, getWatchTogetherAnalytics } from '../controllers/analyticsController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/watch-stats', getWatchStats);
router.get('/summary', getWatchTogetherAnalytics);

export default router;
