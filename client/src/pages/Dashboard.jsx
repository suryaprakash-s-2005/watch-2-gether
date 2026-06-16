import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useRoomStore from '../store/roomStore';
import Navbar from '../components/Navbar';
import { PlusCircle, LogIn, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const { createRoom, joinRoom, roomLoading, roomError } = useRoomStore();
  const navigate = useNavigate();
  
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleCreateRoom = async () => {
    const roomCode = await createRoom();
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 max-w-4xl mx-auto w-full">
        {/* Title */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="title-gradient text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent">
            Welcome to Watch-2-Gether
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed px-2">
            Create a party or paste an invitation code from a friend to start watching YouTube synchronized in real-time.
          </p>
        </div>

        {roomError && (
          <div className="mb-6 md:mb-8 w-full max-w-2xl p-4 rounded-xl bg-youtube-red/10 border border-youtube-red/20 text-youtube-red text-center text-xs font-bold leading-relaxed">
            {roomError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full max-w-2xl">
          {/* Create Room Card */}
          <div className="glass-panel p-5 md:p-8 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700/50 transition-all duration-300">
            <div>
              <div className="bg-youtube-red/10 border border-youtube-red/20 p-2.5 md:p-3 rounded-2xl text-youtube-red w-fit mb-4 md:mb-6">
                <PlusCircle size={20} />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Create Party</h2>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-4 md:mb-6">
                Generate a unique room code, invite your friends, and host the movie night. Only you can control playback.
              </p>
            </div>
            <button
              onClick={handleCreateRoom}
              disabled={roomLoading}
              className="w-full bg-youtube-red hover:bg-youtube-hover text-white font-bold py-3.5 md:py-3.5 px-4 rounded-2xl transition-all duration-200 shadow-lg shadow-youtube-red/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 min-h-[48px]"
            >
              {roomLoading ? 'Creating...' : 'Create Room'}
              <ArrowRight size={16} />
            </button>
          </div>

          {}
          <div className="glass-panel p-5 md:p-8 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700/50 transition-all duration-300">
            <div>
              <div className="bg-slate-800/60 border border-slate-700/50 p-2.5 md:p-3 rounded-2xl text-slate-400 w-fit mb-4 md:mb-6">
                <LogIn size={20} />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Join Party</h2>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-4 md:mb-6">
                Enter the 6-character room code shared by your friend to join their active synchronized watch party.
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-3 md:space-y-4">
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
                  className="glass-input w-full px-4 py-3.5 md:py-3.5 rounded-2xl text-center font-mono text-base md:text-lg font-bold tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:font-normal focus:ring-2 focus:ring-youtube-red"
                  disabled={roomLoading}
                />
                {joinError && (
                  <p className="text-xs text-youtube-red font-semibold text-center mt-1.5">{joinError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={roomLoading || code.trim().length !== 6}
                className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700/60 hover:border-slate-650 text-white font-bold py-3.5 md:py-3.5 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-55 disabled:cursor-not-allowed min-h-[48px]"
              >
                Join Room
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
