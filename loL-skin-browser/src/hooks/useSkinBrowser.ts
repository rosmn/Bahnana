// League of Legends Skin Browser - Custom Hooks

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Champion, Skin, EnhancedSkin, ChromaCache } from '../types';
import {
  loadDDragonVersion,
  loadDDragonChampions,
  loadSkinData,
  loadChromaInfo,
  buildChampionList,
  groupSkinsByLine,
  getDDragonChampionId,
  getDDragonVersion,
  getChromaInfoCache,
  findBaseSkinId,
} from '../api';

interface UseSkinBrowserReturn {
  // State
  champions: Champion[];
  filteredChampions: Champion[];
  selectedChampion: Champion | null;
  skinLines: { baseName: string; baseSkin: EnhancedSkin | null; chromas: EnhancedSkin[] }[];
  isLoading: boolean;
  error: string | null;
  ddragonVersion: string;
  searchQuery: string;
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;
  chromaSelector: { baseSkin: EnhancedSkin; chromas: EnhancedSkin[]; ddragonChampionId: string } | null;

  // Actions
  setSearchQuery: (query: string) => void;
  selectChampion: (championId: number) => void;
  showChampionView: () => void;
  downloadSkin: (skinId: number, skinName: string) => Promise<void>;
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
  const [ddragonVersion, setDdragonVersion] = useState('14.23.1');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [chromaSelector, setChromaSelector] = useState<{ baseSkin: EnhancedSkin; chromas: EnhancedSkin[]; ddragonChampionId: string } | null>(null);
  const currentDownloadRef = useRef<{ skinId: number; blobUrl: string; filename: string } | null>(null);
  const allSkinDataRef = useRef<Record<string, string>>({});

  // Initialize data
  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      setError(null);
      try {
        // Load DDragon version and champions in parallel
        await Promise.allSettled([
          loadDDragonVersion(),
          loadDDragonChampions()
        ]);

        if (!isMounted) return;

        // Load skin data (required)
        const skinData = await loadSkinData();
        allSkinDataRef.current = skinData;

        // Load chroma info (optional)
        loadChromaInfo().catch(() => {});

        // Build champion list
        const championList = buildChampionList(skinData);
        setChampions(championList);
        setFilteredChampions(championList);

        setDdragonVersion(getDDragonVersion());
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
    const lines = groupSkinsByLine(champ.skins, allSkinDataRef.current, getChromaInfoCache());
    setSkinLines(lines);
  }, [champions]);

  const showChampionView = useCallback(() => {
    setSelectedChampion(null);
    setSearchQuery('');
  }, []);

  const downloadSkin = useCallback(async (skinId: number, skinName: string) => {
    // Cleanup previous download
    if (currentDownloadRef.current) {
      URL.revokeObjectURL(currentDownloadRef.current.blobUrl);
      currentDownloadRef.current = null;
    }

    if (!selectedChampion) return;

    const championId = Math.floor(skinId / 1000);
    let url = `${import.meta.env.VITE_SKIN_FILE_BASE_URL || 'https://raw.githubusercontent.com/Alban1911/LeagueSkins/main/skins'}/${championId}/${skinId}/${skinId}.fantome`;

    showToast(`Downloading ${skinName}...`, 'info');

    try {
      let response = await fetch(url);

      if (response.status === 404) {
        const baseSkinId = findBaseSkinId(championId, skinId, champions);
        if (baseSkinId && baseSkinId !== skinId) {
          url = `${import.meta.env.VITE_SKIN_FILE_BASE_URL || 'https://raw.githubusercontent.com/Alban1911/LeagueSkins/main/skins'}/${championId}/${baseSkinId}/${skinId}/${skinId}.fantome`;
          response = await fetch(url);
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const filename = `${skinId}.fantome`;
      const blobUrl = URL.createObjectURL(blob);

      currentDownloadRef.current = { skinId, blobUrl, filename };
      triggerDownload(blob, filename);

      showToast(`Downloaded ${skinName} (${formatBytes(blob.size)})`, 'success');
    } catch (err) {
      showToast(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      if (currentDownloadRef.current) {
        URL.revokeObjectURL(currentDownloadRef.current.blobUrl);
        currentDownloadRef.current = null;
      }
    }
  }, [selectedChampion, champions, showToast]);

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

  // Helper functions
  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Expose init for retry
  const init = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.allSettled([
        loadDDragonVersion(),
        loadDDragonChampions()
      ]);

      const skinData = await loadSkinData();
      allSkinDataRef.current = skinData;

      loadChromaInfo().catch(() => {});

      const championList = buildChampionList(skinData);
      setChampions(championList);
      setFilteredChampions(championList);

      setDdragonVersion(getDDragonVersion());
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
    ddragonVersion,
    searchQuery,
    toast,
    chromaSelector,
    setSearchQuery: setSearchQueryWrapper,
    selectChampion,
    showChampionView,
    downloadSkin,
    showChromaSelector,
    closeChromaSelector,
    dismissToast,
    retry,
  };
}