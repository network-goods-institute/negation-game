import '@testing-library/jest-dom'

// Polyfill for TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

global.setImmediate = (callback) => setTimeout(callback, 0);

// Mock @privy-io/react-auth
jest.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    getAccessToken: jest.fn(),
  }),
}))

// Mock @radix-ui/react-slot
jest.mock('@radix-ui/react-slot', () => ({
  Slot: ({ children, ...props }) => <div {...props}>{children}</div>,
}))

// Mock @/lib/cn
jest.mock('@/lib/utils/cn', () => ({
  cn: (...args) => args.filter(Boolean).join(' '),
}))

// Mock @/components/ui/loader
jest.mock('@/components/ui/loader', () => ({
  Loader: () => <div data-testid="loader" />,
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}))

// Mock @privy-io/server-auth to stub PrivyClient
jest.mock('@privy-io/server-auth', () => ({
  PrivyClient: class {
    verifyAuthToken = jest.fn().mockResolvedValue({ userId: null });
  },
}))

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
}) 