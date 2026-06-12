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
  mediaType: 'youtube',
  slotRect: null,
  isSynced: true,

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

  initPlayer: (roomId, videoId) => {
    set({
      roomId,
      currentVideoId: videoId,
      isClosed: !videoId,
      isMiniPlayer: false,
      isSynced: true, // Default to synced, will be adjusted by visibility / room checks
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
    });
  },
}));

export default usePlayerStore;
