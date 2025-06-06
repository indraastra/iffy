// Test setup file for Vitest
import { beforeEach, beforeAll, vi } from 'vitest'

// Setup test environment once
beforeAll(() => {
  // Mock localStorage for anthropic service tests
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    },
    writable: true
  })
  
  // Mock console methods to reduce test output noise
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// Setup DOM environment for each test
beforeEach(() => {
  // Clear any existing DOM content
  document.body.innerHTML = ''
  
  // Reset localStorage mocks
  vi.clearAllMocks()
})