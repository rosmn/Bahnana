// Skin Card Component

import './SkinCard.css';
import type { EnhancedSkin } from '../types';
import { escapeHtml } from '../api';

interface SkinCardProps {
  skin: EnhancedSkin;
  ddragonChampionId: string;
  chromas: EnhancedSkin[];
  isBaseSkin: boolean;
  onClick: () => void;
  onChromaClick: (chroma: EnhancedSkin) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function SkinCard({
  skin,
  ddragonChampionId,
  chromas,
  isBaseSkin,
  onClick,
  onChromaClick,
  onKeyDown
}: SkinCardProps) {
  const splashNum = skin.splashNum !== undefined ? skin.splashNum : (skin.id % 1000);
  const splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${ddragonChampionId}_${splashNum}.jpg`;

  const fallbackSvg = `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 112%22%3E%3Crect fill=%22%232a2a4a%22 width=%22200%22 height=%22112%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2212%22%3ENo Preview%3C/text%3E%3C/svg%3E`;

  return (
    <div
      className="skin-card"
      role="listitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={`${skin.name}${chromas.length > 0 ? `, ${chromas.length} chromas available` : ''}`}
    >
      <div className="skin-card-image-wrapper">
        <img
          className="skin-card-image"
          src={splashUrl}
          alt={escapeHtml(skin.name)}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = fallbackSvg; }}
        />
        {chromas.length > 0 && (
          <div className="skin-chromas">
            {chromas.map((c, idx) => (
              <span
                key={idx}
                className="chroma-dot"
                style={{ background: c.color }}
                title={escapeHtml(c.chromaName || '')}
                onClick={(e) => {
                  e.stopPropagation();
                  onChromaClick(c);
                }}
              />
            ))}
          </div>
        )}
        {isBaseSkin && chromas.length > 0 && (
          <span className="skin-base-badge">Base</span>
        )}
      </div>
      <div className="skin-card-name">{escapeHtml(skin.name)}</div>
      <div className="skin-card-id">ID: {skin.id}</div>
    </div>
  );
}