import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Play, LogIn, User, Sun, Moon } from 'lucide-react';

const Login = () => {
  const { devLogin, setToken, isAuthenticated, error } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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

  
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setToken(token).then(() => {
        navigate('/dashboard');
      });
    } else if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [searchParams, isAuthenticated, setToken, navigate]);

  
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError === 'auth_failed') {
      setErrorMessage('Google Sign-In authentication failed. Please try again.');
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${backendUrl}/auth/google`;
  };

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!nickname.trim()) {
      setErrorMessage('A username is required to connect.');
      return;
    }

    if (nickname.length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }

    setGuestLoading(true);
    const success = await devLogin(nickname.trim());
    setGuestLoading(false);

    if (success) {
      navigate('/dashboard');
    } else {
      setErrorMessage(error || 'Failed to sign in as Guest');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {}
      <div className="absolute top-5 right-6 z-20">
        <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-center justify-center shrink-0 w-9 h-9"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      {}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-youtube-red/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand logo */}
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="bg-youtube-red p-3.5 rounded-2xl text-white shadow-lg shadow-youtube-red/20 mb-2">
            <Play size={24} fill="currentColor" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Watch-2-Gether
          </h2>
          <p className="text-slate-450 text-sm">
            Watch YouTube Together, Anywhere.
          </p>
        </div>

        {/* Login panel card */}
        <div className="glass-panel rounded-3xl p-8 border border-slate-800/80 shadow-2xl">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-youtube-red/15 border border-youtube-red/25 text-youtube-red text-xs font-bold leading-relaxed">
              {errorMessage}
            </div>
          )}

          {}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-4 rounded-2xl transition-all duration-200 shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.88-1.57 2.62v2.54h2.54c1.48-1.36 2.33-3.37 2.33-5.63z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.07-2.38c-.85.57-1.95.91-3.2 1.34c-3.14 0-5.8-2.12-6.75-4.97H1.54v2.46C3.52 21.5 7.48 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.25 15.08c-.24-.7-.38-1.45-.38-2.22s.14-1.52.38-2.22V7.18H1.54C.56 9.15 0 11.3 0 12.86s.56 3.71 1.54 5.68l3.71-2.46z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0C7.48 0 3.52 2.5 1.54 6.44l3.71 2.88c.95-2.85 3.61-4.57 6.75-4.57z"
              />
            </svg>
            Sign in with Google
          </button>

          {}
          <div className="relative flex py-6 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              Or Use Guest Access
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {}
          <form onSubmit={handleGuestSubmit} className="space-y-4">
            <div>
              <label htmlFor="nickname" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Nickname / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User size={15} />
                </div>
                <input
                  type="text"
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter a nickname / username (e.g. VibePilot)"
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm focus:ring-2 focus:ring-youtube-red"
                  disabled={guestLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={guestLoading}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-750 border border-slate-700/50 text-white font-bold py-3.5 px-4 rounded-2xl transition-all duration-200 disabled:opacity-55 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
            >
              {guestLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <LogIn size={15} />
                  Connect Guest Session
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
