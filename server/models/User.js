import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  avatar: {
    type: String
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String
  },
  bio: {
    type: String,
    default: ''
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  totalWatchMinutes: {
    type: Number,
    default: 0
  },
  totalHostedRooms: {
    type: Number,
    default: 0
  },
  totalJoinedRooms: {
    type: Number,
    default: 0
  },
  longestWatchSession: {
    type: Number, 
    default: 0
  },
  largestHostedRoom: {
    type: Number,
    default: 0
  },
  sharedWatchMinutes: {
    type: Number, 
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});


userSchema.pre('save', async function (next) {
  if (!this.username) {
    let baseUsername = (this.email ? this.email.split('@')[0] : this.name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    
    if (!baseUsername) baseUsername = 'user';

    let uniqueUsername = baseUsername;
    let count = 0;
    const UserModel = mongoose.model('User');
    while (await UserModel.findOne({ username: uniqueUsername })) {
      count++;
      uniqueUsername = `${baseUsername}${count}`;
    }
    this.username = uniqueUsername;
  }
  
  if (!this.displayName) {
    this.displayName = this.name || this.username;
  }
  next();
});

const User = mongoose.model('User', userSchema);
export default User;
