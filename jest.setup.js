import '@testing-library/jest-dom'

// Polyfill for TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill for TransformStream (needed for AI SDK)
global.TransformStream = class TransformStream {
  constructor(transformer = {}) {
    this.readable = new ReadableStream({
      start(controller) {
        this._controller = controller;
      }
    });
    this.writable = new WritableStream({
      write: transformer.transform || ((chunk) => this.readable._controller.enqueue(chunk)),
      close: () => this.readable._controller.close()
    });
  }
}

// Polyfill for ReadableStream if not available
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {
    constructor(source = {}) {
      this._controller = null;
      if (source.start) {
        source.start({
          enqueue: (chunk) => this._chunks = [...(this._chunks || []), chunk],
          close: () => this._closed = true
        });
      }
    }
    
    getReader() {
      return {
        read: () => Promise.resolve({ 
          done: this._closed && (!this._chunks || this._chunks.length === 0), 
          value: this._chunks?.shift() 
        })
      };
    }
  };
}

// Polyfill for WritableStream if not available
if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = class WritableStream {
    constructor(sink = {}) {
      this._sink = sink;
    }
    
    getWriter() {
      return {
        write: (chunk) => this._sink.write?.(chunk),
        close: () => this._sink.close?.()
      };
    }
  };
}

global.setImmediate = (callback) => setTimeout(callback, 0);

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-' + Math.random().toString(36).substr(2, 9)),
}))
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

// Mock AI SDK functions
jest.mock('@/actions/ai/generateNotificationSummary', () => ({
  generateNotificationSummary: jest.fn().mockResolvedValue('AI generated summary'),
}))

// Mock notification queue
jest.mock('@/lib/notifications/notificationQueue', () => ({
  queueNotification: jest.fn(),
  notificationQueue: {
    add: jest.fn(),
  },
}))

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
}) 