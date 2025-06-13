import '@testing-library/jest-dom'

// Polyfill for TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

global.setImmediate = (callback) => setTimeout(callback, 0);

global.ReadableStream = class ReadableStream {
  constructor(options = {}) {
    this._controller = null;
    this._locked = false;
    this._state = 'readable';
    
    if (options.start) {
      const controller = {
        enqueue: (chunk) => this._chunks.push(chunk),
        close: () => { this._state = 'closed'; },
        error: (err) => { this._error = err; this._state = 'errored'; }
      };
      this._controller = controller;
      this._chunks = [];
      try {
        options.start(controller);
      } catch (error) {
        controller.error(error);
      }
    } else {
      this._chunks = [];
    }
  }

  getReader() {
    if (this._locked) {
      throw new TypeError('ReadableStream is locked');
    }
    this._locked = true;
    
    return {
      read: async () => {
        if (this._state === 'errored') {
          throw this._error;
        }
        if (this._chunks.length > 0) {
          return { done: false, value: this._chunks.shift() };
        }
        if (this._state === 'closed') {
          return { done: true, value: undefined };
        }
        return { done: true, value: undefined };
      },
      releaseLock: () => {
        this._locked = false;
      }
    };
  }
};

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