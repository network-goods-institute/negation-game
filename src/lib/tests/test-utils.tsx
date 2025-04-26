import React from 'react'
import { render as rtlRender } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'

// Mock ALL Radix UI primitives and their dependencies
jest.mock('@radix-ui/react-primitive', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    const Primitive = {
        div: 'div',
        span: 'span',
        button: 'button',
    };
    return {
        createSlot: () => mockComponent,
        Primitive,
        Root: mockComponent,
        __esModule: true,
        default: Primitive,
    };
});

jest.mock('@radix-ui/react-portal', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Portal: mockComponent,
        Root: mockComponent,
    };
});

jest.mock('@radix-ui/react-slot', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Slot: mockComponent,
    };
});

jest.mock('@radix-ui/react-roving-focus', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Group: mockComponent,
        Item: mockComponent,
    };
});

jest.mock('@radix-ui/react-tooltip', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Trigger: mockComponent,
        Content: mockComponent,
        Provider: mockComponent,
        Portal: mockComponent,
    };
});

jest.mock('@radix-ui/react-tabs', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        List: mockComponent,
        Trigger: mockComponent,
        Content: mockComponent,
    };
});

jest.mock('@radix-ui/react-dialog', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Trigger: mockComponent,
        Portal: mockComponent,
        Overlay: mockComponent,
        Content: mockComponent,
        Close: mockComponent,
        Title: mockComponent,
        Description: mockComponent,
    };
});

jest.mock('@radix-ui/react-popover', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Trigger: mockComponent,
        Portal: mockComponent,
        Content: mockComponent,
        Arrow: mockComponent,
    };
});

jest.mock('@radix-ui/react-avatar', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Image: mockComponent,
        Fallback: mockComponent,
    };
});

jest.mock('@radix-ui/react-label', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Label: mockComponent,
    };
});

jest.mock('@radix-ui/react-switch', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Thumb: mockComponent,
    };
});

jest.mock('@radix-ui/react-scroll-area', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Viewport: mockComponent,
        Scrollbar: mockComponent,
        Thumb: mockComponent,
        Corner: mockComponent,
    };
});

jest.mock('@radix-ui/react-separator', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
    };
});

jest.mock('@radix-ui/react-context-menu', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Trigger: mockComponent,
        Portal: mockComponent,
        Content: mockComponent,
        Item: mockComponent,
        Group: mockComponent,
        Label: mockComponent,
        Separator: mockComponent,
    };
});

jest.mock('@radix-ui/react-dropdown-menu', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Trigger: mockComponent,
        Portal: mockComponent,
        Content: mockComponent,
        Item: mockComponent,
        Group: mockComponent,
        Label: mockComponent,
        Separator: mockComponent,
    };
});

jest.mock('@radix-ui/react-accordion', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Item: mockComponent,
        Header: mockComponent,
        Trigger: mockComponent,
        Content: mockComponent,
    };
});

jest.mock('@radix-ui/react-alert-dialog', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Trigger: mockComponent,
        Portal: mockComponent,
        Overlay: mockComponent,
        Content: mockComponent,
        Cancel: mockComponent,
        Action: mockComponent,
        Title: mockComponent,
        Description: mockComponent,
    };
});

jest.mock('@radix-ui/react-collapsible', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Trigger: mockComponent,
        Content: mockComponent,
    };
});

jest.mock('@radix-ui/react-progress', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Indicator: mockComponent,
    };
});

jest.mock('@radix-ui/react-slider', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Track: mockComponent,
        Range: mockComponent,
        Thumb: mockComponent,
    };
});

jest.mock('@radix-ui/react-toggle', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
    };
});

jest.mock('@radix-ui/react-toggle-group', () => {
    const mockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
    return {
        Root: mockComponent,
        Item: mockComponent,
    };
});

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