import { useEffect } from 'react';
import useRoomStore from '../../store/roomStore';
import usePlayerStore from '../../store/playerStore';

const PlayerProvider = ({ children }) => {
  const currentRoom = useRoomStore((state) => state.currentRoom);
  const initPlayer = usePlayerStore((state) => state.initPlayer);
  const setCurrentVideoId = usePlayerStore((state) => state.setCurrentVideoId);
  const currentVideoId = usePlayerStore((state) => state.currentVideoId);
  const roomId = usePlayerStore((state) => state.roomId);

  useEffect(() => {
    if (currentRoom) {
      const roomCode = currentRoom.roomCode;
      const roomVideo = currentRoom.currentVideo;
      
      if (roomCode) {
        if (roomId !== roomCode) {
          initPlayer(roomCode, roomVideo);
        } else if (currentVideoId !== roomVideo) {
          setCurrentVideoId(roomVideo);
        }
      }
    }
  }, [currentRoom, roomId, currentVideoId, initPlayer, setCurrentVideoId]);

  return children;
};

export default PlayerProvider;
