import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js server-only APIs so component tests don't crash
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

// Default no-op mocks for server actions — individual test files override these
vi.mock('@/app/actions/generate', () => ({
  generateApiDocsAction: vi.fn().mockResolvedValue({
    tool_description: '',
    mcp_config: {},
  }),
}))

vi.mock('@/app/actions/search', () => ({
  semanticSearchAction: vi.fn().mockResolvedValue({ ids: [] }),
}))
