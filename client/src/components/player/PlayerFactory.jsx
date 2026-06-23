import { createElement, forwardRef } from 'react';
import { getPlayerComponent } from './sources/SourceRegistry';

const PlayerFactory = forwardRef(({ sourceType, ...props }, ref) => {
  const Player = getPlayerComponent(sourceType);
  if (!Player) return null;
  return createElement(Player, { ...props, ref });
});

PlayerFactory.displayName = 'PlayerFactory';

export default PlayerFactory;
