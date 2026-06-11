import { create } from 'zustand';
import { io } from 'socket.io-client';
import useRoomStore from './roomStore';

const useSocketStore = create((set, get) => ({
  socket: null,
  isConnecting: false,

  connectSocket: (token, roomCode) => {
    if (get().socket) return;

    set({ isConnecting: true });
    const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const defaultSocketUrl = isProduction 
      ? 'https://watch-2-gether-backend-service.onrender.com' 
      : 'http://localhost:5000';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || defaultSocketUrl;
    
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
    });

    socketInstance.on('connect', () => {
      set({ socket: socketInstance, isConnecting: false });
      
      
      socketInstance.emit('join-room', { roomCode });
    });

    
    socketInstance.on('room-state', (state) => {
      const roomStore = useRoomStore.getState();
      roomStore.updateRoomPlayback({
        currentVideo: state.currentVideo,
        currentTime: state.currentTime,
        isPlaying: state.isPlaying,
        hostId: state.hostId,
        guestControlEnabled: state.guestControlEnabled,
      });
      roomStore.setUsersList(state.users);
      roomStore.setQueueList(state.queue || []);
      
      if (state.currentVideo) {
        roomStore.setPlaybackCommand({ 
          type: 'sync', 
          time: state.currentTime, 
          isPlaying: state.isPlaying,
          syncVersion: state.syncVersion
        });
      }
    });

    
    socketInstance.on('user-joined', (data) => {
      const roomStore = useRoomStore.getState();
      roomStore.setUsersList(data.users);
      roomStore.addChatMessage({
        _id: `join-${Date.now()}`,
        senderName: 'System',
        message: `${data.username} joined the party! 🎉`,
        timestamp: new Date(),
        isSystem: true
      });
    });

    socketInstance.on('user-left', (data) => {
      const roomStore = useRoomStore.getState();
      roomStore.setUsersList(data.users);
      roomStore.addChatMessage({
        _id: `left-${Date.now()}`,
        senderName: 'System',
        message: `${data.username} left the room.`,
        timestamp: new Date(),
        isSystem: true
      });
    });

    
    socketInstance.on('host-change', (data) => {
      const roomStore = useRoomStore.getState();
      roomStore.updateRoomPlayback({ hostId: data.hostId });
      roomStore.addChatMessage({
        _id: `host-${Date.now()}`,
        senderName: 'System',
        message: data.message,
        timestamp: new Date(),
        isSystem: true
      });
    });

    
    socketInstance.on('guest-control-changed', (data) => {
      const roomStore = useRoomStore.getState();
      roomStore.updateRoomPlayback({ guestControlEnabled: data.guestControlEnabled });
      roomStore.addChatMessage({
        _id: `perm-${Date.now()}`,
        senderName: 'System',
        message: data.guestControlEnabled 
          ? 'Host enabled playback controls for all guests. 🔓' 
          : 'Host disabled playback controls for guests. 🔒',
        timestamp: new Date(),
        isSystem: true
      });
    });

    socketInstance.on('queue-updated', (data) => {
      const roomStore = useRoomStore.getState();
      roomStore.setQueueList(data.queue);
    });

    
    socketInstance.on('video-change', (data) => {
      const roomStore = useRoomStore.getState();
      roomStore.updateRoomPlayback({
        currentVideo: data.videoId,
        currentTime: 0,
        isPlaying: false
      });
      roomStore.setPlaybackCommand({ type: 'change', videoId: data.videoId });
    });

    socketInstance.on('video-play', (data) => {
      const roomStore = useRoomStore.getState();
      roomStore.updateRoomPlayback({ isPlaying: true });
      roomStore.setPlaybackCommand({ type: 'play', time: data.currentTime, syncVersion: data.syncVersion });
    });

    socketInstance.on('video-pause', (data) => {
      const roomStore = useRoomStore.getState();
      roomStore.updateRoomPlayback({ isPlaying: false });
      roomStore.setPlaybackCommand({ type: 'pause', time: data.currentTime, syncVersion: data.syncVersion });
    });

    socketInstance.on('video-seek', (data) => {
      const roomStore = useRoomStore.getState();
      roomStore.setPlaybackCommand({ type: 'seek', time: data.currentTime, syncVersion: data.syncVersion });
    });

    socketInstance.on('video-sync', (data) => {
      const roomStore = useRoomStore.getState();
      roomStore.setPlaybackCommand({ type: 'drift-sync', time: data.currentTime, syncVersion: data.syncVersion });
    });

    
    socketInstance.on('chat-message', (message) => {
      const roomStore = useRoomStore.getState();
      roomStore.addChatMessage(message);
    });

    socketInstance.on('chat-history', (messages) => {
      const roomStore = useRoomStore.getState();
      roomStore.setChatHistory(messages);
    });

    socketInstance.on('error-msg', (message) => {
      console.warn('Socket error returned:', message);
      
      const roomStore = useRoomStore.getState();
      roomStore.addChatMessage({
        _id: `err-${Date.now()}`,
        senderName: 'System Error',
        message: message,
        timestamp: new Date(),
        isSystem: true,
        isError: true
      });
    });

    socketInstance.on('disconnect', () => {
      set({ socket: null });
    });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  emitVideoChange: (videoId) => {
    const { socket } = get();
    if (socket) socket.emit('video-change', { videoId });
  },

  emitVideoPlay: (currentTime) => {
    const { socket } = get();
    if (socket) socket.emit('video-play', { currentTime });
  },

  emitVideoPause: (currentTime) => {
    const { socket } = get();
    if (socket) socket.emit('video-pause', { currentTime });
  },

  emitVideoSeek: (currentTime) => {
    const { socket } = get();
    if (socket) socket.emit('video-seek', { currentTime });
  },

  emitVideoSync: (currentTime) => {
    const { socket } = get();
    if (socket) socket.emit('video-sync', { currentTime });
  },

  emitChatMessage: (message) => {
    const { socket } = get();
    if (socket) socket.emit('chat-message', { message });
  },

  emitSetGuestControl: (enabled) => {
    const { socket } = get();
    if (socket) socket.emit('set-guest-control', { enabled });
  },

  emitAddToQueue: (videoId) => {
    const { socket } = get();
    if (socket) socket.emit('add-to-queue', { videoId });
  },

  emitApproveQueueItem: (itemId) => {
    const { socket } = get();
    if (socket) socket.emit('approve-queue-item', { itemId });
  },

  emitRemoveFromQueue: (itemId) => {
    const { socket } = get();
    if (socket) socket.emit('remove-from-queue', { itemId });
  },

  emitTransferHost: (newHostId) => {
    const { socket } = get();
    if (socket) socket.emit('transfer-host', { newHostId });
  }
}));

export default useSocketStore;
