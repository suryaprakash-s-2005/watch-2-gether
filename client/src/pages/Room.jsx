import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useRoomStore from '../store/roomStore';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import useChatStore from '../store/chatStore';
import Navbar from '../components/Navbar';
import RoomHeader from '../components/RoomHeader';
import VideoPlayer from '../components/VideoPlayer';
import UserList from '../components/UserList';
import QueueList from '../components/QueueList';
import ChatBox from '../components/ChatBox';
import { ArrowLeft, RefreshCw, Tv, MessageSquare, ListVideo, Users, LogOut } from 'lucide-react';

const Room = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const { token } = useAuthStore();
  const { currentRoom, roomLoading, roomError, getRoomDetails, clearRoomState } = useRoomStore();
  const { connectSocket, disconnectSocket } = useSocketStore();
  const { unreadCount, mentionCount, setChatActive } = useChatStore();

  const [activeTab, setActiveTab] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Synchronize chat active state in store
  useEffect(() => {
    const isActive = isSidebarOpen && activeTab === 'chat';
    setChatActive(isActive);
  }, [isSidebarOpen, activeTab, setChatActive]);

  useEffect(() => {
    if (!roomCode) return;

    getRoomDetails(roomCode).then((room) => {
      if (room && token) {
        connectSocket(token, roomCode.toUpperCase());
      }
    });

    return () => {
      disconnectSocket();
      clearRoomState();
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Room Header (Code Copy & Video Pasting URL controls) */}
        <RoomHeader />

        {/* Toolbar with Room Title and Actions */}
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
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 bg-youtube-red hover:bg-youtube-hover text-white py-1.5 px-3.5 rounded-xl text-xs font-bold transition shadow hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <LogOut size={13} />
              <span>Exit Party</span>
            </button>
          </div>
        </div>

        {/* Responsive Layout Grid */}
        <div className="flex flex-col md:flex-row gap-6 items-stretch w-full">
          {/* Left Panel: Video Player */}
          <div className="flex-1 min-w-0">
            <VideoPlayer />
          </div>

          {/* Right Panel / Sidebar (Tabbed widget visible on mobile, or on desktop when open) */}
          <div className={`w-full md:w-[320px] lg:w-[380px] shrink-0 flex flex-col gap-4 ${
            !isSidebarOpen ? 'md:hidden' : ''
          }`}>
            {/* Tab Bar Selector */}
            <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 font-bold text-xs gap-1.5 shadow-inner shrink-0 font-sans">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'chat' 
                    ? 'bg-slate-800 text-white border border-slate-700/40 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare size={13} />
                <span>Chat</span>
                {mentionCount > 0 && activeTab !== 'chat' ? (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full flex items-center justify-center animate-pulse border border-slate-900 shadow">
                    @{mentionCount}
                  </span>
                ) : unreadCount > 0 && activeTab !== 'chat' ? (
                  <span className="absolute -top-1 -right-1 bg-youtube-red text-white font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900 shadow">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'queue' 
                    ? 'bg-slate-800 text-white border border-slate-700/40 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListVideo size={13} />
                <span>Queue</span>
              </button>
              <button
                onClick={() => setActiveTab('watchers')}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'watchers' 
                    ? 'bg-slate-800 text-white border border-slate-700/40 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users size={13} />
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
    </div>
  );
};

export default Room;
