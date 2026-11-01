// Chroma Selector Modal Component

import './ChromaSelector.css';
import type { EnhancedSkin } from '../types';
import { escapeHtml } from '../api';
import { useEffect, useRef } from 'react';

interface ChromaSelectorProps {
  isOpen: boolean;
  baseSkin: EnhancedSkin;
  chromas: EnhancedSkin[];
  ddragonChampionId: string;
  onClose: () => void;
  onSelectSkin: (skinId: number, skinName: string) => void;
}

export function ChromaSelector({
  isOpen,
  baseSkin,
  chromas,
  ddragonChampionId,
  onClose,
  onSelectSkin
}: ChromaSelectorProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus trap
    const focusableElements = selectorRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleTab);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fallbackSvg = `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 112%22%3E%3Crect fill=%22%232a2a4a%22 width=%22200%22 height=%22112%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2212%22%3ENo Preview%3C/text%3E%3C/svg%3E`;

  const baseSplashNum = baseSkin.splashNum || (baseSkin.id % 1000);
  const baseSplashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${ddragonChampionId}_${baseSplashNum}.jpg`;

  return (
    <div
      ref={overlayRef}
      className="chroma-selector-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chroma-selector-title"
    >
      <div ref={selectorRef} className="chroma-selector">
        <div className="chroma-selector-header">
          <h3 id="chroma-selector-title">{escapeHtml(baseSkin.name)} - Chromas</h3>
          <button className="chroma-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="chroma-grid">
          <div className="chroma-option base" onClick={() => { onSelectSkin(baseSkin.id, baseSkin.name); onClose(); }}>
            <img
              src={baseSplashUrl}
              alt={escapeHtml(baseSkin.name)}
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).src = fallbackSvg; }}
            />
            <div className="chroma-option-info">
              <span className="chroma-option-name">{escapeHtml(baseSkin.name)}</span>
              <span className="chroma-option-id">ID: {baseSkin.id}</span>
            </div>
            <span className="chroma-badge">Base</span>
          </div>
          {chromas.map((c) => {
            const splashNum = c.splashNum || (c.id % 1000);
            const splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${ddragonChampionId}_${splashNum}.jpg`;

            return (
              <div
                key={c.id}
                className="chroma-option"
                style={{ borderColor: c.color }}
                onClick={() => { onSelectSkin(c.id, c.name); onClose(); }}
              >
                <img
                  src={splashUrl}
                  alt={escapeHtml(c.name)}
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = fallbackSvg; }}
                />
                <div className="chroma-option-info">
                  <span className="chroma-option-name">{escapeHtml(c.name)}</span>
                  <span className="chroma-option-id">ID: {c.id}</span>
                </div>
                {(c.colors && c.colors.length > 0) ? (
                  <div className="chroma-color-swatch" style={{
                    background: c.colors.length > 1
                      ? `linear-gradient(135deg, ${c.colors[0]} 0% 50%, ${c.colors[1]} 50% 100%)`
                      : c.colors[0]
                  }}></div>
                ) : (
                  <div className="chroma-color-swatch" style={{ background: c.color }}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}