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
  sourceType: {
    type: String,
    default: 'youtube'
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
    default: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  permissionMode: {
    type: String,
    enum: ['host-only', 'guest-control', 'democratic', 'anarchy'],
    default: 'guest-control'
  },
  coHosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  syncVersion: {
    type: Number,
    default: 0
  },
  playbackRate: {
    type: Number,
    default: 1
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
