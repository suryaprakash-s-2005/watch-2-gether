import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentVideo: {
    type: String,
    default: null
  },
  currentVideoTitle: {
    type: String,
    default: ''
  },
  currentTime: {
    type: Number,
    default: 0
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  users: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      username: {
        type: String
      },
      avatar: {
        type: String
      },
      socketId: {
        type: String
      }
    }
  ],
  queue: [
    {
      videoId: {
        type: String,
        required: true
      },
      title: {
        type: String,
        default: 'YouTube Video'
      },
      requestedBy: {
        type: String,
        required: true
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  guestControlEnabled: {
    type: Boolean,
    default: false
  },
  syncVersion: {
    type: Number,
    default: 0
  },
  lastStateChange: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Room = mongoose.model('Room', roomSchema);
export default Room;
