import express from 'express';
import { 
  getFriends, 
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  removeFriend, 
  getTopFriends, 
  getSuggestedFriends,
  searchUsers
} from '../controllers/friendController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getFriends);
router.get('/search-users', searchUsers);
router.post('/request', sendFriendRequest);
router.post('/accept', acceptFriendRequest);
router.post('/reject', rejectFriendRequest);
router.delete('/remove', removeFriend);
router.get('/top', getTopFriends);
router.get('/suggestions', getSuggestedFriends);

export default router;
