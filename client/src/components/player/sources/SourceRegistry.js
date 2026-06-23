import YouTubePlayer from './YouTubePlayer';

const registry = new Map();

registry.set('youtube', YouTubePlayer);

export const registerSource = (type, Component) => {
  registry.set(type, Component);
};

export const getPlayerComponent = (type) => {
  return registry.get(type) || null;
};

export const getRegisteredTypes = () => {
  return Array.from(registry.keys());
};

export default registry;
