import { useEffect, useRef, useState, Suspense } from 'react';
import ReactPlayer from 'react-player';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import { Tv } from 'lucide-react';




const MATCH_URL_YOUTUBE = /(?:youtu\.be\/|youtube(?:-nocookie|education)?\.com\/(?:embed\/|v\/|watch\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))((\w|-){11})|youtube\.com\/playlist\?list=|youtube\.com\/user\//;

const isYoutubeUrl = (url) => {
  return url ? MATCH_URL_YOUTUBE.test(url) : false;
};



const PLAYER_CONFIG = {
  youtube: {
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      cc_load_policy: 1,
      enablejsapi: 1,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    },
  },
};

const VideoPlayer = () => {
  const { currentRoom, playbackCommand, setPlaybackCommand, updateRoomPlayback } = useRoomStore();
  const { user } = useAuthStore();
  const { emitVideoPlay, emitVideoPause, emitVideoSeek } = useSocketStore();

  const playerRef = useRef(null);
  const localVersionRef = useRef(0);
  
  
  
  
  
  const hasSyncedInitial = useRef(false);

  
  
  const suppressUntil = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  const isHost = currentRoom?.hostId && user?._id && String(currentRoom.hostId) === String(user._id);
  const hasControl = isHost || currentRoom?.guestControlEnabled;
  const videoUrl = currentRoom?.currentVideo
    ? `https://www.youtube.com/watch?v=${currentRoom.currentVideo}`
    : null;

  const isValidYoutube = videoUrl && isYoutubeUrl(videoUrl);

  const getCurrentTime = () => {
    if (!playerRef.current) return 0;
    if (typeof playerRef.current.getCurrentTime === 'function') {
      return playerRef.current.getCurrentTime();
    }
    return playerRef.current.currentTime || 0;
  };

  const suppress = (ms = 1200) => {
    suppressUntil.current = Date.now() + ms;
  };

  const isSuppressed = () => Date.now() < suppressUntil.current;

  const seekTo = (time) => {
    if (!playerRef.current) return;
    if (typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(time, 'seconds');
    } else {
      playerRef.current.currentTime = time;
    }
  };

  const onPlayerReady = () => {
    setReady(true);
    if (hasSyncedInitial.current) {
      return; 
    }
    if (currentRoom?.currentVideo) {
      hasSyncedInitial.current = true;
      suppress(2000); 
      setIsPlaying(currentRoom.isPlaying);
      seekTo(currentRoom.currentTime);
    }
  };

  
  useEffect(() => {
    if (!isValidYoutube || !playbackCommand || !ready) return;

    const { type, time, isPlaying: shouldPlay, syncVersion } = playbackCommand;

    
    if (syncVersion !== undefined && syncVersion < localVersionRef.current) {
      setPlaybackCommand(null);
      return;
    }
    if (syncVersion !== undefined) {
      localVersionRef.current = syncVersion;
    }

    if (type === 'play') {
      suppress(1200);
      setIsPlaying(true);
      seekTo(time);
      updateRoomPlayback({ isPlaying: true, currentTime: time });

    } else if (type === 'pause') {
      suppress(1200);
      setIsPlaying(false);
      seekTo(time);
      updateRoomPlayback({ isPlaying: false, currentTime: time });

    } else if (type === 'seek') {
      suppress(1200);
      seekTo(time);
      updateRoomPlayback({ currentTime: time });

    } else if (type === 'sync') {
      suppress(1500);
      setIsPlaying(shouldPlay);
      seekTo(time);
      updateRoomPlayback({ isPlaying: shouldPlay, currentTime: time });

    } else if (type === 'drift-sync') {
      const localTime = getCurrentTime();
      const drift = Math.abs(localTime - time);
      if (drift > 2.0) {
        suppress(1200);
        seekTo(time);
        updateRoomPlayback({ currentTime: time });
      }
      
    }

    setPlaybackCommand(null);
  }, [playbackCommand, isValidYoutube, ready, setPlaybackCommand, updateRoomPlayback]);

  

  const handlePlay = () => {
    if (isSuppressed()) return; 
    if (!hasControl) return;
    const currentTime = getCurrentTime();
    
    
    setIsPlaying(true);
    updateRoomPlayback({ isPlaying: true, currentTime });
    
    emitVideoPlay(currentTime);
    suppress(1200);
  };

  const handlePause = () => {
    if (isSuppressed()) return; 
    if (!hasControl) return;
    const currentTime = getCurrentTime();
    
    
    setIsPlaying(false);
    updateRoomPlayback({ isPlaying: false, currentTime });
    
    emitVideoPause(currentTime);
    suppress(1200);
  };

  const handleSeek = (seconds) => {
    if (isSuppressed()) return; 
    if (!hasControl) return;
    
    updateRoomPlayback({ currentTime: seconds });
    emitVideoSeek(seconds);
    suppress(1200);
  };

  
  useEffect(() => {
    setReady(false);
    setIsPlaying(false);
    suppressUntil.current = 0;
    hasSyncedInitial.current = false;
  }, [videoUrl]);

  return (
    <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800/80 shadow-2xl">
      {isValidYoutube ? (
        <div className="w-full h-full relative">
          <Suspense fallback={
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-950">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-youtube-red mb-3"></div>
              <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Initializing Player...</p>
            </div>
          }>
            <ReactPlayer
              key={currentRoom?.currentVideo || 'empty'}
              ref={playerRef}
              src={videoUrl}
              width="100%"
              height="100%"
              playing={isPlaying}
              controls={hasControl}
              onReady={onPlayerReady}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              config={PLAYER_CONFIG}
            />
          </Suspense>
          {!hasControl && (
            <div
              className="absolute inset-0 bg-transparent cursor-not-allowed"
              style={{ pointerEvents: 'auto' }}
              title="Controls locked. Only the Host can control video playback."
            />
          )}
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2 sm:gap-4 p-4 sm:p-8 text-center bg-slate-900/40 overflow-hidden">
          <div className="p-3 sm:p-5 bg-slate-800/40 rounded-full border border-slate-700/50 text-slate-400 animate-pulse flex items-center justify-center">
            <Tv className="w-6 h-6 sm:w-11 sm:h-11" />
          </div>
          <div className="max-w-[85%] sm:max-w-sm">
            <h3 className="text-sm sm:text-xl font-bold text-slate-200 mb-0.5 sm:mb-1">
              No Video Playing
            </h3>
            <p className="text-[10px] sm:text-sm text-slate-400 leading-normal sm:leading-relaxed mx-auto">
              {isHost
                ? "Paste a YouTube link or Video ID in the input box above to start streaming for the party."
                : "Waiting for the Host to start a YouTube stream. Hang tight!"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
