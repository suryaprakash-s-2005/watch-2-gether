import { forwardRef, Suspense } from 'react';
import ReactPlayer from 'react-player';
import { buildUrl } from './BasePlayer';

const PLAYER_CONFIG = {
  youtube: {
    playerVars: {
      autoplay: 1,
      playsinline: 1,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      cc_load_policy: 1,
      enablejsapi: 1,
      controls: 0,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    },
  },
};

const YouTubePlayer = forwardRef(({
  videoId,
  playing,
  volume,
  muted,
  playbackRate,
  onReady,
  onPlay,
  onPause,
  onEnded,
  onProgress,
  onDuration,
  onSeek,
  onError,
  config,
}, ref) => {
  const url = buildUrl(videoId, 'youtube');

  if (!url) return null;

  return (
    <Suspense fallback={null}>
      <ReactPlayer
        ref={ref}
        url={url}
        width="100%"
        height="100%"
        playing={playing}
        muted={muted}
        controls={false}
        volume={volume}
        playbackRate={playbackRate}
        onReady={onReady}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onProgress={onProgress}
        onDuration={onDuration}
        onSeek={onSeek}
        onError={onError}
        config={config || PLAYER_CONFIG}
      />
    </Suspense>
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';

export default YouTubePlayer;
