import { createElement, forwardRef } from 'react';
import { getPlayerComponent } from './sources/SourceRegistry';

const PlayerFactory = forwardRef(({ sourceType, ...props }, ref) => {
  const Player = getPlayerComponent(sourceType);
  if (!Player) return null;
  const key = `${props.videoId}`;
  return createElement(Player, { ...props, ref, key });
});

PlayerFactory.displayName = 'PlayerFactory';

export default PlayerFactory;
