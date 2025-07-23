'use client';

import { useState, useEffect, useRef } from 'react';

export function EmbedTestClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const authToken = sessionStorage.getItem('embed-test-auth');
    if (authToken === 'authenticated') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/embed/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        sessionStorage.setItem('embed-test-auth', 'authenticated');
        setIsAuthenticated(true);
      } else {
        setError('Invalid password');
      }
    } catch (error) {
      setError('Authentication failed');
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{
          background: 'white',
          padding: '48px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '420px',
          width: '100%',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              🔐
            </div>
            <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#1f2937', letterSpacing: '-0.02em' }}>
              Access Required
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: '16px', color: '#6b7280' }}>
              Enter your access code to continue
            </p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                Access Code
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                  outline: 'none'
                }}
                placeholder="••••••••"
                required
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '14px',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px',
                background: isLoading
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isLoading
                  ? 'none'
                  : '0 4px 14px 0 rgba(102, 126, 234, 0.39)',
                transform: isLoading ? 'none' : 'translateY(0)',
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                  (e.target as HTMLElement).style.boxShadow = '0 6px 20px 0 rgba(102, 126, 234, 0.5)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  (e.target as HTMLElement).style.transform = 'translateY(0)';
                  (e.target as HTMLElement).style.boxShadow = '0 4px 14px 0 rgba(102, 126, 234, 0.39)';
                }
              }}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px'
                  }}></div>
                  Verifying...
                </div>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <EmbedTestPage />;
}

function EmbedTestPage() {
  const [url, setUrl] = useState('https://forum.scroll.io/t/proposal-scroll-dao-delegate-accelerator-proposal/571');
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.source === 'negation-game-embed' && event.data?.type === 'resize') {
        if (iframeRef.current && iframeRef.current.contentWindow === event.source) {
          iframeRef.current.style.height = `${Math.min(event.data.height, 1500)}px`;
        }
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', maxWidth: 900, margin: '0 auto', padding: 20, background: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 32, marginBottom: 8, color: '#0f172a' }}>Scroll Forum Embed Tester</h1>
      <p style={{ marginBottom: 16, color: '#64748b', fontSize: 16 }}>Paste a Scroll forum topic URL and load the Negation Game embed iframe.</p>

      <div style={{ marginBottom: 24, padding: 16, background: '#e0f2fe', borderRadius: 8, border: '1px solid #0891b2' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#0c4a6e' }}>Production Usage</h3>
        <p style={{ margin: '0 0 8px', fontSize: 14, color: '#164e63' }}>
          For production, just embed this URL directly - it will auto-detect the page URL:
        </p>
        <code style={{ background: '#f8fafc', padding: 4, borderRadius: 4, fontSize: 12, color: '#0c4a6e' }}>
          {baseUrl}/embed/source
        </code>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://forum.scroll.io/t/..." style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }} />
        <button onClick={() => setIframeUrl(`${baseUrl}/embed/source?source=${encodeURIComponent(url)}`)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}>Load</button>
      </div>
      {iframeUrl && (
        <iframe ref={iframeRef} src={iframeUrl} scrolling="no" style={{ width: '100%', border: 'none', minHeight: 200 }} title="Negation Game Embed" />
      )}
    </div>
  );
}

export default function Page() {
  return <EmbedTestClient />;
}