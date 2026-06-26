import mongoose from 'mongoose';

const directMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for conversation query performance (bidirectional messaging history)
directMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });
directMessageSchema.index({ receiverId: 1, senderId: 1, createdAt: 1 });

const DirectMessage = mongoose.model('DirectMessage', directMessageSchema);
export default DirectMessage;
