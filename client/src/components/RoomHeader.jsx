import { useState } from 'react';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import usePlayerStore from '../store/playerStore';
import { Copy, Check, Tv } from 'lucide-react';
import { detectSourceType, extractId } from './player/sources/BasePlayer';

const SOURCE_LABELS = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  twitch: 'Twitch',
};

const RoomHeader = ({ isModal = false, onClose = null }) => {
  const { currentRoom, roomUsers } = useRoomStore();
  const { user } = useAuthStore();
  const { emitVideoChange, emitAddToQueue } = useSocketStore();
  const setSourceType = usePlayerStore((s) => s.setSourceType);

  const [videoUrl, setVideoUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [inputError, setInputError] = useState('');

  if (!currentRoom) return null;

  const isHost = currentRoom?.hostId && user?._id && String(currentRoom.hostId._id || currentRoom.hostId) === String(user._id);
  const hostUser = roomUsers.find(u => u.userId && currentRoom?.hostId && String(u.userId) === String(currentRoom.hostId._id || currentRoom.hostId));

  let hostName = 'Unknown Host';
  if (hostUser) hostName = hostUser.username;
  else if (isHost && user?.name) hostName = user.name;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentRoom.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Could not copy room code', err);
    }
  };

  const parseVideoInput = (input) => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const type = detectSourceType(trimmed);
    const id = type ? extractId(trimmed, type) : trimmed;
    if (!id) return null;
    return { id, type: type || 'youtube' };
  };

  const handleLoadVideo = (e) => {
    if (e) e.preventDefault();
    setInputError('');

    if (!videoUrl.trim()) return;

    const parsed = parseVideoInput(videoUrl);
    if (!parsed) {
      setInputError('Invalid video URL or ID. Supported: YouTube, Vimeo, Twitch');
      return;
    }

    setSourceType(parsed.type);
    emitVideoChange(parsed.id);
    setVideoUrl('');
  };

  const handleAddToQueue = (e) => {
    if (e) e.preventDefault();
    setInputError('');

    if (!videoUrl.trim()) return;

    const parsed = parseVideoInput(videoUrl);
    if (!parsed) {
      setInputError('Invalid video URL or ID');
      return;
    }

    emitAddToQueue(parsed.id);
    setVideoUrl('');
  };

  const detectedType = videoUrl.trim() ? detectSourceType(videoUrl.trim()) : null;
  const placeholder = isHost
    ? 'Paste video link (YouTube, Vimeo, Twitch) or ID...'
    : 'Suggest video link...';

  if (isModal) {
    return (
      <div className="w-full">
        <form onSubmit={isHost ? handleLoadVideo : handleAddToQueue} className="flex flex-col gap-3.5 w-full">
          <div className="flex flex-col gap-3 w-full">
            <div className="relative">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => { setVideoUrl(e.target.value); setInputError(''); }}
                placeholder={placeholder}
                className="glass-input px-4 py-4 md:py-3.5 rounded-2xl text-sm md:text-xs focus:ring-2 focus:ring-youtube-red w-full pr-16"
              />
              {detectedType && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-youtube-red bg-youtube-red/10 px-2 py-0.5 rounded-full">
                  {SOURCE_LABELS[detectedType] || detectedType}
                </span>
              )}
            </div>
            {isHost ? (
              <div className="flex gap-2 w-full">
                <button type="submit"
                  onClick={(e) => { handleLoadVideo(e); if (videoUrl.trim() && onClose) onClose(); }}
                  className="flex-1 justify-center bg-youtube-red hover:bg-youtube-hover text-white font-bold text-xs py-3.5 rounded-xl transition shadow-lg shadow-youtube-red/20 flex items-center justify-center gap-2 min-h-[44px]">
                  <Tv size={14} />
                  Play Now
                </button>
                <button type="button"
                  onClick={(e) => { handleAddToQueue(e); if (videoUrl.trim() && onClose) onClose(); }}
                  className="flex-1 justify-center bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 font-bold text-xs py-3.5 rounded-xl transition flex items-center justify-center gap-2 min-h-[44px]">
                  Queue
                </button>
              </div>
            ) : (
              <button type="submit"
                onClick={(e) => { handleAddToQueue(e); if (videoUrl.trim() && onClose) onClose(); }}
                className="w-full justify-center bg-youtube-red hover:bg-youtube-hover text-white font-bold text-xs py-3.5 rounded-xl transition shadow-lg shadow-youtube-red/20 flex items-center justify-center gap-2 min-h-[44px]">
                Request Video
              </button>
            )}
          </div>
          {inputError && <p className="text-xs text-youtube-red font-medium pl-1">{inputError}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Room Code:</h2>
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-xl font-mono text-xl font-bold text-youtube-red shadow-inner">
            <span>{currentRoom.roomCode}</span>
            <button onClick={handleCopyCode}
              className="text-slate-400 hover:text-white transition-colors duration-150 p-1 cursor-pointer"
              title="Copy Room Code">
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-400">
          Current Host: <span className="font-semibold text-slate-200">{hostName}</span>
          {isHost && <span className="text-xs bg-youtube-red/20 text-youtube-red px-2 py-0.5 rounded-full font-medium ml-1">You</span>}
        </p>
      </div>

      <div className="flex-1 max-w-xl w-full">
        <form onSubmit={isHost ? handleLoadVideo : handleAddToQueue} className="flex flex-col gap-1.5 w-full">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <div className="relative flex-1">
              <input type="text" value={videoUrl}
                onChange={(e) => { setVideoUrl(e.target.value); setInputError(''); }}
                placeholder={placeholder}
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-youtube-red pr-14" />
              {detectedType && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-youtube-red bg-youtube-red/10 px-2 py-0.5 rounded-full">
                  {SOURCE_LABELS[detectedType] || detectedType}
                </span>
              )}
            </div>
            {isHost ? (
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <button type="submit"
                  className="flex-1 sm:flex-none justify-center bg-youtube-red hover:bg-youtube-hover text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-youtube-red/20 flex items-center gap-2 whitespace-nowrap active:scale-95 cursor-pointer">
                  <Tv size={16} />
                  Play Video
                </button>
                <button type="button" onClick={handleAddToQueue}
                  className="flex-1 sm:flex-none justify-center bg-slate-800 hover:bg-slate-750 text-slate-250 border border-slate-700/60 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap active:scale-95 cursor-pointer">
                  Add to Queue
                </button>
              </div>
            ) : (
              <button type="submit"
                className="w-full sm:w-auto justify-center bg-youtube-red hover:bg-youtube-hover text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-youtube-red/20 flex items-center gap-2 whitespace-nowrap active:scale-95 cursor-pointer">
                Add to Queue
              </button>
            )}
          </div>
          {inputError && <p className="text-xs text-youtube-red font-medium pl-1">{inputError}</p>}
        </form>
      </div>
    </div>
  );
};

export default RoomHeader;
