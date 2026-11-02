// League of Legends Skin Browser - Custom Hooks (Tauri API)

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Champion, Skin, EnhancedSkin, SkinCatalog } from '../types';
import { groupSkinsByLine } from '../api';
import { fetchSkinCatalog, downloadSkin as tauriDownloadSkin, applySkin, removeSkin } from '../tauriApi';

interface UseSkinBrowserReturn {
  // State
  champions: Champion[];
  filteredChampions: Champion[];
  selectedChampion: Champion | null;
  skinLines: { baseName: string; baseSkin: EnhancedSkin | null; chromas: EnhancedSkin[] }[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;
  chromaSelector: { baseSkin: EnhancedSkin; chromas: EnhancedSkin[]; ddragonChampionId: string } | null;

  // Actions
  setSearchQuery: (query: string) => void;
  selectChampion: (championId: number) => void;
  showChampionView: () => void;
  downloadSkin: (skinId: string, skinName: string) => Promise<void>;
  applySkin: (skinId: string) => Promise<void>;
  removeSkin: (skinId: string) => Promise<void>;
  refreshCatalog: () => Promise<void>;
  showChromaSelector: (baseSkin: EnhancedSkin, chromas: EnhancedSkin[], ddragonChampionId: string) => void;
  closeChromaSelector: () => void;
  dismissToast: () => void;
  retry: () => void;
}

export function useSkinBrowser(): UseSkinBrowserReturn {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [filteredChampions, setFilteredChampions] = useState<Champion[]>([]);
  const [selectedChampion, setSelectedChampion] = useState<Champion | null>(null);
  const [skinLines, setSkinLines] = useState<{ baseName: string; baseSkin: EnhancedSkin | null; chromas: EnhancedSkin[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [chromaSelector, setChromaSelector] = useState<{ baseSkin: EnhancedSkin; chromas: EnhancedSkin[]; ddragonChampionId: string } | null>(null);
  const allSkinDataRef = useRef<Record<string, string>>({});
  const catalogRef = useRef<SkinCatalog | null>(null);

  // Initialize data from Tauri backend
  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch skin catalog from Tauri backend (which uses Data Dragon)
        const catalog = await fetchSkinCatalog();
        if (!isMounted) return;

        catalogRef.current = catalog;

        // Build champion list from catalog
        const championList = buildChampionListFromCatalog(catalog);
        setChampions(championList);
        setFilteredChampions(championList);

        setIsLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // Build champion list from catalog
  function buildChampionListFromCatalog(catalog: SkinCatalog): Champion[] {
    const championMap = new Map<number, Champion>();

    // Sort champions by key (numeric)
    const sortedChampions = Object.entries(catalog.champions)
      .sort((a, b) => parseInt(a[1].key, 10) - parseInt(b[1].key, 10));

    for (const [, championEntry] of sortedChampions) {
      const championId = parseInt(championEntry.key, 10);

      const skins: Skin[] = championEntry.skins.map(skinId => {
        const skinMeta = catalog.skins[skinId];
        if (skinMeta) {
          return {
            id: parseInt(skinId, 10),
            name: skinMeta.name,
          };
        }
        return {
          id: parseInt(skinId, 10),
          name: skinId,
        };
      });

      championMap.set(championId, {
        id: championId,
        name: championEntry.name,
        skins: skins.sort((a, b) => a.id - b.id),
      });
    }

    return Array.from(championMap.values()).sort((a, b) => a.id - b.id);
  }

  // Filter champions based on search query
  useEffect(() => {
    const filtered = champions.filter(champ =>
      champ.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredChampions(filtered);
  }, [searchQuery, champions]);

  // Show toast notification
  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const setSearchQueryWrapper = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const selectChampion = useCallback((championId: number) => {
    const champ = champions.find(c => c.id === championId);
    if (!champ) return;

    setSelectedChampion(champ);

    // Build allSkinData from catalog for this champion
    const catalog = catalogRef.current;
    if (catalog) {
      const skinData: Record<string, string> = {};
      champ.skins.forEach(skin => {
        skinData[skin.id.toString()] = skin.name;
      });
      allSkinDataRef.current = skinData;

      const lines = groupSkinsByLine(champ.skins, skinData, {});
      setSkinLines(lines);
    }
  }, [champions]);

  const showChampionView = useCallback(() => {
    setSelectedChampion(null);
    setSearchQuery('');
  }, []);

  const downloadSkin = useCallback(async (skinId: string, skinName: string) => {
    showToast(`Downloading ${skinName}...`, 'info');

    try {
      const downloaded = await tauriDownloadSkin({ skinId });
      showToast(`Downloaded ${downloaded.skin_name} (${downloaded.zip_path})`, 'success');
    } catch (err) {
      showToast(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  }, [showToast]);

  const applySkinAction = useCallback(async (skinId: string) => {
    showToast(`Applying skin...`, 'info');

    try {
      await applySkin({ skinId });
      showToast('Skin applied successfully!', 'success');
    } catch (err) {
      showToast(`Apply failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  }, [showToast]);

  const removeSkinAction = useCallback(async (skinId: string) => {
    showToast(`Removing skin...`, 'info');

    try {
      await removeSkin({ skinId });
      showToast('Skin removed successfully!', 'success');
    } catch (err) {
      showToast(`Remove failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  }, [showToast]);

  const refreshCatalog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const catalog = await fetchSkinCatalog();
      catalogRef.current = catalog;

      const championList = buildChampionListFromCatalog(catalog);
      setChampions(championList);
      setFilteredChampions(championList);

      showToast('Catalog refreshed!', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      showToast(`Refresh failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const showChromaSelector = useCallback((baseSkin: EnhancedSkin, chromas: EnhancedSkin[], ddragonChampionId: string) => {
    setChromaSelector({ baseSkin, chromas, ddragonChampionId });
  }, []);

  const closeChromaSelector = useCallback(() => {
    setChromaSelector(null);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    // Re-run initialization
    init();
  }, []);

  // Expose init for retry
  const init = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const catalog = await fetchSkinCatalog();
      if (!catalog) throw new Error('Failed to fetch catalog');

      catalogRef.current = catalog;
      const championList = buildChampionListFromCatalog(catalog);
      setChampions(championList);
      setFilteredChampions(championList);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  }, []);

  return {
    champions,
    filteredChampions,
    selectedChampion,
    skinLines,
    isLoading,
    error,
    searchQuery,
    toast,
    chromaSelector,
    setSearchQuery: setSearchQueryWrapper,
    selectChampion,
    showChampionView,
    downloadSkin,
    applySkin: applySkinAction,
    removeSkin: removeSkinAction,
    refreshCatalog,
    showChromaSelector,
    closeChromaSelector,
    dismissToast,
    retry,
  };
}