import Room from '../models/Room.js';
import User from '../models/User.js';
import generateRoomCode from '../utils/generateRoomCode.js';




export const createRoom = async (req, res) => {
  try {
    let roomCode = generateRoomCode();
    let codeExists = await Room.findOne({ roomCode });

    
    while (codeExists) {
      roomCode = generateRoomCode();
      codeExists = await Room.findOne({ roomCode });
    }

    const room = await Room.create({
      roomCode,
      hostId: req.user._id,
      users: [] 
    });

    
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalHostedRooms: 1 } });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const joinRoom = async (req, res) => {
  const { roomCode } = req.body;

  if (!roomCode) {
    return res.status(400).json({ message: 'Room code is required' });
  }

  try {
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });

    if (!room) {
      return res.status(404).json({ message: 'Room not found. Please check the code.' });
    }

    res.status(200).json({ message: 'Room is valid', roomCode: room.roomCode });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const getRoom = async (req, res) => {
  const { roomCode } = req.params;

  try {
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.status(200).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
