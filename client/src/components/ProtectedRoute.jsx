import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, token, isLoading, getMe } = useAuthStore();

  useEffect(() => {
    if (token && !isAuthenticated) {
      getMe();
    }
  }, [token, isAuthenticated, getMe]);

  if (token && isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-youtube-red border-t-transparent"></div>
          <p className="text-slate-400 animate-pulse text-sm">Resuming session...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
