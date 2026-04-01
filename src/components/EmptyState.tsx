'use client';

interface EmptyStateProps {
  onSuggestionClick: (query: string) => void;
}

const SUGGESTIONS = [
  {
    icon: '🖥️',
    text: 'Citrix Workspace app not launching on Windows 11',
  },
  {
    icon: '🔐',
    text: 'VDA registration failed with DDC — event ID 1048',
  },
  {
    icon: '🌐',
    text: 'NetScaler Gateway SSL certificate error during login',
  },
  {
    icon: '⚡',
    text: 'HDX session freezing with high latency on Citrix Cloud',
  },
];

export default function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">🛡️</div>
      <h1 className="empty-state__title">Citrix Troubleshooting Copilot</h1>
      <p className="empty-state__description">
        Your AI-powered Citrix support engineer. Ask any troubleshooting
        question and get root cause analysis, step-by-step fixes, and verified
        sources from trusted Citrix documentation.
      </p>
      <div className="empty-state__suggestions">
        {SUGGESTIONS.map((suggestion, index) => (
          <button
            key={index}
            className="suggestion-card"
            onClick={() => onSuggestionClick(suggestion.text)}
            id={`suggestion-${index}`}
          >
            <div className="suggestion-card__icon">{suggestion.icon}</div>
            <div className="suggestion-card__text">{suggestion.text}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
