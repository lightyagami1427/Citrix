'use client';

export default function LoadingIndicator() {
  return (
    <div className="loading-indicator">
      <div className="loading-indicator__avatar">🛡️</div>
      <div className="loading-indicator__content">
        <div className="loading-dots">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
        <div className="loading-text">
          Searching trusted sources & analyzing...
        </div>
      </div>
    </div>
  );
}
