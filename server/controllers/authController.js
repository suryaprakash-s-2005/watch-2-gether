import jwt from 'jsonwebtoken';
import User from '../models/User.js';


const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};




export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      
      if (!user.username) {
        await user.save();
      }
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const devLogin = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Not available in production' });
  }
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  try {
    
    const email = `${username.toLowerCase().replace(/\s+/g, '')}@watch2gether.local`;
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: username,
        email,
        avatar: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(username)}`,
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const googleCallbackSuccess = (req, res) => {
  const clientBaseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  if (!req.user) {
    return res.redirect(`${clientBaseUrl}/login?error=auth_failed`);
  }

  const token = generateToken(req.user._id);
  res.redirect(`${clientBaseUrl}/login?token=${token}`);
};




export const updateProfile = async (req, res) => {
  const { displayName, bio, avatar, username } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) {
      const cleanUsername = username.toLowerCase().trim();
      
      
      if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
        return res.status(400).json({ message: 'Usernames can only contain lowercase letters, numbers, and underscores' });
      }

      if (cleanUsername.length < 3) {
        return res.status(400).json({ message: 'Usernames must be at least 3 characters long' });
      }

      
      const existingUser = await User.findOne({ username: cleanUsername });
      if (existingUser && existingUser._id.toString() !== req.user.id.toString()) {
        return res.status(400).json({ message: 'Username is already taken' });
      }

      user.username = cleanUsername;
    }

    if (displayName) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (avatar) user.avatar = avatar;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
