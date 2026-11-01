// Champion View Component

import './ChampionView.css';
import { SearchBar } from './SearchBar';
import { ChampionGrid } from './ChampionGrid';
import type { Champion } from '../types';

interface ChampionViewProps {
  champions: Champion[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onChampionSelect: (championId: number) => void;
  ddragonVersion: string;
  onSearchFocus: () => void;
}

export function ChampionView({
  champions,
  searchQuery,
  onSearchChange,
  onChampionSelect,
  ddragonVersion,
  onSearchFocus
}: ChampionViewProps) {
  return (
    <section className="view champion-view" aria-label="Champion selection">
      <div className="view-header">
        <h2 className="view-title">Select a Champion</h2>
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          onFocus={onSearchFocus}
        />
      </div>
      <ChampionGrid
        champions={champions}
        onChampionSelect={onChampionSelect}
        ddragonVersion={ddragonVersion}
      />
    </section>
  );
}