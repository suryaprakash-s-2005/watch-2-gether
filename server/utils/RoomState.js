class RoomStateManager {
  constructor() {
    this.rooms = new Map();
  }

  get(roomCode) {
    return this.rooms.get(roomCode) || null;
  }

  set(roomCode, data) {
    this.rooms.set(roomCode, {
      ...data,
      _updated: Date.now(),
    });
  }

  update(roomCode, updates) {
    const existing = this.rooms.get(roomCode) || {};
    this.rooms.set(roomCode, {
      ...existing,
      ...updates,
      _updated: Date.now(),
    });
  }

  delete(roomCode) {
    this.rooms.delete(roomCode);
  }

  getAllPlaying() {
    const result = [];
    for (const [code, state] of this.rooms) {
      if (state.isPlaying) {
        result.push({ roomCode: code, ...state });
      }
    }
    return result;
  }

  getAll() {
    return Array.from(this.rooms.entries()).map(([code, state]) => ({
      roomCode: code,
      ...state,
    }));
  }

  forEach(callback) {
    for (const [code, state] of this.rooms) {
      callback(code, state);
    }
  }

  estimateCurrentTime(roomCode) {
    const state = this.rooms.get(roomCode);
    if (!state) return 0;
    if (!state.isPlaying || !state.lastStateChange) return state.currentTime || 0;
    const elapsed = (Date.now() - state.lastStateChange.getTime()) / 1000;
    return (state.currentTime || 0) + elapsed * (state.playbackRate || 1);
  }
}

const roomState = new RoomStateManager();
export default roomState;
