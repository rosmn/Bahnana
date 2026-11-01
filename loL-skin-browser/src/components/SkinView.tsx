// Skin View Component

import './SkinView.css';
import { SkinCarousel } from './SkinCarousel';
import type { Champion, EnhancedSkin } from '../types';
import { getDDragonChampionId, escapeHtml, generateColorFromString } from '../api';

interface SkinViewProps {
  champion: Champion;
  skinLines: { baseName: string; baseSkin: EnhancedSkin | null; chromas: EnhancedSkin[] }[];
  onBack: () => void;
  onSkinSelect: (skinId: number, skinName: string) => Promise<void>;
  onChromaSelect: (skinId: number, skinName: string) => Promise<void>;
  onShowChromaSelector: (baseSkin: EnhancedSkin | null, chromas: EnhancedSkin[]) => void;
  ddragonVersion: string;
}

export function SkinView({
  champion,
  skinLines,
  onBack,
  onSkinSelect,
  onChromaSelect,
  onShowChromaSelector,
  ddragonVersion
}: SkinViewProps) {
  const ddragonId = getDDragonChampionId(champion.name);
  const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${ddragonId}.png`;

  const totalSkins = skinLines.reduce(
    (sum, g) => sum + (g.baseSkin ? 1 : 0) + g.chromas.length,
    0
  );

  return (
    <section className="view skin-view" aria-label={`${champion.name} skins`}>
      <div className="view-header">
        <button className="btn btn-back" onClick={onBack} aria-label="Back to champions">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
        <div className="champion-info">
          <div className="champion-avatar">
            <img
              src={iconUrl}
              alt={escapeHtml(champion.name)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.textContent = champion.name.charAt(0);
                target.parentElement!.style.background = generateColorFromString(champion.name);
              }}
            />
          </div>
          <div className="champion-details">
            <h2 className="view-title">{escapeHtml(champion.name)}</h2>
            <p className="skin-count">{totalSkins} skins ({skinLines.length} skin lines)</p>
          </div>
        </div>
      </div>
      <SkinCarousel
        skinLines={skinLines}
        ddragonChampionId={ddragonId}
        selectedChampionName={champion.name}
        onScrollLeft={() => {
          const carousel = document.querySelector('.skin-carousel') as HTMLDivElement;
          if (carousel) carousel.scrollBy({ left: -300, behavior: 'smooth' });
        }}
        onScrollRight={() => {
          const carousel = document.querySelector('.skin-carousel') as HTMLDivElement;
          if (carousel) carousel.scrollBy({ left: 300, behavior: 'smooth' });
        }}
        onSkinSelect={(skin) => onSkinSelect(skin.id, skin.name)}
        onChromaSelect={(chroma) => onChromaSelect(chroma.id, chroma.name)}
        onShowChromaSelector={onShowChromaSelector}
      />
    </section>
  );
}