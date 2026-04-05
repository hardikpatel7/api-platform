import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffView } from '@/components/suggestions/DiffView'
import type { Suggestion } from '@/types'

const baseSuggestion: Suggestion = {
  id: 's1',
  type: 'edit',
  project_id: 'p1',
  project_name: 'Alpha API',
  api_id: 'a1',
  api_name: 'Get Users',
  user_id: 'u1',
  user_name: 'Alice',
  payload: { name: 'List Users', method: 'GET', endpoint: '/api/users' },
  original: { name: 'Get Users', method: 'GET', endpoint: '/api/users' },
  status: 'pending',
  created_at: '2024-01-01T00:00:00Z',
}

describe('DiffView — edit suggestion', () => {
  it('shows original value in a del element', () => {
    render(<DiffView suggestion={baseSuggestion} />)
    expect(screen.getByText('Get Users')).toBeInTheDocument()
  })

  it('shows suggested value in an ins element', () => {
    render(<DiffView suggestion={baseSuggestion} />)
    expect(screen.getByText('List Users')).toBeInTheDocument()
  })

  it('shows the field label for changed fields', () => {
    render(<DiffView suggestion={baseSuggestion} />)
    expect(screen.getByText(/name/i)).toBeInTheDocument()
  })

  it('shows "no text fields changed" when only JSON fields differ', () => {
    const suggestion = {
      ...baseSuggestion,
      payload: { ...baseSuggestion.original as object, mcp_config: { name: 'x' } },
    }
    render(<DiffView suggestion={suggestion} />)
    expect(screen.getByText(/only tags\/json fields changed/i)).toBeInTheDocument()
  })
})

describe('DiffView — create suggestion', () => {
  it('shows the proposed API name', () => {
    const suggestion: Suggestion = {
      ...baseSuggestion,
      type: 'create',
      api_id: null,
      original: undefined,
      payload: { name: 'Create Order', method: 'POST', endpoint: '/api/orders' },
    }
    render(<DiffView suggestion={suggestion} />)
    expect(screen.getByText('Create Order')).toBeInTheDocument()
  })

  it('shows the method and endpoint', () => {
    const suggestion: Suggestion = {
      ...baseSuggestion,
      type: 'create',
      api_id: null,
      original: undefined,
      payload: { name: 'Create Order', method: 'POST', endpoint: '/api/orders' },
    }
    render(<DiffView suggestion={suggestion} />)
    expect(screen.getByText('POST')).toBeInTheDocument()
    expect(screen.getByText('/api/orders')).toBeInTheDocument()
  })
})

describe('DiffView — delete suggestion', () => {
  it('shows the name of the API to be deleted', () => {
    const suggestion: Suggestion = {
      ...baseSuggestion,
      type: 'delete',
      payload: null,
      original: { name: 'Get Users', method: 'GET', endpoint: '/api/users' },
    }
    render(<DiffView suggestion={suggestion} />)
    expect(screen.getByText('Get Users')).toBeInTheDocument()
  })

  it('shows a deletion warning message', () => {
    const suggestion: Suggestion = {
      ...baseSuggestion,
      type: 'delete',
      payload: null,
      original: { name: 'Get Users', method: 'GET', endpoint: '/api/users' },
    }
    render(<DiffView suggestion={suggestion} />)
    expect(screen.getByText(/will be deleted/i)).toBeInTheDocument()
  })
})
