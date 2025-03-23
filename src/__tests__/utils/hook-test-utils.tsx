import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';

// Create a wrapper with all necessary providers for hook testing
export function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    };
}

// Custom renderHook function that includes all providers
export function renderHookWithProviders<T>(hook: () => T) {
    return renderHook(hook, {
        wrapper: createWrapper(),
    });
} 