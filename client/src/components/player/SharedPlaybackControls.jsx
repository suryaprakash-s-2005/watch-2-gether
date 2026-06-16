import { useState, useEffect, useRef, useCallback } from 'react';
import useRoomStore from '../../store/roomStore';
import useAuthStore from '../../store/authStore';
import useGlobalPlayer from '../../hooks/useGlobalPlayer';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Minimize, Lock, Crown, Wifi, WifiOff
} from 'lucide-react';

const PLAYBACK_RATES = [0.5, 1, 1.5, 2];

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === null || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const SharedPlaybackControls = ({
  duration,
  currentTime,
  isPlaying,
  volume,
  isMuted,
  playbackRate,
  onTogglePlay,
  onSeekTo,
  onToggleMute,
  onVolumeChange,
  onPlaybackRateChange,
  hasControl,
  isHost,
  isSynced,
  syncStatus,
}) => {
  const { currentRoom, roomUsers } = useRoomStore();
  const { user } = useAuthStore();
  const { emitVideoEnded } = useGlobalPlayer();

  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimerRef = useRef(null);
  const controlsRef = useRef(null);
  const progressRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const [showRateMenu, setShowRateMenu] = useState(false);

  const hostUser = roomUsers.find(u =>
    u.userId && currentRoom?.hostId &&
    String(u.userId) === String(currentRoom.hostId._id || currentRoom.hostId)
  );
  const hostName = hostUser?.username || (isHost ? user?.name : 'Host');

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const startHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isDragging) setShowControls(false);
    }, 3000);
  }, [isDragging]);

  const handleMouseMove = () => {
    setShowControls(true);
    startHideTimer();
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    startHideTimer();
  }, [startHideTimer]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      const el = controlsRef.current?.closest('[data-fullscreen-container]');
      if (el) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const handleProgressClick = (e) => {
    if (!hasControl || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const seekTime = Math.max(0, Math.min(x * duration, duration));
    onSeekTo(seekTime);
  };

  const handleProgressDragStart = (e) => {
    if (!hasControl) return;
    setIsDragging(true);
    handleProgressClick(e);
    const handleMove = (ev) => {
      handleProgressClick(ev);
    };
    const handleUp = () => {
      setIsDragging(false);
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  };

  const handleVolumeSlider = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const newVol = Math.max(0, Math.min(1, x));
    setLocalVolume(newVol);
    onVolumeChange(newVol);
    if (newVol > 0 && isMuted) onToggleMute();
  };

  const skipForward = () => {
    if (!hasControl) return;
    const newTime = Math.min(currentTime + 10, duration);
    onSeekTo(newTime);
  };

  const skipBackward = () => {
    if (!hasControl) return;
    const newTime = Math.max(currentTime - 10, 0);
    onSeekTo(newTime);
  };

  const [syncLabel, syncColor, SyncIcon] = syncStatus === 'synced'
    ? ['Synced', 'text-green-400', Wifi]
    : syncStatus === 'drifted'
    ? ['Buffering', 'text-yellow-400', Wifi]
    : ['Re-syncing...', 'text-red-400', WifiOff];

  return (
    <div
      ref={controlsRef}
      className={`absolute inset-0 z-20 flex flex-col justify-end transition-opacity duration-300 ${
        showControls || isDragging ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { if (!isDragging) setShowControls(false); }}
    >
      <div className="bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent px-3 pb-2 pt-12">
        {/* Sync status + host info bar */}
        <div className="flex items-center justify-between mb-1.5 px-1">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-[10px] font-semibold ${syncColor}`}>
              <SyncIcon size={10} />
              <span>{syncLabel}</span>
            </div>
            {isHost ? (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                <Crown size={10} />
                <span>Host</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Crown size={10} className="text-amber-500/60" />
                <span>Host: {hostName}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!hasControl && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Lock size={10} />
                <span>Controls locked</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div
          ref={progressRef}
          className={`w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden cursor-pointer group mb-2 ${
            hasControl ? 'hover:h-2' : ''
          } transition-all duration-150`}
          onPointerDown={handleProgressDragStart}
        >
          <div
            className="h-full bg-youtube-red relative transition-[width] duration-75"
            style={{ width: `${progressPercent}%` }}
          >
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md ${
              showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } transition-opacity`} />
          </div>
        </div>

        {/* Time display */}
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-[11px] text-slate-300 font-medium tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Bottom row: play controls, volume, rate, fullscreen */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5">
            {hasControl ? (
              <>
                <button
                  onClick={skipBackward}
                  className="p-1.5 text-slate-300 hover:text-white transition rounded-lg hover:bg-slate-800/60 cursor-pointer flex items-center justify-center"
                  title="Back 10s"
                >
                  <SkipBack size={16} />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="p-2 bg-youtube-red hover:bg-youtube-hover text-white rounded-full transition shadow-lg shadow-youtube-red/20 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <button
                  onClick={skipForward}
                  className="p-1.5 text-slate-300 hover:text-white transition rounded-lg hover:bg-slate-800/60 cursor-pointer flex items-center justify-center"
                  title="Forward 10s"
                >
                  <SkipForward size={16} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 pl-1">
                <Lock size={14} className="text-slate-500" />
                <span className="text-[10px] text-slate-500 font-medium">
                  {isHost ? 'You have control' : 'Waiting for host control'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Volume */}
            <div className="flex items-center gap-1 group/vol">
              <button
                onClick={onToggleMute}
                className="p-1 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {(isMuted || localVolume === 0) ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <div
                className="w-0 group-hover/vol:w-16 overflow-hidden transition-all duration-200 h-1 bg-slate-700/60 rounded-full cursor-pointer"
                onClick={handleVolumeSlider}
              >
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${(isMuted ? 0 : localVolume) * 100}%` }}
                />
              </div>
            </div>

            {/* Playback Rate */}
            <div className="relative">
              <button
                onClick={() => setShowRateMenu(!showRateMenu)}
                className={`p-1 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center min-w-[32px] ${
                  hasControl
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-500 cursor-not-allowed'
                }`}
                title="Playback Speed"
                disabled={!hasControl}
              >
                {playbackRate}x
              </button>
              {showRateMenu && hasControl && (
                <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden z-30">
                  {PLAYBACK_RATES.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        onPlaybackRateChange(rate);
                        setShowRateMenu(false);
                      }}
                      className={`block w-full px-4 py-2 text-xs font-bold text-left transition hover:bg-slate-800 cursor-pointer ${
                        playbackRate === rate ? 'text-youtube-red bg-youtube-red/10' : 'text-slate-300'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedPlaybackControls;
