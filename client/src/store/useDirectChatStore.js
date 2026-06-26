import { create } from 'zustand';
import api from '../services/api';

const useDirectChatStore = create((set, get) => ({
  conversations: {}, // friendId -> [messages]
  activeChatFriendId: null,
  typingFriends: {}, // friendId -> boolean
  unreadDMs: {}, // friendId -> count
  isLoading: false,

  setActiveChatFriendId: (friendId) => {
    set({ activeChatFriendId: friendId });
    if (friendId) {
      // Clear unread count locally
      get().clearUnreads(friendId);
      // Mark as read in DB
      get().markAsRead(friendId);
    }
  },

  fetchDirectHistory: async (friendId) => {
    if (!friendId) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/chat/direct/${friendId}`);
      set((state) => ({
        conversations: {
          ...state.conversations,
          [friendId]: data
        },
        isLoading: false
      }));
    } catch (err) {
      console.error('Failed to fetch direct chat history:', err);
      set({ isLoading: false });
    }
  },

  addDirectMessage: (msg, currentUserId) => {
    const friendId = String(msg.senderId) === String(currentUserId) ? msg.receiverId : msg.senderId;

    set((state) => {
      const chatList = state.conversations[friendId] || [];
      // Prevent duplicate messages
      if (chatList.some(m => m._id === msg._id)) return {};

      const updatedConversations = {
        ...state.conversations,
        [friendId]: [...chatList, msg]
      };

      const updatedUnreadDMs = { ...state.unreadDMs };
      // Increment unreads if message is incoming and the chat isn't currently open
      if (String(msg.senderId) !== String(currentUserId) && String(state.activeChatFriendId) !== String(friendId)) {
        updatedUnreadDMs[friendId] = (updatedUnreadDMs[friendId] || 0) + 1;
      }

      return {
        conversations: updatedConversations,
        unreadDMs: updatedUnreadDMs
      };
    });

    // If message is incoming and we are actively chatting, mark it as read on the backend
    if (String(msg.senderId) !== String(currentUserId) && String(get().activeChatFriendId) === String(friendId)) {
      get().markAsRead(friendId);
    }
  },

  markAsRead: async (friendId) => {
    try {
      await api.post(`/chat/direct/${friendId}/read`);
    } catch (err) {
      console.error('Failed to mark DMs as read:', err);
    }
  },

  clearUnreads: (friendId) => {
    set((state) => ({
      unreadDMs: {
        ...state.unreadDMs,
        [friendId]: 0
      }
    }));
  },

  setInitialUnreads: (unreads) => {
    set((state) => ({
      unreadDMs: {
        ...state.unreadDMs,
        ...unreads
      }
    }));
  },

  setTypingFriend: (friendId, isTyping) => {
    set((state) => ({
      typingFriends: {
        ...state.typingFriends,
        [friendId]: isTyping
      }
    }));
  },

  markMessagesAsReadForFriend: (friendId) => {
    set((state) => {
      const chatList = state.conversations[friendId] || [];
      const updatedChatList = chatList.map((msg) => ({
        ...msg,
        read: true
      }));
      return {
        conversations: {
          ...state.conversations,
          [friendId]: updatedChatList
        }
      };
    });
  }
}));

export default useDirectChatStore;
