import { describe, it, expect } from 'vitest'
import type {
  UserRole,
  Project,
  ApiEntry,
  User,
  Suggestion,
  SuggestionType,
  HistoryEntry,
  HistoryAction,
} from '@/types'

describe('UserRole', () => {
  it('accepts all four valid roles', () => {
    const roles: UserRole[] = ['viewer', 'suggester', 'editor', 'admin']
    expect(roles).toHaveLength(4)
  })
})

describe('SuggestionType', () => {
  it('accepts edit, create, delete', () => {
    const types: SuggestionType[] = ['edit', 'create', 'delete']
    expect(types).toHaveLength(3)
  })
})

describe('HistoryAction', () => {
  it('covers all nine tracked actions', () => {
    const actions: HistoryAction[] = [
      'created',
      'edited',
      'deleted',
      'suggested_edit',
      'suggested_create',
      'suggested_delete',
      'suggestion_approved',
      'suggestion_rejected',
      'bulk_import',
    ]
    expect(actions).toHaveLength(9)
  })
})

describe('Project shape', () => {
  it('has required fields matching the DB schema', () => {
    const project: Project = {
      id: 'uuid-1',
      name: 'My API Project',
      description: 'Optional description',
      created_by: 'user-uuid',
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(project.id).toBeDefined()
    expect(project.name).toBeDefined()
    expect(project.created_by).toBeDefined()
    expect(project.created_at).toBeDefined()
  })

  it('allows description to be optional', () => {
    const project: Project = {
      id: 'uuid-1',
      name: 'Minimal Project',
      created_by: 'user-uuid',
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(project.description).toBeUndefined()
  })
})

describe('ApiEntry shape', () => {
  it('has all required fields', () => {
    const entry: ApiEntry = {
      id: 'uuid-1',
      project_id: 'project-uuid',
      name: 'Get Items',
      endpoint: '/api/v1/items',
      method: 'GET',
      created_by: 'user-uuid',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }
    expect(entry.id).toBeDefined()
    expect(entry.project_id).toBeDefined()
    expect(entry.name).toBeDefined()
    expect(entry.endpoint).toBeDefined()
    expect(entry.method).toBeDefined()
  })

  it('has optional documentation fields', () => {
    const entry: ApiEntry = {
      id: 'uuid-1',
      project_id: 'project-uuid',
      name: 'Get Items',
      endpoint: '/api/v1/items',
      method: 'GET',
      version: 'v1',
      status: 'Stable',
      group: 'Inventory',
      tags: ['read-only', 'public'],
      tool_description: 'Fetches all inventory items',
      mcp_config: { name: 'get_items', description: '', inputSchema: { type: 'object', properties: {}, required: [] } },
      request_schema: { type: 'object' },
      response_schema: { type: 'array' },
      code_snippet: 'curl /api/v1/items',
      special_notes: 'Rate limited to 100/min',
      created_by: 'user-uuid',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }
    expect(entry.version).toBe('v1')
    expect(entry.status).toBe('Stable')
    expect(entry.group).toBe('Inventory')
    expect(entry.tags).toEqual(['read-only', 'public'])
    expect(entry.mcp_config).toBeDefined()
  })
})

describe('User shape', () => {
  it('has id, name, role, created_at matching the DB schema', () => {
    const user: User = {
      id: 'user-uuid',
      name: 'Alice',
      role: 'editor',
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(user.id).toBeDefined()
    expect(user.name).toBeDefined()
    expect(user.role).toBe('editor')
  })
})

describe('Suggestion shape', () => {
  it('has all required fields from the DB schema', () => {
    const suggestion: Suggestion = {
      id: 'uuid-1',
      type: 'edit',
      project_id: 'project-uuid',
      project_name: 'My Project',
      api_id: 'api-uuid',
      api_name: 'Get Items',
      user_id: 'user-uuid',
      user_name: 'Alice',
      payload: { name: 'Updated' },
      original: { name: 'Get Items' },
      status: 'pending',
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(suggestion.status).toBe('pending')
    expect(suggestion.type).toBe('edit')
  })

  it('allows api_id to be null for create suggestions', () => {
    const suggestion: Suggestion = {
      id: 'uuid-1',
      type: 'create',
      project_id: 'project-uuid',
      project_name: 'My Project',
      api_id: null,
      api_name: 'New API',
      user_id: 'user-uuid',
      user_name: 'Alice',
      payload: { name: 'New API' },
      status: 'pending',
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(suggestion.api_id).toBeNull()
  })
})
