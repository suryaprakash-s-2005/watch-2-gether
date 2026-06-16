import { useNavigate } from "react-router-dom";
import { useState } from "react";
import useAuthStore from "../store/authStore";
import { Play, Users, MessageSquare, Sun, Moon } from "lucide-react";

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
    <div className="min-h-dvh bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-youtube-red selection:text-white">
      {}
      <header className="w-full max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-5 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2">
          <div className="bg-youtube-red p-2 rounded-lg text-white">
            <Play size={16} fill="currentColor" />
          </div>
          <span className="logo-gradient text-base md:text-lg font-bold tracking-tight bg-clip-text text-transparent">
            Watch-2-Gether
          </span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px]"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
          <button
            onClick={handleCTA}
            className="bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs py-2.5 px-4 md:px-5 rounded-xl border border-slate-700 transition hover:scale-[1.01] cursor-pointer min-h-[44px]"
          >
            {isAuthenticated ? 'Dashboard' : 'Login'}
          </button>
        </div>
      </header>

      {}
      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-8 md:py-10 text-center relative overflow-hidden">
        {}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-youtube-red/10 rounded-full blur-[100px] md:blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-slate-800/60 border border-slate-700/50 mb-6 md:mb-8 animate-fade-in shadow-inner">
            <span className="w-1.5 md:w-2 h-1.5 md:h-2 bg-youtube-red rounded-full animate-ping"></span>
            <span className="text-[10px] md:text-xs font-semibold text-slate-300">
              Beta Version Live
            </span>
          </div>

          <h1 className="title-gradient text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-4 md:mb-6 bg-clip-text text-transparent leading-tight">
            Watch YouTube Together <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-youtube-red to-orange-500 bg-clip-text text-transparent">
              Anywhere, Real-Time.
            </span>
          </h1>

          <p className="text-sm sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed px-2">
            Synchronize video playback, chat with friends, and host virtual
            party nights seamlessly. Fully synchronized player, instant
            messaging, and host controls.
          </p>

          <button
            onClick={handleCTA}
            className="group relative bg-youtube-red hover:bg-youtube-hover text-white font-extrabold text-base md:text-lg px-8 md:px-10 py-4 md:py-5 rounded-2xl transition-all duration-300 shadow-xl shadow-youtube-red/25 hover:shadow-youtube-red/45 hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-3 min-h-[52px]"
          >
            <Play size={18} fill="currentColor" />
            Start Watching Free
          </button>
        </div>

        {/* Feature Cards Grid */}
        <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mt-16 md:mt-24 px-0 md:px-4 w-full">
          <div className="glass-panel p-5 md:p-8 rounded-3xl text-left border border-slate-850 hover:border-slate-700/40 transition-colors duration-300">
            <div className="bg-youtube-red/10 border border-youtube-red/20 p-2.5 md:p-3 rounded-2xl text-youtube-red w-fit mb-4 md:mb-6">
              <Play size={20} />
            </div>
            <h3 className="text-base md:text-xl font-bold text-slate-200 mb-1 md:mb-2">
              Host Control
            </h3>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              Only the room creator controls player states (play, pause,
              seeking, track changes), preventing watch party interruptions.
            </p>
          </div>

          <div className="glass-panel p-5 md:p-8 rounded-3xl text-left border border-slate-850 hover:border-slate-700/40 transition-colors duration-300">
            <div className="bg-youtube-red/10 border border-youtube-red/20 p-2.5 md:p-3 rounded-2xl text-youtube-red w-fit mb-4 md:mb-6">
              <Users size={20} />
            </div>
            <h3 className="text-base md:text-xl font-bold text-slate-200 mb-1 md:mb-2">
              Live Room Sync
            </h3>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              New joiners are instantly synchronized to the current playback
              timestamps and play status of the room host.
            </p>
          </div>

          <div className="glass-panel p-5 md:p-8 rounded-3xl text-left border border-slate-850 hover:border-slate-700/40 transition-colors duration-300">
            <div className="bg-youtube-red/10 border border-youtube-red/20 p-2.5 md:p-3 rounded-2xl text-youtube-red w-fit mb-4 md:mb-6">
              <MessageSquare size={20} />
            </div>
            <h3 className="text-base md:text-xl font-bold text-slate-200 mb-1 md:mb-2">
              Real-Time Chat
            </h3>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
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
