import { useEffect, useState } from 'react';
import PlayerContainer from './player/PlayerContainer';
import PlayerProvider from './player/PlayerProvider';
import usePlayerStore from '../store/playerStore';

const Layout = ({ children }) => {
  const isMiniPlayer = usePlayerStore((state) => state.isMiniPlayer);
  const isClosed = usePlayerStore((state) => state.isClosed);
  const currentVideoId = usePlayerStore((state) => state.currentVideoId);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);

  useEffect(() => {
    const handleResize = () => { setIsMobile(window.innerWidth < 640); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasActiveMiniPlayerOnMobile = isMobile && isMiniPlayer && !isClosed && currentVideoId;

  return (
    <PlayerProvider>
      <div className={`flex flex-col min-h-dvh transition-all duration-200 ${hasActiveMiniPlayerOnMobile ? 'pb-[136px] safe-area-bottom' : ''}`}>
        {children}
      </div>
      <PlayerContainer />
    </PlayerProvider>
  );
};

export default Layout;
