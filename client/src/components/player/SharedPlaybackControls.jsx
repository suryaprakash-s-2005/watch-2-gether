import { useState, useEffect, useRef } from 'react';
import useRoomStore from '../../store/roomStore';
import useAuthStore from '../../store/authStore';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Minimize, Lock, Unlock, Crown, Wifi, WifiOff
} from 'lucide-react';
import useSocketStore from '../../store/socketStore';

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
  syncStatus,
}) => {
  const { currentRoom, roomUsers } = useRoomStore();
  const { user } = useAuthStore();
  const { emitSetGuestControl } = useSocketStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsRef = useRef(null);
  const [localVolume, setLocalVolume] = useState(volume);
  const [showRateMenu, setShowRateMenu] = useState(false);

  const guestControlEnabled = currentRoom?.guestControlEnabled ?? false;

  const handleToggleGuestControl = () => {
    emitSetGuestControl(!guestControlEnabled);
  };

  const hostUser = roomUsers.find(u =>
    u.userId && currentRoom?.hostId &&
    String(u.userId) === String(currentRoom.hostId._id || currentRoom.hostId)
  );
  const hostName = hostUser?.username || (isHost ? user?.name : 'Host');

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
      className="absolute inset-0 z-20 flex flex-col justify-end pointer-events-none"
    >
      <div className="bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent px-3 pb-2 pt-12 pointer-events-auto">
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
            {isHost ? (
              <button
                onClick={handleToggleGuestControl}
                className={`flex items-center gap-1 text-[10px] font-semibold transition rounded px-1.5 py-0.5 cursor-pointer ${
                  guestControlEnabled
                    ? 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/40'
                }`}
                title={guestControlEnabled ? 'Disable guest control' : 'Enable guest control'}
              >
                {guestControlEnabled ? <Unlock size={10} /> : <Lock size={10} />}
                <span>{guestControlEnabled ? 'Guests can control' : 'Guests locked'}</span>
              </button>
            ) : (
              !hasControl && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Lock size={10} />
                  <span>Controls locked</span>
                </div>
              )
            )}
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
            <button
              onClick={skipBackward}
              disabled={!hasControl}
              className={`p-1.5 transition rounded-lg flex items-center justify-center ${
                hasControl
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/60 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Back 10s"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={onTogglePlay}
              disabled={!hasControl}
              className={`p-2 rounded-full transition flex items-center justify-center ${
                hasControl
                  ? 'bg-youtube-red hover:bg-youtube-hover text-white shadow-lg shadow-youtube-red/20 hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
            <button
              onClick={skipForward}
              disabled={!hasControl}
              className={`p-1.5 transition rounded-lg flex items-center justify-center ${
                hasControl
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/60 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Forward 10s"
            >
              <SkipForward size={16} />
            </button>
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
