import React from 'react'
import { render as rtlRender } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'

// Create a client once for all tests
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
})

// Mock ThemeProvider since we don't need actual theme functionality in tests
const MockThemeProvider = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>
}

jest.mock('@/components/ui/ThemeProvider', () => ({
    ThemeProvider: MockThemeProvider,
}))

function render(ui: React.ReactElement, options = {}) {
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
        return (
            <MockThemeProvider>
                <QueryClientProvider client={queryClient}>
                    <TooltipProvider>
                        {children}
                    </TooltipProvider>
                </QueryClientProvider>
            </MockThemeProvider>
        )
    }

    return {
        ...rtlRender(ui, { wrapper: Wrapper, ...options }),
        user: userEvent.setup(),
    }
}

// re-export everything
export * from '@testing-library/react'

// override render method
export { render } 