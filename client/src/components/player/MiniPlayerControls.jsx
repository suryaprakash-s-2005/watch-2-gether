import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, X, SkipBack, SkipForward } from 'lucide-react';
import useGlobalPlayer from '../../hooks/useGlobalPlayer';
import useAuthStore from '../../store/authStore';
import useRoomStore from '../../store/roomStore';
import axios from 'axios';

const MiniPlayerControls = ({ duration, onTogglePlay, onToggleMute, onSeekTo, layout = 'desktop' }) => {
  const {
    currentVideoId,
    isPlaying,
    isMuted,
    currentTime,
    playbackRate,
    expand,
    close,
  } = useGlobalPlayer();

  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();

  const isHost = currentRoom?.hostId && user?._id && String(currentRoom.hostId._id || currentRoom.hostId) === String(user._id);
  const hasControl = isHost || currentRoom?.guestControlEnabled;

  const [videoTitle, setVideoTitle] = useState('Loading Video...');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [hoveredTime, setHoveredTime] = useState(0);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const progressRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!currentVideoId) return;

    const fetchVideoData = async () => {
      try {
        const { data } = await axios.get(
          `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${currentVideoId}`
        );
        if (data && data.title) {
          setVideoTitle(data.title);
          setThumbnailUrl(data.thumbnail_url);
        }
      } catch (err) {
        console.error('Failed to fetch video title from oEmbed:', err);
        setVideoTitle('YouTube Stream');
      }
    };

    fetchVideoData();
  }, [currentVideoId]);

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressPointer = (e) => {
    if (!progressRef.current || !onSeekTo || duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    const time = x * duration;
    onSeekTo(time);
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleProgressHover = (e) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    setHoverPosition(x);
    setHoveredTime(Math.max(0, Math.min(x * duration, duration)));
    setIsHoveringSeek(true);
    if (isDraggingRef.current && onSeekTo) {
    onSeekTo(x * duration, true);
    }
  };

  const handleProgressPointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (!progressRef.current || !onSeekTo || duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    onSeekTo(x * duration, true);
  };

  const handleProgressLeave = () => {
    if (!isDraggingRef.current) {
      setIsHoveringSeek(false);
    }
  };

  const skipForward = () => {
    if (!hasControl || !onSeekTo) return;
    const newTime = Math.min(currentTime + 10, duration);
    onSeekTo(newTime);
  };

  const skipBackward = () => {
    if (!hasControl || !onSeekTo) return;
    const newTime = Math.max(currentTime - 10, 0);
    onSeekTo(newTime);
  };

  if (layout === 'mobile') {
    return (
      <div className="w-full h-full flex flex-col justify-between px-3 py-1.5 gap-0.5 relative select-none">
        {/* Top row: thumbnail, title, buttons */}
        <div className="flex items-center justify-between gap-2 min-h-0">
          {/* Left: thumbnail + title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-10 h-7 rounded-md bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-700 relative">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                  <Play size={8} className="text-slate-400" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-[11px] font-bold text-white truncate leading-tight">{videoTitle}</h4>
              <span className="text-[9px] text-slate-400 font-semibold tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right: control buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
              disabled={!hasControl}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center transition active:scale-95 ${
                hasControl
                  ? 'text-slate-200 hover:text-white cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); expand(); }}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-200 hover:text-white transition active:scale-95 cursor-pointer"
              title="Expand to Room"
              aria-label="Expand to Room"
            >
              <Maximize2 size={15} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); close(); }}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-red-500 hover:text-red-400 transition active:scale-95 cursor-pointer"
              title="Close Party"
              aria-label="Close Party"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Seek bar row */}
        <div className="relative flex items-center gap-1.5">
          {isHoveringSeek && (
            <div
              className="absolute bottom-full mb-1.5 -translate-x-1/2 z-30 pointer-events-none"
              style={{ left: `${hoverPosition * 100}%` }}
            >
              <div className="bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 shadow-2xl relative">
                <span className="text-[11px] font-bold text-white tabular-nums whitespace-nowrap">
                  {formatTime(hoveredTime)}
                </span>
                <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-r border-b border-slate-700/80 rotate-45" />
              </div>
            </div>
          )}
          <div
            ref={progressRef}
            className="flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer group-hover:h-2 transition-all duration-150 relative"
            onPointerDown={handleProgressPointer}
            onPointerMove={handleProgressHover}
            onPointerUp={handleProgressPointerUp}
            onPointerLeave={handleProgressLeave}
            onPointerCancel={() => { isDraggingRef.current = false; }}
          >
            <div
              className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full relative transition-[width] duration-75"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg shadow-black/30 ring-2 ring-white/20 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-150" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/80 opacity-0 hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3 z-10 pointer-events-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); expand(); }}
          className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition cursor-pointer"
          title="Return to Room"
        >
          <Maximize2 size={14} />
        </button>
        <span className="text-[11px] font-semibold text-slate-100 truncate flex-1 text-center px-1">
          {videoTitle}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); close(); }}
          className="p-1 rounded-lg bg-red-600/80 hover:bg-red-550 text-white transition cursor-pointer"
          title="Close Player"
        >
          <X size={14} />
        </button>
      </div>

      {/* Center Play Button */}
      <div className="flex items-center justify-center">
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          disabled={!hasControl}
          className={`p-3 rounded-full transition flex items-center justify-center ${
            hasControl
              ? 'bg-youtube-red hover:bg-youtube-hover text-white shadow-lg hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
      </div>

      {/* Bottom controls */}
      <div className="flex flex-col gap-1.5">
        {/* Progress bar with peek preview */}
        <div className="relative">
          {isHoveringSeek && currentVideoId && (
            <div
              className="absolute bottom-full mb-2 -translate-x-1/2 z-30 pointer-events-none"
              style={{ left: `${hoverPosition * 100}%` }}
            >
              <div className="bg-slate-950 border border-slate-700/80 rounded-lg overflow-hidden shadow-2xl relative">
                <img
                  src={`https://img.youtube.com/vi/${currentVideoId}/mqdefault.jpg`}
                  alt="Preview"
                  className="w-32 h-[18] object-cover"
                  style={{ display: 'block', width: '128px', height: '72px' }}
                  draggable={false}
                />
                <div className="px-2 py-1 text-center">
                  <span className="text-[11px] font-bold text-white tabular-nums">
                    {formatTime(hoveredTime)}
                  </span>
                </div>
                <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-r border-b border-slate-700/80 rotate-45" />
              </div>
            </div>
          )}
          <div
            ref={progressRef}
            className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer group-hover:h-2 transition-all duration-150 relative"
            onPointerDown={(e) => {
              e.stopPropagation();
              handleProgressPointer(e);
            }}
            onPointerMove={handleProgressHover}
            onPointerUp={handleProgressPointerUp}
            onPointerLeave={handleProgressLeave}
            onPointerCancel={() => { isDraggingRef.current = false; }}
          >
            <div
              className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full relative transition-[width] duration-75"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg shadow-black/30 ring-2 ring-white/20 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-150" />
            </div>
          </div>
        </div>
        
        {/* Control row */}
        <div className="flex items-center justify-between text-[10px] text-slate-350 font-medium font-sans">
          <div className="flex items-center gap-1">
            {hasControl && (
              <button
                onClick={(e) => { e.stopPropagation(); skipBackward(); }}
                className="p-1 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
                title="Back 10s"
              >
                <SkipBack size={12} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
              className="p-1 hover:text-white transition cursor-pointer flex items-center justify-center"
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
            <span className="tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            {hasControl && (
              <button
                onClick={(e) => { e.stopPropagation(); skipForward(); }}
                className="p-1 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
                title="Forward 10s"
              >
                <SkipForward size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isPlaying && (
              <span className="text-[9px] font-bold text-youtube-red">
                {playbackRate}x
              </span>
            )}
            <span className="text-slate-400 font-semibold tracking-wider uppercase text-[8px]">
              Mini Mode
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayerControls;
