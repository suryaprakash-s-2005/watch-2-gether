import { create } from 'zustand';

const useChatStore = create((set) => ({
  unreadCount: 0,
  mentionCount: 0,
  typingUsers: [], // Array of { userId, username }
  replyingTo: null, // Message object being replied to
  isChatActive: true, // Tracks whether the chat pane is currently open/focused

  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnreadCount: () => set((state) => ({ 
    unreadCount: state.unreadCount + 1 
  })),
  clearUnreadCount: () => set({ unreadCount: 0 }),

  setMentionCount: (count) => set({ mentionCount: count }),
  incrementMentionCount: () => set((state) => ({ 
    mentionCount: state.mentionCount + 1 
  })),
  clearMentionCount: () => set({ mentionCount: 0 }),

  setReplyingTo: (message) => set({ replyingTo: message }),
  clearReplyingTo: () => set({ replyingTo: null }),

  setChatActive: (isActive) => set((state) => ({
    isChatActive: isActive,
    unreadCount: isActive ? 0 : state.unreadCount,
    mentionCount: isActive ? 0 : state.mentionCount
  })),

  addTypingUser: (user) => set((state) => {
    // Prevent duplicates
    if (state.typingUsers.some((u) => String(u.userId) === String(user.userId))) return {};
    return { typingUsers: [...state.typingUsers, user] };
  }),

  removeTypingUser: (userId) => set((state) => ({
    typingUsers: state.typingUsers.filter((u) => String(u.userId) !== String(userId))
  })),

  clearTypingUsers: () => set({ typingUsers: [] })
}));

export default useChatStore;
