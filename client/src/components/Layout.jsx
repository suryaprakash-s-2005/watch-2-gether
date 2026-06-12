import GlobalMiniPlayer from './player/GlobalMiniPlayer';
import PlayerProvider from './player/PlayerProvider';

const Layout = ({ children }) => {
  return (
    <PlayerProvider>
      {children}
      <GlobalMiniPlayer />
    </PlayerProvider>
  );
};

export default Layout;
