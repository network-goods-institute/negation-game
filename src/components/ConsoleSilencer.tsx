"use client";

import { useEffect } from 'react';

export function ConsoleSilencer() {
  useEffect(() => {
    // Check if logs are enabled via environment variable
    const logsEnabled = process.env.NEXT_PUBLIC_ENABLE_LOGS === 'true';

    // Only silence in production if logs are not explicitly enabled
    if (process.env.NODE_ENV === 'production' && !logsEnabled) {
      // Save original console methods
      const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info,
        debug: console.debug,
        group: console.group,
        groupEnd: console.groupEnd,
        table: console.table,
        trace: console.trace,
      };

      // Create no-op functions
      const noop = () => {};

      // Override console methods
      console.log = noop;
      console.warn = noop;
      console.info = noop;
      console.debug = noop;
      console.group = noop;
      console.groupEnd = noop;
      console.table = noop;
      console.trace = noop;

      // Keep error for critical errors but filter out common third-party warnings
      console.error = (...args: any[]) => {
        // Allow certain critical errors
        const errorString = args.join(' ').toString();

        // Filter out common third-party warnings/noise
        const filteredPatterns = [
          'privy.io',
          'WalletConnect',
          'solana',
          'Injected providers',
          'mozInputSource',
          'Content-Security-Policy',
          'unsafe-inline',
          'bounce tracker',
          'preload was not used',
          'empty gid',
          'already initialized',
          'must call eth_requestAccounts',
          'Unable to get preferred account',
          'You are reading this message',
          'useYjsMultiplayer',
          'YJS Provider',
          'Mindchange:Sync',
        ];

        const shouldFilter = filteredPatterns.some(pattern =>
          errorString.toLowerCase().includes(pattern.toLowerCase())
        );

        if (!shouldFilter) {
          originalConsole.error(...args);
        }
      };

      // Cleanup function to restore console methods if needed
      return () => {
        Object.assign(console, originalConsole);
      };
    }
  }, []);

  return null;
}