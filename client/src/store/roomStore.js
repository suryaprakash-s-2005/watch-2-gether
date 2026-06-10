import { create } from 'zustand';
import api from '../services/api';

const useRoomStore = create((set) => ({
  currentRoom: null,
  roomUsers: [],
  chatMessages: [],
  roomLoading: false,
  roomError: null,
  playbackCommand: null,

  createRoom: async () => {
    set({ roomLoading: true, roomError: null });
    try {
      const { data } = await api.post('/rooms/create');
      set({ currentRoom: data, roomLoading: false });
      return data.roomCode;
    } catch (err) {
      set({
        roomError: err.response?.data?.message || 'Failed to create room',
        roomLoading: false,
      });
      return null;
    }
  },

  joinRoom: async (roomCode) => {
    set({ roomLoading: true, roomError: null });
    try {
      const { data } = await api.post('/rooms/join', { roomCode });
      set({ roomLoading: false });
      return data.roomCode;
    } catch (err) {
      set({
        roomError: err.response?.data?.message || 'Failed to join room',
        roomLoading: false,
      });
      return null;
    }
  },

  getRoomDetails: async (roomCode) => {
    set({ roomLoading: true, roomError: null });
    try {
      const { data } = await api.get(`/rooms/${roomCode}`);
      set({
        currentRoom: data,
        roomUsers: data.users || [],
        roomLoading: false,
      });
      return data;
    } catch (err) {
      set({
        roomError: err.response?.data?.message || 'Failed to fetch room details',
        roomLoading: false,
      });
      return null;
    }
  },

  clearRoomState: () => {
    set({
      currentRoom: null,
      roomUsers: [],
      chatMessages: [],
      roomError: null,
      playbackCommand: null,
    });
  },

  setUsersList: (users) => {
    set({ roomUsers: users });
  },

  setQueueList: (queue) => {
    set((state) => {
      if (!state.currentRoom) return {};
      return {
        currentRoom: {
          ...state.currentRoom,
          queue
        }
      };
    });
  },

  setPlaybackCommand: (command) => {
    set({ playbackCommand: command });
  },

  addChatMessage: (message) => {
    set((state) => ({ chatMessages: [...state.chatMessages, message] }));
  },

  setChatHistory: (messages) => {
    set({ chatMessages: messages });
  },

  updateRoomPlayback: (playbackState) => {
    set((state) => {
      if (!state.currentRoom) return {};
      return {
        currentRoom: {
          ...state.currentRoom,
          ...playbackState,
        },
      };
    });
  },
}));

export default useRoomStore;
