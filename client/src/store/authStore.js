import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  devLogin: async (username) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/dev-login', { username });
      localStorage.setItem('token', data.token);
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Login failed',
        isLoading: false,
      });
      return false;
    }
  },

  getMe: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    set({ isLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      set({
        user: data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const isUnauthorized = err.response?.status === 401;
      if (isUnauthorized) {
        localStorage.removeItem('token');
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Session expired',
        });
      } else {
        set({ isLoading: false, error: 'Failed to verify session' });
      }
    }
  },

  setToken: async (token) => {
    localStorage.setItem('token', token);
    set({ isLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      set({
        token,
        user: data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const isUnauthorized = err.response?.status === 401;
      if (isUnauthorized) {
        localStorage.removeItem('token');
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));

export default useAuthStore;
