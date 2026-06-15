# Fix: Video restarts from beginning when mini player is expanded

## Root Cause

When a guest expands the mini player back to the room page, the `VideoPlayer` component remounts fresh (because `Room.jsx` unmounted when the user left). Its `hasSyncedInitial` ref resets to `false`, causing the effect to set `isSynced = false` even though the user was already watching in the mini player. This shows the "Join & Sync Stream" overlay. Clicking it uses `currentRoom.currentTime` which is NOT updated by periodic `video-sync` events (socketStore only sets a `playbackCommand` but never calls `updateRoomPlayback`), so it may be stale or 0.

For hosts: the `isHost` guard prevents the `isSynced` toggle, but redundant `initPlayer` calls can still cause unwanted re-renders.

---

## Changes

### 1. `client/src/store/playerStore.js`

**Add `hasSyncedInitial` flag** — persists across component mounts.

```js
// After line 15: isSynced: true,
hasSyncedInitial: false,
```

**Add setter action** after `setIsSynced` (line 27):
```js
setHasSyncedInitial: (value) => set({ hasSyncedInitial: value }),
```

**Add to `initPlayer`** (after `isSynced: true` on line 35):
```js
hasSyncedInitial: false,
```

**Add to `resetPlayer`** (after `isSynced: true` on line 48):
```js
hasSyncedInitial: false,
```

### 2. `client/src/hooks/useGlobalPlayer.js`

**Add to destructuring** (after `isSynced,` line 23 and `setIsSynced,` line 32):
```js
hasSyncedInitial,
setHasSyncedInitial,
```

**Add to return object** (after `isSynced,` line 78 and `setIsSynced,` line 87):
```js
hasSyncedInitial,
setHasSyncedInitial,
```

### 3. `client/src/components/VideoPlayer.jsx`

**Import change**: No longer need `useRef` for sync tracking (keep it for `containerRef`):
```js
import { useEffect } from 'react';
```

Wait — `containerRef` still uses `useRef`, so keep the import:
```js
import { useEffect, useRef } from 'react';
```

**Destructure** additional values from `useGlobalPlayer` (line 10):
```js
const { isSynced, setIsSynced, setIsPlaying, setSlotRect, currentTime, hasSyncedInitial, setHasSyncedInitial } = useGlobalPlayer();
```

**Remove** the local ref (line 13):
```js
// DELETE this line:
const hasSyncedInitial = useRef(false);
```

**Fix the sync effect** (lines 20-29) — use store's `hasSyncedInitial` instead of ref:
```js
useEffect(() => {
    if (currentRoom) {
      if (!currentRoom.isPlaying) {
        setIsSynced(true);
        setHasSyncedInitial(true);
      } else if (!isHost && !hasSyncedInitial) {
        setIsSynced(false);
      }
    }
}, [currentRoom, isHost, hasSyncedInitial, setIsSynced, setHasSyncedInitial]);
```

**Remove** the reset effect that clears the ref on video change (lines 31-34):
```js
// DELETE these lines:
// Reset sync check on video URL change
useEffect(() => {
    hasSyncedInitial.current = false;
}, [videoUrl]);
```

**Fix `handleSyncClick`** (lines 82-93) — use local `currentTime` instead of server `currentRoom.currentTime`:
```js
const handleSyncClick = () => {
    setIsSynced(true);
    setHasSyncedInitial(true);
    setIsPlaying(true);
    if (currentRoom) {
      const syncTime = currentTime > 0 ? currentTime : (currentRoom.currentTime || 0);
      setPlaybackCommand({
        type: 'sync',
        time: syncTime,
        isPlaying: true,
      });
    }
};
```

### 4. `client/src/pages/Room.jsx`

**Guard the `initPlayer` call** (lines 69-75) — skip if video hasn't changed:
```js
getRoomDetails(roomCode).then((room) => {
    if (!active) return;
    if (room && token) {
      connectSocket(token, roomCode.toUpperCase());
      const currentVideoId = usePlayerStore.getState().currentVideoId;
      if (room.currentVideo !== currentVideoId) {
        usePlayerStore.getState().initPlayer(roomCode.toUpperCase(), room.currentVideo);
      }
    }
});
```

---

## How This Fixes the Bug

| Scenario | Before | After |
|----------|--------|-------|
| Guest joins room first time | `hasSyncedInitial` = false → overlay shows → user clicks Join & Sync | Same (unchanged) |
| Guest leaves room, expands mini player | `hasSyncedInitial` ref resets → overlay shows → stale time from server | `hasSyncedInitial` = true (from store) → no overlay → video continues seamlessly |
| Guest clicks Join & Sync | Uses `currentRoom.currentTime \|\| 0` (may be stale) | Uses local `currentTime` from `onProgress` (accurate) |
| Host expands mini player | `initPlayer` re-runs (same values) | `initPlayer` skipped when video unchanged |
