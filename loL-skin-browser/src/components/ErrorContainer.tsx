// Error Container Component

import './ErrorContainer.css';

interface ErrorContainerProps {
  isVisible: boolean;
  message: string;
  onRetry: () => void;
}

export function ErrorContainer({ isVisible, message, onRetry }: ErrorContainerProps) {
  if (!isVisible) return null;

  return (
    <div className="error-container" role="alert">
      <svg className="error-icon" viewBox="0 0 24 24" fill="currentColor" width="48" height="48" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
      <h2 className="error-title">Failed to Load Data</h2>
      <p className="error-message">{message}</p>
      <button className="btn btn-primary" onClick={onRetry}>Retry</button>
    </div>
  );
}