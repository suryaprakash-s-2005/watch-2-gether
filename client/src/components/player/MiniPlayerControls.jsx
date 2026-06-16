import { useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, X } from 'lucide-react';
import useGlobalPlayer from '../../hooks/useGlobalPlayer';
import axios from 'axios';

const MiniPlayerControls = ({ duration, onTogglePlay, onToggleMute, onSeekTo, layout = 'desktop' }) => {
  const {
    currentVideoId,
    isPlaying,
    isMuted,
    currentTime,
    expand,
    close,
  } = useGlobalPlayer();

  const [videoTitle, setVideoTitle] = useState('Loading Video...');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

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

  if (layout === 'mobile') {
    return (
      <div className="w-full h-full flex items-center justify-between px-3 gap-2 relative select-none">
        {/* Left Video Thumbnail */}
        <div 
          className="w-14 h-10 rounded-lg bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-700 relative"
        >
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900">
              <Play size={10} className="text-slate-400" />
            </div>
          )}
        </div>

        {/* Title / Description */}
        <div 
          className="flex-1 min-w-0 text-left"
        >
          <h4 className="text-xs font-bold text-white truncate">{videoTitle}</h4>
          <p className="text-[10px] text-slate-400 font-semibold truncate">Watch-2-Gether Party</p>
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-200 hover:text-white transition active:scale-95 cursor-pointer"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); expand(); }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-200 hover:text-white transition active:scale-95 cursor-pointer"
            title="Expand to Room"
            aria-label="Expand to Room"
          >
            <Maximize2 size={18} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-500 hover:text-red-400 transition active:scale-95 cursor-pointer"
            title="Close Party"
            aria-label="Close Party"
          >
            <X size={20} />
          </button>
        </div>

        {/* Slim progress bar at bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800">
          <div 
            className="h-full bg-youtube-red transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
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
          className="p-3 bg-youtube-red hover:bg-youtube-hover text-white rounded-full transition shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
      </div>

      {/* Bottom controls */}
      <div className="flex flex-col gap-1.5">
        {/* Progress bar */}
        <div 
          className="w-full h-1 bg-slate-700/60 rounded-full overflow-hidden cursor-pointer hover:h-1.5 transition-all duration-150 relative"
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            if (onSeekTo && duration > 0) {
              onSeekTo(percentage * duration);
            }
          }}
        >
          <div 
            className="h-full bg-youtube-red transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Control row */}
        <div className="flex items-center justify-between text-[10px] text-slate-350 font-medium font-sans">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
              className="hover:text-white transition cursor-pointer flex items-center justify-center"
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <span className="text-slate-400 font-semibold tracking-wider uppercase text-[8px]">
            Mini Mode
          </span>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayerControls;
