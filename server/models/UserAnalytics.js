import mongoose from 'mongoose';

const userAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  dailyWatchData: [
    {
      date: {
        type: String, 
        required: true
      },
      minutes: {
        type: Number,
        default: 0
      }
    }
  ],
  categoryWatchMinutes: {
    type: Map,
    of: Number,
    default: {}
  }
});

const UserAnalytics = mongoose.model('UserAnalytics', userAnalyticsSchema);
export default UserAnalytics;
