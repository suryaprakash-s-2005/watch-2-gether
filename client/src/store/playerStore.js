import { create } from 'zustand';

const usePlayerStore = create((set) => ({
  currentVideoId: null,
  roomId: null,
  currentTime: 0,
  isPlaying: false,
  volume: 0.8,
  isMuted: false,
  playbackRate: 1,
  isMiniPlayer: false,
  isClosed: true,
  slotRect: null,
  isSynced: true,
  hasSyncedInitial: false,
  syncStatus: 'synced',
  sourceType: 'youtube',
  captionsEnabled: false,

  setRoomId: (roomId) => set({ roomId }),
  setCurrentVideoId: (currentVideoId) => set({ currentVideoId, isClosed: !currentVideoId }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setVolume: (volume) => set({ volume }),
  setIsMuted: (isMuted) => set({ isMuted }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setIsMiniPlayer: (isMiniPlayer) => set({ isMiniPlayer }),
  setIsClosed: (isClosed) => set({ isClosed }),
  setSlotRect: (slotRect) => set({ slotRect }),
  setIsSynced: (isSynced) => set({ isSynced }),
  setHasSyncedInitial: (value) => set({ hasSyncedInitial: value }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setSourceType: (sourceType) => set({ sourceType }),
  setCaptionsEnabled: (captionsEnabled) => set({ captionsEnabled }),

  initPlayer: (roomId, videoId, sourceType) => {
    set({
      roomId,
      currentVideoId: videoId,
      isClosed: !videoId,
      isMiniPlayer: false,
      hasSyncedInitial: false,
      sourceType: sourceType || 'youtube',
    });
  },

  resetPlayer: () => {
    set({
      currentVideoId: null,
      roomId: null,
      currentTime: 0,
      isPlaying: false,
      isMiniPlayer: false,
      isClosed: true,
      slotRect: null,
      isSynced: true,
      hasSyncedInitial: false,
      sourceType: 'youtube',
    });
  },
}));

export default usePlayerStore;
