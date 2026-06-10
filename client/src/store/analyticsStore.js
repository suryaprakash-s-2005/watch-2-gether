import { create } from 'zustand';
import api from '../services/api';

const useAnalyticsStore = create((set) => ({
  stats: {
    daily: [],
    weekly: [],
    monthly: [],
    categories: []
  },
  summary: null,
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/analytics/watch-stats');
      set({ stats: data, isLoading: false });
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Failed to fetch watch stats charts data',
        isLoading: false
      });
    }
  },

  fetchSummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/analytics/summary');
      set({ summary: data, isLoading: false });
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Failed to fetch watch together analytics',
        isLoading: false
      });
    }
  }
}));

export default useAnalyticsStore;
