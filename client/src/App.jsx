import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Room from './pages/Room';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import TopFriends from './pages/TopFriends';
import Analytics from './pages/Analytics';

function App() {
  const { token, getMe } = useAuthStore();

  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  useEffect(() => {
    if (token) {
      getMe();
    }
  }, [token, getMe]);

  return (
    <BrowserRouter>
      <Routes>
        {}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        
        {}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/room/:roomCode" 
          element={
            <ProtectedRoute>
              <Room />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/profile/:username" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/friends" 
          element={
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/friends/top" 
          element={
            <ProtectedRoute>
              <TopFriends />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } 
        />

        {}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
