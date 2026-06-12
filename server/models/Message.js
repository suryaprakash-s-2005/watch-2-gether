import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return !this.isSystem; }
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  isError: {
    type: Boolean,
    default: false
  },
  reactions: [
    {
      emoji: {
        type: String,
        required: true
      },
      users: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ]
    }
  ],
  replyTo: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    senderName: {
      type: String
    },
    preview: {
      type: String
    }
  },
  mentions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create indexes
// 1. For efficient fetching by room and timestamp (descending)
messageSchema.index({ roomId: 1, createdAt: -1 });

// 2. TTL index: Auto-delete messages after 24 hours (86400 seconds)
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
