// Header Component

import './Header.css';

interface HeaderProps {
  championCount: number;
  skinCount: number;
}

export function Header({ championCount, skinCount }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">
          <svg className="title-icon" viewBox="0 0 24 24" fill="currentColor" width="32" height="32" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          League Skin Browser
        </h1>
        <p className="app-subtitle">Browse and download champion skins</p>
      </div>
      <div className="header-stats">
        <span className="stat">{championCount} Champions</span>
        <span className="stat-divider">|</span>
        <span className="stat">{skinCount} Skins</span>
      </div>
    </header>
  );
}