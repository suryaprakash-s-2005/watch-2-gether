import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import useChatStore from '../store/chatStore';
import Navbar from '../components/Navbar';
import RoomHeader from '../components/RoomHeader';
import PlayerSlot from '../components/player/PlayerSlot';
import UserList from '../components/UserList';
import QueueList from '../components/QueueList';
import ChatBox from '../components/ChatBox';
import usePlayerStore from '../store/playerStore';
import { ArrowLeft, RefreshCw, Tv, MessageSquare, ListVideo, Users, LogOut, Copy, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Room = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const { token, user: currentUser } = useAuthStore();
  const { currentRoom, roomLoading, roomError, getRoomDetails, clearRoomState } = useRoomStore();
  const { connectSocket, disconnectSocket } = useSocketStore();
  const { unreadCount, mentionCount, setChatActive } = useChatStore();

  const [activeTab, setActiveTab] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isHeaderOpen, setIsHeaderOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isHost = currentRoom?.hostId && currentUser?._id && String(currentRoom.hostId._id || currentRoom.hostId) === String(currentUser._id);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentRoom.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Could not copy room code', err);
    }
  };

  // Synchronize chat active state in store
  useEffect(() => {
    const isActive = isSidebarOpen && activeTab === 'chat';
    setChatActive(isActive);
  }, [isSidebarOpen, activeTab, setChatActive]);

  useEffect(() => {
    if (!roomCode) return;
    let active = true;

    // Teardown previous room state and socket if joining a different room
    const activeRoomCode = usePlayerStore.getState().roomId;
    if (activeRoomCode && activeRoomCode !== roomCode.toUpperCase()) {
      disconnectSocket();
      clearRoomState();
      usePlayerStore.getState().resetPlayer();
    }

    const originalCode = roomCode;

    getRoomDetails(roomCode).then((room) => {
      if (!active || roomCode !== originalCode) return;
      if (room && token) {
        connectSocket(token, roomCode.toUpperCase());
        const currentVideoId = usePlayerStore.getState().currentVideoId;
        if (room.currentVideo !== currentVideoId) {
          usePlayerStore.getState().initPlayer(roomCode.toUpperCase(), room.currentVideo);
        }
      }
    });

    return () => {
      active = false;
      // Preserve socket connection if global player is active and playing
      const playerState = usePlayerStore.getState();
      if (playerState.isClosed) {
        disconnectSocket();
        clearRoomState();
      } else {
        playerState.setIsMiniPlayer(true);
      }
    };
  }, [roomCode, token, getRoomDetails, connectSocket, disconnectSocket, clearRoomState]);

  if (roomLoading && !currentRoom) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-youtube-red" />
          <p className="text-slate-400 font-medium animate-pulse text-sm">Entering party room...</p>
        </div>
      </div>
    );
  }

  if (roomError || !currentRoom) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="text-youtube-red border border-youtube-red/20 bg-youtube-red/10 p-5 rounded-full mb-6">
            <ArrowLeft size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Room Error</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            {roomError || 'The room you are looking for does not exist or has been dissolved.'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-slate-800 hover:bg-slate-750 text-white font-bold py-3 px-6 rounded-2xl border border-slate-700/60 flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col overflow-x-hidden">
      <Navbar />

      <main className="flex-1 p-3 md:p-6 max-w-7xl mx-auto w-full flex flex-col gap-2 md:gap-6 min-h-0 md:min-h-0 overflow-hidden md:overflow-visible">
        {/* On desktop: standard RoomHeader. On mobile: hidden */}
        {!isMobile && <RoomHeader />}

        {/* On mobile: compact invitation code & stream actions bar */}
        {isMobile && (
          <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-950/45 border border-slate-800/80 rounded-2xl shrink-0 font-sans shadow-inner">
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-750/70 px-3 py-2 rounded-xl font-mono text-xs font-bold text-youtube-red">
              <span>{currentRoom.roomCode}</span>
              <button
                onClick={handleCopyCode}
                className="text-slate-400 hover:text-white transition-colors duration-150 p-1 cursor-pointer"
                title="Copy Room Code"
              >
                {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsHeaderOpen(true)}
                className="flex items-center gap-1.5 bg-youtube-red hover:bg-youtube-hover text-white text-xs font-bold min-h-[36px] px-3.5 rounded-xl transition cursor-pointer shadow-md shadow-youtube-red/10"
              >
                <Tv size={13} />
                <span>{isHost ? 'Stream' : 'Request'}</span>
              </button>
              
              <button
                onClick={() => {
                  usePlayerStore.getState().resetPlayer();
                  disconnectSocket();
                  clearRoomState();
                  navigate('/dashboard');
                }}
                className="flex items-center justify-center min-h-[36px] min-w-[36px] bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl transition border border-slate-800 cursor-pointer"
                title="Exit Party"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Toolbar with Room Title and Actions (Desktop only) */}
        {!isMobile && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Tv className="text-youtube-red" size={20} />
              Watch Party
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden md:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 py-1.5 px-3.5 rounded-xl text-xs font-bold transition shadow hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                {isSidebarOpen ? 'Cinema Mode (Hide Chat)' : 'Show Sidebar (Chat & Queue)'}
              </button>
              <button
                onClick={() => {
                  usePlayerStore.getState().resetPlayer();
                  disconnectSocket();
                  clearRoomState();
                  navigate('/dashboard');
                }}
                className="flex items-center gap-1.5 bg-youtube-red hover:bg-youtube-hover text-white py-1.5 px-3.5 rounded-xl text-xs font-bold transition shadow hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <LogOut size={13} />
                <span>Exit Party</span>
              </button>
            </div>
          </div>
        )}

        {/* Layout Grid (flows vertically on mobile, horizontally on desktop) */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch w-full flex-1 min-h-0">
          {/* Left Panel: Video Player */}
          <div className="flex-shrink-0 md:flex-1 min-w-0">
            <PlayerSlot />
          </div>

          {/* Right Panel / Sidebar (Tabbed widget visible on mobile, or on desktop when open) */}
          <div className={`w-full md:w-[320px] lg:w-[380px] shrink-0 flex-1 md:flex-initial flex flex-col gap-3 min-h-0 ${
            !isSidebarOpen ? 'md:hidden' : ''
          }`}>
            {/* Tab Bar Selector */}
            <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80 font-bold text-xs gap-1 shadow-inner shrink-0 font-sans">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2.5 min-h-[40px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'chat' 
                    ? 'bg-slate-800 text-white border border-slate-700/40 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare size={14} />
                <span>Chat</span>
                {mentionCount > 0 && activeTab !== 'chat' ? (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full flex items-center justify-center animate-pulse border border-slate-900 shadow">
                    @{mentionCount}
                  </span>
                ) : unreadCount > 0 && activeTab !== 'chat' ? (
                  <span className="absolute -top-1.5 -right-1.5 bg-youtube-red text-white font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900 shadow">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`flex-1 py-2.5 min-h-[40px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'queue' 
                    ? 'bg-slate-800 text-white border border-slate-700/40 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListVideo size={14} />
                <span>Queue</span>
              </button>
              <button
                onClick={() => setActiveTab('watchers')}
                className={`flex-1 py-2.5 min-h-[40px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'watchers' 
                    ? 'bg-slate-800 text-white border border-slate-700/40 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users size={14} />
                <span>People</span>
              </button>
            </div>

            {/* Tab Panel Content */}
            <div className="flex-1 flex flex-col h-full min-h-0">
              {activeTab === 'chat' && <ChatBox />}
              {activeTab === 'queue' && <QueueList />}
              {activeTab === 'watchers' && <UserList />}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Stream Controller Drawer Modal */}
      <AnimatePresence>
        {isMobile && isHeaderOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 no-overscroll">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHeaderOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            {/* Content Drawer Card */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 pb-6 shadow-2xl relative z-10 pointer-events-auto safe-area-bottom"
            >
              {/* Drag Handle Bar */}
              <div 
                className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-4 cursor-pointer sm:hidden min-h-[4px]" 
                onClick={() => setIsHeaderOpen(false)} 
              />
              
              <div className="flex justify-between items-center mb-4 border-b border-slate-800/60 pb-3 select-none">
                <h3 className="font-bold text-white text-sm">
                  {isHost ? 'Stream Controls' : 'Suggest a Video'}
                </h3>
                <button 
                  onClick={() => setIsHeaderOpen(false)}
                  className="text-slate-400 hover:text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                  title="Close Controls"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Render RoomHeader inside */}
              <RoomHeader isModal={true} onClose={() => setIsHeaderOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Room;
