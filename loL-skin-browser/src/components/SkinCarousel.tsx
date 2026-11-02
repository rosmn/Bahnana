// Skin Carousel Component

import './SkinCarousel.css';
import { SkinCard } from './SkinCard';
import type { EnhancedSkin } from '../types';
import { useRef, useEffect } from 'react';

interface SkinCarouselProps {
  skinLines: { baseName: string; baseSkin: EnhancedSkin | null; chromas: EnhancedSkin[] }[];
  ddragonChampionId: string;
  selectedChampionName: string;
  onScrollLeft: () => void;
  onScrollRight: () => void;
  onSkinSelect: (skin: EnhancedSkin) => void;
  onChromaSelect: (chroma: EnhancedSkin) => void;
  onShowChromaSelector: (baseSkin: EnhancedSkin | null, chromas: EnhancedSkin[]) => void;
}

export function SkinCarousel({
  skinLines,
  ddragonChampionId,
  selectedChampionName,
  onScrollLeft,
  onScrollRight,
  onSkinSelect,
  onChromaSelect,
  onShowChromaSelector
}: SkinCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollLeftRef = useRef<HTMLDivElement>(null);
  const scrollRightRef = useRef<HTMLDivElement>(null);

  const updateScrollIndicators = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    const atStart = scrollLeft <= 10;
    const atEnd = scrollLeft + clientWidth >= scrollWidth - 10;

    if (scrollLeftRef.current) {
      scrollLeftRef.current.style.opacity = atStart ? '0' : '0.5';
    }
    if (scrollRightRef.current) {
      scrollRightRef.current.style.opacity = atEnd ? '0' : '0.5';
    }
  };

  useEffect(() => {
    updateScrollIndicators();
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', updateScrollIndicators);
      return () => carousel.removeEventListener('scroll', updateScrollIndicators);
    }
  }, [skinLines]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      onScrollLeft();
    } else if (e.key === 'ArrowRight') {
      onScrollRight();
    }
  };

  return (
    <div className="skin-carousel-container">
      <div
        ref={carouselRef}
        className="skin-carousel"
        role="list"
        aria-label={`${selectedChampionName} skins`}
        onKeyDown={handleKeyDown}
        onScroll={updateScrollIndicators}
      >
        {skinLines.map((line) => {
          if (line.baseSkin) {
            const baseSkin = line.baseSkin;
            return (
              <SkinCard
                key={baseSkin.id}
                skin={baseSkin}
                ddragonChampionId={ddragonChampionId}
                chromas={line.chromas}
                isBaseSkin={true}
                onClick={() => {
                  if (line.chromas.length > 0) {
                    onShowChromaSelector(baseSkin, line.chromas);
                  } else {
                    onSkinSelect(baseSkin);
                  }
                }}
                onChromaClick={(chroma) => onChromaSelect(chroma)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (line.chromas.length > 0) {
                      onShowChromaSelector(baseSkin, line.chromas);
                    } else {
                      onSkinSelect(baseSkin);
                    }
                  }
                }}
              />
            );
          } else if (line.chromas.length > 0) {
            // Only chromas, no base skin - show first chroma as representative
            return (
              <SkinCard
                key={line.chromas[0].id}
                skin={line.chromas[0]}
                ddragonChampionId={ddragonChampionId}
                chromas={line.chromas}
                isBaseSkin={false}
                onClick={() => onShowChromaSelector(null, line.chromas)}
                onChromaClick={(chroma) => onChromaSelect(chroma)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onShowChromaSelector(null, line.chromas);
                  }
                }}
              />
            );
          }
          return null;
        })}
      </div>
      {/* Scroll indicators */}
      <div
        ref={scrollLeftRef}
        className="scroll-indicator scroll-left"
        aria-hidden="true"
        onClick={onScrollLeft}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </div>
      <div
        ref={scrollRightRef}
        className="scroll-indicator scroll-right"
        aria-hidden="true"
        onClick={onScrollRight}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}