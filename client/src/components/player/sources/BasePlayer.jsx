const MATCH_YOUTUBE = /(?:youtu\.be\/|youtube(?:-nocookie|education)?\.com\/(?:embed\/|v\/|watch\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))((\w|-){11})/;
const MATCH_VIMEO = /vimeo\.com\/(\d+)/;
const MATCH_TWITCH = /(?:twitch\.tv\/(?:videos\/)?|clips\.twitch\.tv\/)(\w+)/;

export const detectSourceType = (url) => {
  if (!url) return null;
  if (MATCH_YOUTUBE.test(url)) return 'youtube';
  if (MATCH_VIMEO.test(url)) return 'vimeo';
  if (MATCH_TWITCH.test(url)) return 'twitch';
  return null;
};

export const extractId = (url, type) => {
  if (!url) return null;
  if (type === 'youtube') {
    const m = url.match(MATCH_YOUTUBE);
    return m ? m[1] : null;
  }
  if (type === 'vimeo') {
    const m = url.match(MATCH_VIMEO);
    return m ? m[1] : null;
  }
  if (type === 'twitch') {
    const m = url.match(MATCH_TWITCH);
    return m ? m[1] : null;
  }
  return null;
};

export const buildUrl = (id, type) => {
  if (!id || !type) return null;
  if (type === 'youtube') return `https://www.youtube.com/watch?v=${id}`;
  if (type === 'vimeo') return `https://vimeo.com/${id}`;
  if (type === 'twitch') return `https://www.twitch.tv/videos/${id}`;
  return null;
};
