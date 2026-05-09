import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f0f23',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
        }}>
          <div style={{ maxWidth: 600, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#f87171' }}>
              ⚠️ Application Error
            </h1>
            <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Something went wrong while loading PharMinds PFE.
            </p>
            <pre style={{
              background: '#1e1e3a',
              padding: '1rem',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              color: '#fbbf24',
              textAlign: 'left',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
