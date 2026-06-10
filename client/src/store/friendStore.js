import { create } from 'zustand';
import api from '../services/api';

const useFriendStore = create((set, get) => ({
  friends: [],
  pendingIncoming: [],
  pendingOutgoing: [],
  topFriends: [],
  suggestions: [],
  isLoading: false,
  error: null,

  fetchFriends: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/friends');
      set({
        friends: data.friends || [],
        pendingIncoming: data.pendingIncoming || [],
        pendingOutgoing: data.pendingOutgoing || [],
        isLoading: false
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Failed to fetch friends list',
        isLoading: false
      });
    }
  },

  sendRequest: async (username, receiverId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/friends/request', { username, receiverId });
      
      await get().fetchFriends();
      set({ isLoading: false });
      return { success: true, message: data.message, status: data.status };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send friend request';
      set({ error: errorMsg, isLoading: false });
      return { success: false, message: errorMsg };
    }
  },

  acceptRequest: async (requesterId) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/friends/accept', { requesterId });
      await get().fetchFriends();
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Failed to accept friend request',
        isLoading: false
      });
      return false;
    }
  },

  rejectRequest: async (requesterId) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/friends/reject', { requesterId });
      await get().fetchFriends();
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Failed to reject friend request',
        isLoading: false
      });
      return false;
    }
  },

  removeFriend: async (friendId) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete('/friends/remove', { data: { friendId } });
      await get().fetchFriends();
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Failed to remove friend',
        isLoading: false
      });
      return false;
    }
  },

  fetchTopFriends: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/friends/top');
      set({ topFriends: data || [], isLoading: false });
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Failed to fetch top friends',
        isLoading: false
      });
    }
  },

  fetchSuggestions: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/friends/suggestions');
      set({ suggestions: data || [], isLoading: false });
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Failed to fetch suggestions',
        isLoading: false
      });
    }
  }
}));

export default useFriendStore;
