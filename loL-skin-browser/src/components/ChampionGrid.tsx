// Champion Grid Component

import './ChampionGrid.css';
import type { Champion } from '../types';
import { getDDragonChampionId, getDDragonVersion, escapeHtml } from '../api';

interface ChampionGridProps {
  champions: Champion[];
  onChampionSelect: (championId: number) => void;
}

export function ChampionGrid({ champions, onChampionSelect }: ChampionGridProps) {
  const ddragonVersion = getDDragonVersion();

  const handleKeyDown = (e: React.KeyboardEvent, championId: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChampionSelect(championId);
    }
  };

  return (
    <div className="champion-grid" role="list" aria-label="Champions">
      {champions.map(champ => {
        const ddragonId = getDDragonChampionId(champ.name);
        const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${ddragonId}.png`;

        return (
          <div
            key={champ.id}
            className="champion-card"
            role="listitem"
            tabIndex={0}
            onClick={() => onChampionSelect(champ.id)}
            onKeyDown={(e) => handleKeyDown(e, champ.id)}
            aria-label={`${champ.name}, ${champ.skins.length} skins`}
          >
            <img
              className="champion-card-icon"
              src={iconUrl}
              alt={escapeHtml(champ.name)}
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="champion-card-name">{escapeHtml(champ.name)}</div>
            <div className="champion-card-skin-count">{champ.skins.length} skins</div>
          </div>
        );
      })}
    </div>
  );
}