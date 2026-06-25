import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Minimize, Lock, Unlock, Crown, Subtitles,
} from 'lucide-react';
import useSocketStore from '../../store/socketStore';
import useRoomStore from '../../store/roomStore';
import useAuthStore from '../../store/authStore';

const PLAYBACK_RATES = [0.5, 1, 1.5, 2];

const SyncIndicator = ({ status, isMobile: isCompact }) => {
  const colors = {
    synced: { dot: 'bg-green-400', text: 'text-green-400' },
    drifted: { dot: 'bg-yellow-400', text: 'text-yellow-400' },
    unsynced: { dot: 'bg-red-400', text: 'text-red-400' },
  };
  const c = colors[status] || colors.unsynced;

  if (isCompact) {
    return <div className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse shrink-0`} />;
  }

  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'drifted' ? 'animate-pulse' : ''}`} />
      <div className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status !== 'synced' ? 'animate-pulse' : ''}`} />
      <div className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'unsynced' ? 'animate-pulse' : ''}`} />
      <span className={`text-[9px] font-semibold uppercase tracking-wider ${c.text} ml-0.5`}>
        {status}
      </span>
    </div>
  );
};

const PlayerControls = ({
  mode,
  duration, currentTime, isPlaying, volume, isMuted, playbackRate,
  onTogglePlay, onToggleMute, onVolumeChange, onPlaybackRateChange,
  hasControl, isHost, syncStatus, formatTime,
  progressPercent, progressRef, seekHoverPos, seekHoverTime, isHoveringSeek,
  onProgressPointerDown, onProgressPointerMove, onProgressPointerUp,
  onProgressPointerLeave, onProgressPointerCancel,
  videoTitle, onExpand, onClose, onToggleFullscreen, isFullscreen,
  onToggleTheaterMode, isTheaterMode,
  onTogglePiP, isPiPActive,
  onSkipForward, onSkipBackward,
  onToggleCaptions, captionsEnabled,
}) => {
  const { currentRoom, roomUsers } = useRoomStore();
  const { user } = useAuthStore();
  const { emitSetGuestControl } = useSocketStore();

  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef(null);
  const controlsRef = useRef(null);
  const [localVolume, setLocalVolume] = useState(volume);
  const [showRateMenu, setShowRateMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const startHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, []);

  useEffect(() => { startHideTimer(); }, [startHideTimer]);

  const guestControlEnabled = currentRoom?.guestControlEnabled ?? false;

  const hostUser = roomUsers.find(u =>
    u.userId && currentRoom?.hostId &&
    String(u.userId) === String(currentRoom.hostId._id || currentRoom.hostId)
  );
  const hostName = hostUser?.username || (isHost ? user?.name : 'Host');

  const isMiniDesktop = mode === 'mini-desktop';
  const isMiniMobile = mode === 'mini-mobile';
  const isCompact = mode === 'compact';
  const isFullMobile = mode === 'full-mobile';

  const doubleTapRef = useRef({ lastTap: 0, timer: null });
  const isMobile = mode === 'full-mobile' || mode === 'mini-mobile' || mode === 'compact';

  const handleOverlayClick = useCallback((e) => {
    if (
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('select') ||
      e.target.closest('.no-click-propagation')
    ) {
      return;
    }

    if (!isMobile) {
      onTogglePlay();
      return;
    }

    const now = Date.now();
    const dt = doubleTapRef.current;
    if (now - dt.lastTap < 300) {
      if (dt.timer) clearTimeout(dt.timer);
      dt.timer = null;
      dt.lastTap = 0;

      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX;
      if (clientX !== undefined) {
        const x = clientX - rect.left;
        if (x < rect.width / 2) {
          onSkipBackward();
        } else {
          onSkipForward();
        }
      }
    } else {
      dt.lastTap = now;
      dt.timer = setTimeout(() => {
        dt.lastTap = 0;
        dt.timer = null;
        setShowControls(prev => !prev);
        startHideTimer();
      }, 300);
    }
  }, [isMobile, onTogglePlay, onSkipBackward, onSkipForward, startHideTimer]);

  if (isMiniMobile) {
    return (
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-10 flex flex-col justify-between px-3 py-2 select-none pointer-events-auto no-click-propagation">
        <div className="flex items-center justify-between gap-2 min-h-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="min-w-0">
              <h4 className="text-[11px] font-bold text-white truncate leading-tight">{videoTitle || 'Now Playing'}</h4>
              <span className="text-[9px] text-slate-400 font-semibold tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onTogglePlay(); }} disabled={!hasControl}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center transition active:scale-95 ${hasControl ? 'text-slate-200 hover:text-white cursor-pointer' : 'text-slate-600 cursor-not-allowed'}`}
              aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            {onExpand && (
              <button onClick={(e) => { e.stopPropagation(); onExpand(); }}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-200 hover:text-white transition active:scale-95 cursor-pointer"
                aria-label="Expand to Room">
                <Maximize size={15} />
              </button>
            )}
            {onClose && (
              <button onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-red-500 hover:text-red-400 transition active:scale-95 cursor-pointer"
                aria-label="Close Player">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>
        <div className="relative flex items-center gap-1.5">
          {isHoveringSeek && (
            <div className="absolute bottom-full mb-1.5 -translate-x-1/2 z-30 pointer-events-none"
              style={{ left: `${seekHoverPos * 100}%` }}>
              <div className="bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 shadow-2xl">
                <span className="text-[11px] font-bold text-white tabular-nums">{formatTime(seekHoverTime)}</span>
              </div>
            </div>
          )}
          <div ref={progressRef}
            className="flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer relative"
            onPointerDown={onProgressPointerDown}
            onPointerMove={onProgressPointerMove}
            onPointerUp={onProgressPointerUp}
            onPointerLeave={onProgressPointerLeave}
            onPointerCancel={onProgressPointerCancel}>
            <div className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full relative transition-[width] duration-75"
              style={{ width: `${progressPercent}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg ring-2 ring-white/20 opacity-70 group-hover:opacity-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isMiniDesktop) {
    return (
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/80 opacity-0 hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3 z-10 pointer-events-auto">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {onTogglePiP && (
              <button onClick={(e) => { e.stopPropagation(); onTogglePiP(); }}
                className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition cursor-pointer"
                aria-label="Picture-in-Picture">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" /><rect x="10" y="9" width="6" height="5" rx="1" />
                </svg>
              </button>
            )}
            {onExpand && (
              <button onClick={(e) => { e.stopPropagation(); onExpand(); }}
                className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition cursor-pointer"
                aria-label="Return to Room">
                <Maximize size={14} />
              </button>
            )}
            {onClose && (
              <button onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="p-1 rounded-lg bg-red-600/80 hover:bg-red-550 text-white transition cursor-pointer"
                aria-label="Close Player">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          <span className="text-[11px] font-semibold text-slate-100 truncate flex-1 text-center px-1">
            {videoTitle || 'Now Playing'}
          </span>
          <div className="w-[52px]" />
        </div>
        <div className="flex items-center justify-center">
          <button onClick={(e) => { e.stopPropagation(); onTogglePlay(); }} disabled={!hasControl}
            className={`p-3 rounded-full transition flex items-center justify-center ${hasControl ? 'bg-youtube-red hover:bg-youtube-hover text-white shadow-lg hover:scale-105 active:scale-95 cursor-pointer' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            {isHoveringSeek && (
              <div className="absolute bottom-full mb-2 -translate-x-1/2 z-30 pointer-events-none"
                style={{ left: `${seekHoverPos * 100}%` }}>
                <div className="bg-slate-950 border border-slate-700/80 rounded-lg overflow-hidden shadow-2xl">
                  <div className="px-2 py-1 text-center">
                    <span className="text-[11px] font-bold text-white tabular-nums">{formatTime(seekHoverTime)}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={progressRef}
              className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer relative"
              onPointerDown={onProgressPointerDown}
              onPointerMove={onProgressPointerMove}
              onPointerUp={onProgressPointerUp}
              onPointerLeave={onProgressPointerLeave}
              onPointerCancel={() => {}}>
              <div className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full relative transition-[width] duration-75"
                style={{ width: `${progressPercent}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg ring-2 ring-white/20 opacity-70 group-hover:opacity-100" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-350 font-medium">
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
                className="p-1 hover:text-white transition cursor-pointer">
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
              <span className="tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <SyncIndicator status={syncStatus} isMobile />
              {isPlaying && (
                <span className="text-[9px] font-bold text-youtube-red">{playbackRate}x</span>
              )}
              <span className="text-slate-400 font-semibold tracking-wider uppercase text-[8px]">Mini</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCompact) {
    return (
      <div className="w-full h-full flex items-center gap-3 px-3 py-2 select-none">
        <button onClick={onTogglePlay} disabled={!hasControl}
          className={`shrink-0 p-2 rounded-full transition flex items-center justify-center ${hasControl ? 'bg-youtube-red hover:bg-youtube-hover text-white cursor-pointer' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="relative">
            <div ref={progressRef}
              className="w-full h-1 bg-white/10 rounded-full cursor-pointer"
              onPointerDown={onProgressPointerDown}
              onPointerMove={onProgressPointerMove}
              onPointerUp={onProgressPointerUp}
              onPointerLeave={onProgressPointerLeave}
              onPointerCancel={() => {}}>
              <div className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full"
                style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-slate-400 tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>
            <SyncIndicator status={syncStatus} isMobile />
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
          className="shrink-0 p-1.5 text-slate-300 hover:text-white transition cursor-pointer">
          <Maximize size={14} />
        </button>
      </div>
    );
  }

  if (isFullMobile) {
    return (
      <div ref={controlsRef}
        className="absolute inset-0 z-30 overflow-hidden"
        onMouseMove={() => { setShowControls(true); startHideTimer(); }}
        onMouseLeave={() => setShowControls(false)}
        onClick={handleOverlayClick}>

        <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-3 pt-12 pointer-events-auto no-click-propagation">

            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <SyncIndicator status={syncStatus} />
                {isHost ? (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                    <Crown size={12} />
                    <span>Host</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Crown size={12} className="text-amber-500/60" />
                    <span>Host: {hostName}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isHost ? (
                  <button onClick={() => emitSetGuestControl(!guestControlEnabled)}
                    className={`flex items-center gap-1 text-[11px] font-semibold transition rounded px-2 py-1 cursor-pointer ${guestControlEnabled ? 'text-green-400 hover:text-green-300 hover:bg-green-900/20' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/40'}`}
                    title={guestControlEnabled ? 'Disable guest control' : 'Enable guest control'}>
                    {guestControlEnabled ? <Unlock size={12} /> : <Lock size={12} />}
                    <span>{guestControlEnabled ? 'Guests can control' : 'Guests locked'}</span>
                  </button>
                ) : (
                  !hasControl && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Lock size={12} />
                      <span>Controls locked</span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-[12px] text-slate-300 font-medium tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button onClick={onSkipBackward} disabled={!hasControl}
                  className={`p-2 transition rounded-lg flex items-center justify-center ${hasControl ? 'text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer' : 'text-slate-600 cursor-not-allowed'}`}
                  aria-label="Back 10s">
                  <SkipBack size={18} />
                </button>
                <button onClick={onTogglePlay} disabled={!hasControl}
                  className={`p-2.5 rounded-full transition flex items-center justify-center ${hasControl ? 'bg-youtube-red hover:bg-youtube-hover text-white shadow-lg shadow-youtube-red/20 hover:scale-105 active:scale-95 cursor-pointer' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                  aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                </button>
                <button onClick={onSkipForward} disabled={!hasControl}
                  className={`p-2 transition rounded-lg flex items-center justify-center ${hasControl ? 'text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer' : 'text-slate-600 cursor-not-allowed'}`}
                  aria-label="Forward 10s">
                  <SkipForward size={18} />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 group/vol">
                  <button onClick={onToggleMute}
                    className="p-1.5 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}>
                    {(isMuted || localVolume === 0) ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>

                {onToggleCaptions && (
                  <button onClick={onToggleCaptions}
                    className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${captionsEnabled ? 'text-youtube-red bg-youtube-red/10' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                    aria-label={captionsEnabled ? 'Disable subtitles' : 'Enable subtitles'}
                    title={captionsEnabled ? 'Subtitles on' : 'Subtitles off'}>
                    <Subtitles size={16} />
                  </button>
                )}

                <div className="relative">
                  <button onClick={() => setShowRateMenu(!showRateMenu)}
                    className={`p-1.5 text-[12px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center min-w-[36px] ${hasControl ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-500 cursor-not-allowed'}`}
                    disabled={!hasControl}>
                    {playbackRate}x
                  </button>
                  {showRateMenu && hasControl && (
                    <div className="absolute bottom-full right-0 mb-2 bg-slate-950 border border-slate-800/80 rounded-xl shadow-2xl overflow-hidden z-30">
                      {PLAYBACK_RATES.map((rate) => (
                        <button key={rate} onClick={() => { onPlaybackRateChange(rate); setShowRateMenu(false); }}
                          className={`block w-full px-5 py-2.5 text-sm font-bold text-left transition hover:bg-slate-800 cursor-pointer ${playbackRate === rate ? 'text-youtube-red bg-youtube-red/10' : 'text-slate-300'}`}>
                          {rate}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {onToggleFullscreen && (
                  <button onClick={onToggleFullscreen}
                    className="p-1.5 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
                    aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                )}
              </div>
            </div>

            {progressRef && (
              <div className="mt-2 group px-0.5">
                {isHoveringSeek && (
                  <div className="absolute bottom-full mb-2 -translate-x-1/2 pointer-events-none z-30"
                    style={{ left: `${seekHoverPos * 100}%` }}>
                    <div className="bg-slate-950/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-2xl relative backdrop-blur-md">
                      <span className="text-[12px] font-bold text-white tabular-nums whitespace-nowrap">
                        {formatTime(seekHoverTime)}
                      </span>
                      <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-r border-b border-slate-700/80 rotate-45" />
                    </div>
                  </div>
                )}
                <div ref={progressRef}
                  className="w-full h-2 bg-white/10 rounded-full cursor-pointer group-hover:h-3 transition-all duration-150 relative"
                  onPointerDown={onProgressPointerDown}
                  onPointerMove={onProgressPointerMove}
                  onPointerUp={onProgressPointerUp}
                  onPointerLeave={onProgressPointerLeave}
                  onPointerCancel={onProgressPointerCancel}>
                  <div className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full relative transition-[width] duration-75"
                    style={{ width: `${progressPercent}%` }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-black/30 ring-2 ring-white/20 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-150" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={controlsRef}
      className="absolute inset-0 z-30"
      onMouseMove={() => { setShowControls(true); startHideTimer(); }}
      onMouseLeave={() => setShowControls(false)}
      onClick={handleOverlayClick}>

      <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-2 pt-12 pointer-events-auto no-click-propagation">

          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-2">
              <SyncIndicator status={syncStatus} />
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
                <button onClick={() => emitSetGuestControl(!guestControlEnabled)}
                  className={`flex items-center gap-1 text-[10px] font-semibold transition rounded px-1.5 py-0.5 cursor-pointer ${guestControlEnabled ? 'text-green-400 hover:text-green-300 hover:bg-green-900/20' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/40'}`}
                  title={guestControlEnabled ? 'Disable guest control' : 'Enable guest control'}>
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

          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[11px] text-slate-300 font-medium tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-0.5">
              <button onClick={onSkipBackward} disabled={!hasControl}
                className={`p-1.5 transition rounded-lg flex items-center justify-center ${hasControl ? 'text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer' : 'text-slate-600 cursor-not-allowed'}`}
                aria-label="Back 10s">
                <SkipBack size={16} />
              </button>
              <button onClick={onTogglePlay} disabled={!hasControl}
                className={`p-2 rounded-full transition flex items-center justify-center ${hasControl ? 'bg-youtube-red hover:bg-youtube-hover text-white shadow-lg shadow-youtube-red/20 hover:scale-105 active:scale-95 cursor-pointer' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>
              <button onClick={onSkipForward} disabled={!hasControl}
                className={`p-1.5 transition rounded-lg flex items-center justify-center ${hasControl ? 'text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer' : 'text-slate-600 cursor-not-allowed'}`}
                aria-label="Forward 10s">
                <SkipForward size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 group/vol"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}>
                <button onClick={onToggleMute}
                  className="p-1 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}>
                  {(isMuted || localVolume === 0) ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                {(showVolumeSlider || mode === 'full') && (
                  <div className={`${showVolumeSlider ? 'w-16' : 'w-0'} overflow-hidden transition-all duration-200 h-1 bg-white/20 rounded-full cursor-pointer`}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = (e.clientX - rect.left) / rect.width;
                      const newVol = Math.max(0, Math.min(1, x));
                      setLocalVolume(newVol);
                      onVolumeChange(newVol);
                      if (newVol > 0 && isMuted) onToggleMute();
                    }}>
                    <div className="h-full bg-white rounded-full"
                      style={{ width: `${(isMuted ? 0 : localVolume) * 100}%` }} />
                  </div>
                )}
              </div>

              {onToggleCaptions && (
                <button onClick={onToggleCaptions}
                  className={`p-1 rounded-lg transition cursor-pointer flex items-center justify-center ${captionsEnabled ? 'text-youtube-red bg-youtube-red/10' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                  aria-label={captionsEnabled ? 'Disable subtitles' : 'Enable subtitles'}
                  title={captionsEnabled ? 'Subtitles on' : 'Subtitles off'}>
                  <Subtitles size={14} />
                </button>
              )}

              <div className="relative">
                <button onClick={() => setShowRateMenu(!showRateMenu)}
                  className={`p-1 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center min-w-[32px] ${hasControl ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-500 cursor-not-allowed'}`}
                  disabled={!hasControl}>
                  {playbackRate}x
                </button>
                {showRateMenu && hasControl && (
                  <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden z-30">
                    {PLAYBACK_RATES.map((rate) => (
                      <button key={rate} onClick={() => { onPlaybackRateChange(rate); setShowRateMenu(false); }}
                        className={`block w-full px-4 py-2 text-xs font-bold text-left transition hover:bg-slate-800 cursor-pointer ${playbackRate === rate ? 'text-youtube-red bg-youtube-red/10' : 'text-slate-300'}`}>
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {onTogglePiP && (
                <button onClick={onTogglePiP}
                  className="p-1 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
                  aria-label={isPiPActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
                  title={isPiPActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isPiPActive ? (
                      <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M10 12h4v4h-4z" /></>
                    ) : (
                      <><rect x="2" y="3" width="20" height="14" rx="2" /><rect x="10" y="9" width="6" height="5" rx="1" /></>
                    )}
                  </svg>
                </button>
              )}

              {onToggleTheaterMode && (
                <button onClick={onToggleTheaterMode}
                  className="p-1 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
                  aria-label={isTheaterMode ? 'Exit Theater Mode' : 'Theater Mode'}
                  title={isTheaterMode ? 'Exit Theater Mode' : 'Theater Mode'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
                  </svg>
                </button>
              )}

              {onToggleFullscreen && (
                <button onClick={onToggleFullscreen}
                  className="p-1 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                  {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                </button>
              )}
            </div>
          </div>

          {progressRef && (
            <div className="mt-1.5 group px-0.5">
              {isHoveringSeek && (
                <div className="absolute bottom-full mb-2 -translate-x-1/2 pointer-events-none z-30"
                  style={{ left: `${seekHoverPos * 100}%` }}>
                  <div className="bg-slate-950/90 border border-slate-700/80 rounded-lg px-2 py-1 shadow-2xl relative backdrop-blur-md">
                    <span className="text-[11px] font-bold text-white tabular-nums whitespace-nowrap">
                      {formatTime(seekHoverTime)}
                    </span>
                    <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-r border-b border-slate-700/80 rotate-45" />
                  </div>
                </div>
              )}
              <div ref={progressRef}
                className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer group-hover:h-2 transition-all duration-150 relative"
                onPointerDown={onProgressPointerDown}
                onPointerMove={onProgressPointerMove}
                onPointerUp={onProgressPointerUp}
                onPointerLeave={onProgressPointerLeave}
                onPointerCancel={onProgressPointerCancel}>
                <div className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full relative transition-[width] duration-75"
                  style={{ width: `${progressPercent}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg shadow-black/30 ring-2 ring-white/20 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-150" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerControls;
