const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(remark-gfm|@privy-io|ofetch|destr|ufo|node-fetch-native|jose|@tanstack|@radix-ui|lucide-react|@radix-ui|class-variance-authority|clsx|tailwind-merge|@uidotdev|nanoid|remark.*|micromark.*|mdast.*|unist.*|unified|bail|is-plain-obj|trough|vfile|rehype.*|hast.*)/)',
  ],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node', 'mjs'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
}

module.exports = createJestConfig(customJestConfig) 