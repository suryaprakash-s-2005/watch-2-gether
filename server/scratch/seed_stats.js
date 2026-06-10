import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Friendship from '../models/Friendship.js';
import WatchSession from '../models/WatchSession.js';
import UserAnalytics from '../models/UserAnalytics.js';
import Room from '../models/Room.js';

dotenv.config();

const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/watch2gether';

const seed = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(dbUri);
    console.log('Connected to MongoDB.');

    // 1. Clean existing records for seed accounts
    const emails = [
      'alice@watch2gether.local',
      'bob@watch2gether.local',
      'charlie@watch2gether.local',
      'david@watch2gether.local'
    ];
    
    const users = await User.find({ email: { $in: emails } });
    const userIds = users.map(u => u._id);
    
    await Friendship.deleteMany({
      $or: [
        { requesterId: { $in: userIds } },
        { receiverId: { $in: userIds } }
      ]
    });
    
    await UserAnalytics.deleteMany({ userId: { $in: userIds } });
    await WatchSession.deleteMany({ participants: { $in: userIds } });
    await User.deleteMany({ email: { $in: emails } });
    
    console.log('Cleared existing test records.');

    // 2. Create users
    console.log('Creating user profiles...');
    const alice = await User.create({
      name: 'Alice Cooper',
      email: 'alice@watch2gether.local',
      avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Alice',
      username: 'alice',
      displayName: 'Alice Cooper',
      bio: '🍿 Movie buff, music lover, and casual gamer. Let\'s watch something cool together!',
      totalWatchMinutes: 450,
      totalHostedRooms: 8,
      totalJoinedRooms: 15,
      longestWatchSession: 120,
      largestHostedRoom: 6,
      sharedWatchMinutes: 180,
      lastSeen: new Date()
    });

    const bob = await User.create({
      name: 'Bob Builder',
      email: 'bob@watch2gether.local',
      avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Bob',
      username: 'bob',
      displayName: 'Bob Builder',
      bio: 'Can we watch it? Yes we can! Minecraft and coding tutorials are my favorite.',
      totalWatchMinutes: 320,
      totalHostedRooms: 3,
      totalJoinedRooms: 9,
      longestWatchSession: 75,
      largestHostedRoom: 4,
      sharedWatchMinutes: 150,
      lastSeen: new Date(Date.now() - 17 * 60000) // 17 minutes ago
    });

    const charlie = await User.create({
      name: 'Charlie Brown',
      email: 'charlie@watch2gether.local',
      avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Charlie',
      username: 'charlie',
      displayName: 'Charlie Brown',
      bio: 'Just looking for good tunes and funny clips. Good grief!',
      totalWatchMinutes: 180,
      totalHostedRooms: 1,
      totalJoinedRooms: 6,
      longestWatchSession: 45,
      largestHostedRoom: 2,
      sharedWatchMinutes: 90,
      lastSeen: new Date(Date.now() - 2 * 3600000) // 2 hours ago
    });

    const david = await User.create({
      name: 'David Beckham',
      email: 'david@watch2gether.local',
      avatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=David',
      username: 'david',
      displayName: 'David Beckham',
      bio: 'Sports, travel vlogs and documentaries.',
      totalWatchMinutes: 60,
      totalHostedRooms: 0,
      totalJoinedRooms: 2,
      longestWatchSession: 30,
      largestHostedRoom: 0,
      sharedWatchMinutes: 30,
      lastSeen: new Date(Date.now() - 5 * 86400000) // 5 days ago
    });

    console.log('Profiles created successfully.');

    // 3. Create friendships
    console.log('Establishing friend connections...');
    // Alice & Bob are friends
    await Friendship.create({
      requesterId: alice._id,
      receiverId: bob._id,
      status: 'accepted',
      sharedMinutes: 120,
      lastInteraction: new Date()
    });

    // Alice & Charlie are friends
    await Friendship.create({
      requesterId: alice._id,
      receiverId: charlie._id,
      status: 'accepted',
      sharedMinutes: 60,
      lastInteraction: new Date(Date.now() - 1 * 86400000)
    });

    // David sent request to Alice (pending)
    await Friendship.create({
      requesterId: david._id,
      receiverId: alice._id,
      status: 'pending',
      lastInteraction: new Date()
    });

    // Bob & Charlie are friends
    await Friendship.create({
      requesterId: bob._id,
      receiverId: charlie._id,
      status: 'accepted',
      sharedMinutes: 30,
      lastInteraction: new Date(Date.now() - 3 * 86400000)
    });

    console.log('Friendships populated.');

    // 4. Create UserAnalytics (15-day watch histories)
    console.log('Generating watch history logs (last 15 days)...');
    
    const generateAnalyticsForUser = async (user, categoryMinutes) => {
      const dailyWatchData = [];
      
      for (let i = 14; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Random watch minutes per day: between 10 and 45 mins
        const minutes = Math.floor(Math.random() * 35) + 10;
        dailyWatchData.push({ date: dateStr, minutes });
      }

      await UserAnalytics.create({
        userId: user._id,
        dailyWatchData,
        categoryWatchMinutes: categoryMinutes
      });
    };

    await generateAnalyticsForUser(alice, {
      'Music': 180,
      'Gaming': 120,
      'Education': 90,
      'Entertainment': 60
    });

    await generateAnalyticsForUser(bob, {
      'Gaming': 150,
      'Education': 100,
      'Comedy': 70
    });

    await generateAnalyticsForUser(charlie, {
      'Music': 100,
      'Entertainment': 50,
      'Comedy': 30
    });

    await generateAnalyticsForUser(david, {
      'People & Blogs': 40,
      'News & Politics': 20
    });

    console.log('User analytics histories populated.');

    // 5. Create Watch Sessions
    console.log('Seeding watch sessions...');
    const dummyRoom = await Room.findOne();
    const roomId = dummyRoom ? dummyRoom._id : new mongoose.Types.ObjectId();

    // Session 1: Alice & Bob
    await WatchSession.create({
      roomId,
      participants: [alice._id, bob._id],
      startTime: new Date(Date.now() - 4 * 3600000),
      endTime: new Date(Date.now() - 3 * 3600000),
      duration: 60 // 60 minutes
    });

    // Session 2: Alice & Charlie
    await WatchSession.create({
      roomId,
      participants: [alice._id, charlie._id],
      startTime: new Date(Date.now() - 24 * 3600000),
      endTime: new Date(Date.now() - 23.2 * 3600000),
      duration: 48 // 48 minutes
    });

    // Session 3: Alice, Bob & Charlie
    await WatchSession.create({
      roomId,
      participants: [alice._id, bob._id, charlie._id],
      startTime: new Date(Date.now() - 48 * 3600000),
      endTime: new Date(Date.now() - 46.8 * 3600000),
      duration: 72 // 72 minutes
    });

    console.log('Seeded watch sessions.');
    console.log('==============================================');
    console.log('SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Test accounts generated (bypass with Dev Login):');
    console.log('- alice (Host & Movie Buff, 450 watched mins)');
    console.log('- bob (Gamer/Coder, 320 watched mins)');
    console.log('- charlie (Music Fan, 180 watched mins)');
    console.log('- david (Sports Fan, 60 watched mins)');
    console.log('==============================================');

    mongoose.connection.close();
  } catch (err) {
    console.error('Seeding error:', err);
    mongoose.connection.close();
  }
};

seed();
