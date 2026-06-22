import Room from '../models/Room.js';
import Friendship from '../models/Friendship.js';

const startCleanupJob = () => {
  setInterval(async () => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const deletedRooms = await Room.deleteMany({
        users: { $size: 0 },
        createdAt: { $lt: oneDayAgo }
      });
      if (deletedRooms.deletedCount > 0) {
        console.log(`[Cleanup] Deleted ${deletedRooms.deletedCount} empty room(s)`);
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const deletedRequests = await Friendship.deleteMany({
        status: 'rejected',
        createdAt: { $lt: sevenDaysAgo }
      });
      if (deletedRequests.deletedCount > 0) {
        console.log(`[Cleanup] Deleted ${deletedRequests.deletedCount} old rejected friend request(s)`);
      }
    } catch (err) {
      console.error('[Cleanup] Error:', err.message);
    }
  }, 60 * 60 * 1000);

  console.log('[Cleanup] Job started (runs every hour)');
};

export { startCleanupJob };
