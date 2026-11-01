// Loading Overlay Component

import './LoadingOverlay.css';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = 'Loading champion data...' }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-spinner" />
      <p className="loading-text">{message}</p>
    </div>
  );
}