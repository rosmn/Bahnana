// Main App Component

import { useState, useCallback } from 'react';
import { useSkinBrowser } from './hooks/useSkinBrowser';
import { Header } from './components/Header';
import { ChampionView } from './components/ChampionView';
import { SkinView } from './components/SkinView';
import { ChromaSelector } from './components/ChromaSelector';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ErrorContainer } from './components/ErrorContainer';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';
import { getDDragonChampionId } from './api';
import './App.css';

function App() {
  const {
    champions,
    filteredChampions,
    selectedChampion,
    skinLines,
    isLoading,
    error,
    searchQuery,
    toast,
    chromaSelector,
    setSearchQuery,
    selectChampion,
    showChampionView,
    downloadSkin,
    showChromaSelector,
    closeChromaSelector,
    dismissToast,
    retry,
  } = useSkinBrowser();

  const [toastKey, setToastKey] = useState(0);

  const handleDownloadSkin = useCallback(async (skinId: string, skinName: string) => {
    await downloadSkin(skinId, skinName);
    setToastKey(k => k + 1);
  }, [downloadSkin]);

  const handleChromaSelect = useCallback(async (chroma: any) => {
    await handleDownloadSkin(chroma.id.toString(), chroma.name);
  }, [handleDownloadSkin]);

  const handleShowChromaSelector = useCallback((baseSkin: any, chromas: any[]) => {
    const ddragonId = selectedChampion ? getDDragonChampionId(selectedChampion.name) : '';
    showChromaSelector(baseSkin, chromas, ddragonId);
  }, [showChromaSelector, selectedChampion]);

  const handleChromaSelectorSelect = useCallback((skinId: number, skinName: string) => {
    handleDownloadSkin(skinId.toString(), skinName);
  }, [handleDownloadSkin]);

  return (
    <div className="app-container">
      <Header
        championCount={champions.length}
        skinCount={champions.reduce((sum, c) => sum + c.skins.length, 0)}
      />

      <LoadingOverlay isVisible={isLoading} />
      <ErrorContainer isVisible={!!error} message={error || ''} onRetry={retry} />

      <main className="app-main">
        {!selectedChampion && (
          <ChampionView
            champions={filteredChampions}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onChampionSelect={selectChampion}
            onSearchFocus={() => {}}
          />
        )}

        {selectedChampion && (
          <SkinView
            champion={selectedChampion}
            skinLines={skinLines}
            onBack={showChampionView}
            onSkinSelect={handleDownloadSkin}
            onChromaSelect={handleChromaSelect}
            onShowChromaSelector={handleShowChromaSelector}
          />
        )}
      </main>

      <div className="toast-container" aria-live="polite">
        {toast && (
          <Toast
            key={toastKey}
            message={toast.message}
            type={toast.type}
            onClose={dismissToast}
          />
        )}
      </div>

      {chromaSelector && (
        <ChromaSelector
          isOpen={true}
          baseSkin={chromaSelector.baseSkin}
          chromas={chromaSelector.chromas}
          ddragonChampionId={chromaSelector.ddragonChampionId}
          onClose={closeChromaSelector}
          onSelectSkin={handleChromaSelectorSelect}
        />
      )}

      <Footer />
    </div>
  );
}

export default App;