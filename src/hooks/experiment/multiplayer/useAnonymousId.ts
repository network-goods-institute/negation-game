import { useEffect, useState } from 'react';

/**
 * Client-side hook to fetch session ID from server.
 * For anonymous users, this returns the server-generated anonymous session ID.
 * This ensures the client and server use the same ID for Yjs sync.
 */
export const useAnonymousId = (authenticated: boolean): string => {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    if (authenticated) {
      // Clear session ID when authenticated
      setSessionId('');
      return;
    }

    // Fetch session ID from server
    if (typeof window === 'undefined') return;

    fetch('/api/user/session')
      .then(res => res.json())
      .then(data => {
        if (data?.userId) {
          setSessionId(data.userId);
        }
      })
      .catch(() => {
        // Fallback: generate client-side ID if server call fails
        const stored = localStorage.getItem('anon-session-id-fallback');
        if (stored && stored.startsWith('anon-')) {
          setSessionId(stored);
        }
      });
  }, [authenticated]);

  return sessionId;
};
