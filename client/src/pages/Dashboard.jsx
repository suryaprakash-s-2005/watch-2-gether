import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useRoomStore from '../store/roomStore';
import Navbar from '../components/Navbar';
import { PlusCircle, LogIn, ArrowRight, Tv, RefreshCw, Users } from 'lucide-react';

const Dashboard = () => {
  const { createRoom, joinRoom, publicRooms, fetchPublicRooms, roomLoading, roomError } = useRoomStore();
  const navigate = useNavigate();
  
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // Fetch public watch rooms in lobby on mount
  useEffect(() => {
    fetchPublicRooms();
  }, [fetchPublicRooms]);

  const handleCreateRoom = async () => {
    const roomCode = await createRoom(isPublic);
    if (roomCode) {
      navigate(`/room/${roomCode}`);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setJoinError('');

    const formattedCode = code.trim().toUpperCase();

    if (!formattedCode) {
      setJoinError('Please enter a room code');
      return;
    }

    if (formattedCode.length !== 6) {
      setJoinError('Room codes are exactly 6 characters');
      return;
    }

    const roomCode = await joinRoom(formattedCode);
    if (roomCode) {
      navigate(`/room/${roomCode}`);
    } else {
      setJoinError('Room not found. Check the code and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Decorative blurred backgrounds */}
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-youtube-red/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <Navbar />

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 min-h-0">
        
        {/* Left Side: Create Room & Join Room Action Cards (col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6 shrink-0">
          
          {/* Room Error Banner */}
          {roomError && (
            <div className="p-4 rounded-2xl bg-youtube-red/10 border border-youtube-red/20 text-youtube-red text-center text-xs font-bold leading-relaxed">
              {roomError}
            </div>
          )}

          {/* Create Room Card */}
          <div className="glass-panel p-5 md:p-6 rounded-3xl border border-slate-800 hover:border-slate-750 transition duration-300">
            <h2 className="text-base md:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <PlusCircle className="text-youtube-red" size={18} />
              Create Watch Party
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Generate a unique watch room, invite friends, and coordinate a synchronized viewing session.
            </p>

            {/* Privacy toggle option */}
            <div className="flex items-center gap-3 bg-slate-950/20 border border-slate-800/80 p-3.5 rounded-2xl mb-4">
              <input
                type="checkbox"
                id="privacy-toggle"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded text-youtube-red focus:ring-youtube-red focus:ring-offset-slate-900 focus:ring-2 border-slate-800 bg-slate-950/40 cursor-pointer shrink-0"
              />
              <label htmlFor="privacy-toggle" className="text-left text-xs font-bold text-slate-300 cursor-pointer select-none">
                Make Party Public
                <span className="text-[10px] text-slate-500 font-normal font-sans block mt-0.5 leading-tight">
                  Allow anyone to discover and join this watch party from the lobby
                </span>
              </label>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={roomLoading}
              className="w-full bg-youtube-red hover:bg-youtube-hover text-white font-bold py-3 px-4 rounded-2xl transition shadow-lg shadow-youtube-red/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 min-h-[44px]"
            >
              {roomLoading ? 'Creating...' : 'Create Room'}
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Join Room by Code Card */}
          <div className="glass-panel p-5 md:p-6 rounded-3xl border border-slate-800 hover:border-slate-750 transition duration-300">
            <h2 className="text-base md:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <LogIn className="text-sky-400" size={18} />
              Join Room by Code
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Enter the 6-character room code shared by your friend to join their active party.
            </p>

            <form onSubmit={handleJoinRoom} className="space-y-3.5">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setJoinError('');
                  }}
                  placeholder="Enter Code (e.g. AB12CD)"
                  className="glass-input w-full px-4 py-2.5 rounded-2xl text-center font-mono text-base font-bold tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:font-normal focus:ring-2 focus:ring-youtube-red"
                  disabled={roomLoading}
                />
                {joinError && (
                  <p className="text-xs text-youtube-red font-semibold text-center mt-1.5">{joinError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={roomLoading || code.trim().length !== 6}
                className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700/60 hover:border-slate-650 text-white font-bold py-3 px-4 rounded-2xl transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-55 disabled:cursor-not-allowed min-h-[44px]"
              >
                Join Room
                <ArrowRight size={15} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Public Rooms Lobby List (col-span-7) */}
        <div className="lg:col-span-7 flex flex-col h-[550px] lg:h-[580px] min-h-[450px]">
          <div className="glass-panel p-5 md:p-6 rounded-3xl border border-slate-800 flex flex-col flex-1 overflow-hidden hover:border-slate-750 transition duration-300 h-full">
            
            {/* Lobby Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800/60 shrink-0">
              <div className="flex items-center gap-2">
                <Tv className="text-youtube-red animate-pulse" size={18} />
                <h2 className="text-base md:text-lg font-bold text-white">Public Parties</h2>
              </div>
              <button
                onClick={() => fetchPublicRooms()}
                disabled={roomLoading}
                className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer min-w-[32px] min-h-[32px]"
                title="Refresh Lobby"
              >
                <RefreshCw size={13} className={roomLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Public Rooms List */}
            {roomLoading && publicRooms.length === 0 ? (
              <div className="flex-1 flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-youtube-red"></div>
              </div>
            ) : publicRooms.length === 0 ? (
              <div className="text-slate-550 text-xs px-4 select-none h-full flex flex-col items-center justify-center text-center flex-1">
                <Tv className="text-slate-800 mb-2.5" size={40} />
                <p className="font-bold text-slate-400">No active public parties</p>
                <p className="text-[10px] text-slate-500 mt-1">Start a room and make it public to see it here!</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-2 min-h-0 max-h-full scrollbar-thin no-overscroll">
                {publicRooms.map((room) => (
                  <div 
                    key={room.roomCode} 
                    className="flex items-center justify-between p-3.5 bg-slate-900/50 rounded-2xl border border-slate-800 hover:border-slate-750 transition duration-200 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <img
                        src={room.hostId?.avatar || 'https://via.placeholder.com/150'}
                        alt={room.hostId?.displayName || 'Host'}
                        className="w-10 h-10 rounded-full object-cover border border-slate-800 bg-slate-950 shrink-0"
                      />
                      <div className="min-w-0 text-left">
                        <h4 className="text-xs md:text-sm font-bold text-white group-hover:text-youtube-red transition-colors truncate">
                          {room.hostId?.displayName || 'Watch Party'}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                          <span>@{room.hostId?.username || 'host'}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-sky-400 font-bold flex items-center gap-0.5">
                            <Users size={10} /> {room.users?.length || 0} watching
                          </span>
                        </p>
                        {room.currentVideoTitle && (
                          <p className="text-[9px] text-slate-500 truncate mt-1.5 italic leading-none font-medium">
                            Playing: {room.currentVideoTitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/room/${room.roomCode}`)}
                      className="bg-youtube-red hover:bg-youtube-hover text-white text-[10px] font-bold px-3 py-2 rounded-xl transition cursor-pointer shadow-md shadow-youtube-red/10 shrink-0 ml-2"
                    >
                      Join Party
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
      </main>
    </div>
  );
};

export default Dashboard;
