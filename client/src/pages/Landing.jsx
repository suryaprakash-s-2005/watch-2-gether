import { useNavigate } from "react-router-dom";
import { useState } from "react";
import useAuthStore from "../store/authStore";
import { Play, Users, MessageSquare, ShieldAlert, Sun, Moon } from "lucide-react";

const Landing = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-youtube-red selection:text-white">
      {}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2">
          <div className="bg-youtube-red p-2 rounded-lg text-white">
            <Play size={16} fill="currentColor" />
          </div>
          <span className="logo-gradient text-lg font-bold tracking-tight bg-clip-text text-transparent">
            Watch-2-Gether
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-center shrink-0 w-9 h-9"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          
          <button
            onClick={handleCTA}
            className="bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs py-2.5 px-4.5 rounded-xl border border-slate-700 transition hover:scale-[1.01] cursor-pointer"
          >
            {isAuthenticated ? 'Dashboard' : 'Login'}
          </button>
        </div>
      </header>

      {}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center relative overflow-hidden">
        {}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-youtube-red/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50 mb-8 animate-fade-in shadow-inner">
            <span className="w-2 h-2 bg-youtube-red rounded-full animate-ping"></span>
            <span className="text-xs font-semibold text-slate-300">
              Beta Version Live
            </span>
          </div>

          <h1 className="title-gradient text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent leading-tight">
            Watch YouTube Together <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-youtube-red to-orange-500 bg-clip-text text-transparent">
              Anywhere, Real-Time.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Synchronize video playback, chat with friends, and host virtual
            party nights seamlessly. Fully synchronized player, instant
            messaging, and host controls.
          </p>

          <button
            onClick={handleCTA}
            className="group relative bg-youtube-red hover:bg-youtube-hover text-white font-extrabold text-lg px-10 py-5 rounded-2xl transition-all duration-300 shadow-xl shadow-youtube-red/25 hover:shadow-youtube-red/45 hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-3"
          >
            <Play size={20} fill="currentColor" />
            Start Watching Free
          </button>
        </div>

        {/* Feature Cards Grid */}
        <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 px-4 w-full">
          <div className="glass-panel p-8 rounded-3xl text-left border border-slate-850 hover:border-slate-700/40 transition-colors duration-300">
            <div className="bg-youtube-red/10 border border-youtube-red/20 p-3 rounded-2xl text-youtube-red w-fit mb-6">
              <Play size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-200 mb-2">
              Host Control
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Only the room creator controls player states (play, pause,
              seeking, track changes), preventing watch party interruptions.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl text-left border border-slate-850 hover:border-slate-700/40 transition-colors duration-300">
            <div className="bg-youtube-red/10 border border-youtube-red/20 p-3 rounded-2xl text-youtube-red w-fit mb-6">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-200 mb-2">
              Live Room Sync
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              New joiners are instantly synchronized to the current playback
              timestamps and play status of the room host.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl text-left border border-slate-850 hover:border-slate-700/40 transition-colors duration-300">
            <div className="bg-youtube-red/10 border border-youtube-red/20 p-3 rounded-2xl text-youtube-red w-fit mb-6">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-200 mb-2">
              Real-Time Chat
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Express reactions, chat, and discuss the stream with high-speed
              delivery backed by Socket.IO.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-slate-550 border-t border-slate-800/40">
        <p>© {currentYear} Watch-2-Gether. All rights reserved</p>
      </footer>
    </div>
  );
};

export default Landing;
