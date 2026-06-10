import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import { Play, LogOut, User, Users, Trophy, BarChart2, Tv, Sun, Moon, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

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

  const profileUsername = user?.username || user?.name?.toLowerCase().replace(/\s+/g, '') || '';

  const navItems = [
    { path: '/dashboard', label: 'Rooms', icon: Tv, title: 'Rooms Dashboard' },
    { path: '/friends', label: 'Friends', icon: Users, title: 'Friends Social Graph', exactPrefix: '/friends', exclude: '/friends/top' },
    { path: '/friends/top', label: 'Leaderboard', icon: Trophy, title: 'Top Leaderboards' },
    { path: '/analytics', label: 'Analytics', icon: BarChart2, title: 'Playback Stats' },
  ];

  const isActive = (item) => {
    if (item.exclude && location.pathname === item.exclude) return false;
    if (item.exactPrefix) return location.pathname.startsWith(item.exactPrefix);
    return location.pathname === item.path;
  };

  const handleNavClick = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-slate-800 gap-4">
      {/* Logo */}
      <div 
        className="flex items-center gap-2 cursor-pointer group shrink-0"
        onClick={() => {
          navigate(isAuthenticated ? '/dashboard' : '/');
          setIsMobileMenuOpen(false);
        }}
      >
        <div className="bg-youtube-red p-2 rounded-lg text-white group-hover:scale-105 transition-transform duration-200 shadow-lg shadow-youtube-red/20">
          <Play size={18} fill="currentColor" />
        </div>
        <span className="logo-gradient text-xl font-bold tracking-tight bg-clip-text text-transparent">
          Watch-2-Gether
        </span>
      </div>

      {/* Desktop Navigation Links */}
      {isAuthenticated && (
        <div className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 text-xs font-bold">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button 
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  isActive(item) ? 'bg-slate-800 text-white border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'
                }`}
                title={item.title}
              >
                <Icon size={13} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Desktop Actions (Profile, Theme, Logout) */}
      <div className="hidden md:flex items-center gap-3">
        {isAuthenticated && user ? (
          <>
            <button 
              onClick={toggleTheme}
              className="p-1.5 rounded-full bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/50 transition cursor-pointer flex items-center justify-center shrink-0 w-7 h-7"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            
            <div 
              onClick={() => navigate(`/profile/${profileUsername}`)}
              className="flex items-center gap-2 bg-slate-800/40 hover:bg-slate-800/80 py-1.5 px-3 rounded-full border border-slate-700/50 cursor-pointer hover:border-slate-600 transition"
              title="View Profile"
            >
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-7 h-7 rounded-full object-cover border border-slate-600"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white border border-slate-600">
                  <User size={14} />
                </div>
              )}
              <span className="text-xs font-semibold text-slate-200">
                {user.displayName || user.name}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-slate-400 hover:text-youtube-red transition-colors duration-200 text-xs font-medium bg-slate-850 hover:bg-slate-800 py-1.5 px-3 rounded-xl border border-slate-800 hover:border-youtube-red/10 cursor-pointer"
              title="Log Out"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <button 
            onClick={toggleTheme}
            className="p-1.5 rounded-full bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/50 transition cursor-pointer flex items-center justify-center shrink-0 w-7 h-7"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        )}
      </div>

      {/* Mobile Actions Container (Theme Switcher and Hamburger Menu) */}
      <div className="flex md:hidden items-center gap-2">
        <button 
          onClick={toggleTheme}
          className="p-1.5 rounded-full bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/50 transition cursor-pointer flex items-center justify-center shrink-0 w-7 h-7"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {isAuthenticated && (
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-800/40 text-slate-300 hover:text-white border border-slate-700/50 cursor-pointer flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="absolute top-full left-0 right-0 w-full bg-slate-950/95 border-b border-slate-800 backdrop-blur-lg flex flex-col p-5 gap-3.5 z-40 shadow-2xl overflow-hidden md:hidden"
          >
            {/* Nav Items */}
            <div className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition border cursor-pointer ${
                      active 
                        ? 'bg-youtube-red/10 text-youtube-red border-youtube-red/20' 
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900/30 border-slate-850'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <hr className="border-slate-800/80 my-1" />

            {/* Profile & Logout section in mobile drawer */}
            {user && (
              <div className="flex flex-col gap-3">
                <div 
                  onClick={() => handleNavClick(`/profile/${profileUsername}`)}
                  className="flex items-center gap-3 bg-slate-900/50 hover:bg-slate-900 border border-slate-850 p-3 rounded-2xl cursor-pointer transition"
                >
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-9 h-9 rounded-full object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white border border-slate-700">
                      <User size={16} />
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-200">
                      {user.displayName || user.name}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-550">
                      @{user.username || 'user'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 text-slate-400 hover:text-white bg-youtube-red/10 hover:bg-youtube-red text-xs font-bold py-3 px-4 rounded-xl border border-youtube-red/20 transition cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
