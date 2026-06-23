import { createElement } from 'react';
import { getPlayerComponent } from './sources/SourceRegistry';

const PlayerFactory = ({ sourceType, ...props }) => {
  const Player = getPlayerComponent(sourceType);
  if (!Player) return null;
  return createElement(Player, props);
};

export default PlayerFactory;
