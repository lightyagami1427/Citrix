'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Standard Error Boundary to catch React render errors.
 * Useful for debugging Chrome-specific extension conflicts.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__container">
            <h2 className="error-boundary__title">Something went wrong</h2>
            <p className="error-boundary__message">
              The application encountered a client-side error. This can happen
              due to browser extension conflicts or network issues.
            </p>
            {this.state.error && (
              <pre className="error-boundary__debug">
                {this.state.error.toString()}
              </pre>
            )}
            <button
              className="error-boundary__btn"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
          <style jsx>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background: #0a0e17;
              color: #f1f5f9;
              font-family: sans-serif;
            }
            .error-boundary__container {
              max-width: 500px;
              text-align: center;
              background: #111827;
              padding: 40px;
              border-radius: 12px;
              border: 1px solid rgba(239, 68, 68, 0.2);
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            }
            .error-boundary__title {
              color: #ef4444;
              margin-bottom: 16px;
            }
            .error-boundary__message {
              color: #94a3b8;
              margin-bottom: 24px;
            }
            .error-boundary__debug {
              background: #000;
              padding: 12px;
              border-radius: 6px;
              font-size: 12px;
              text-align: left;
              margin-bottom: 24px;
              overflow-x: auto;
              color: #fca5a5;
            }
            .error-boundary__btn {
              background: #06b6d4;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
