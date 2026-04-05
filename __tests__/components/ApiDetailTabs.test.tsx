import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiDetailTabs } from '@/components/api/ApiDetailTabs'
import type { ApiEntry } from '@/types'

const entry: ApiEntry = {
  id: 'api-1',
  project_id: 'p1',
  name: 'Get Items',
  endpoint: '/api/v1/items',
  method: 'GET',
  version: 'v1',
  status: 'Stable',
  group: 'Inventory',
  tags: ['read-only'],
  tool_description: 'Fetches inventory items',
  request_schema: { type: 'object' },
  response_schema: { type: 'array' },
  mcp_config: { name: 'get_items', description: '', inputSchema: { type: 'object', properties: {}, required: [] } },
  code_snippet: 'curl /api/v1/items',
  special_notes: 'Rate limited',
  created_by: 'u1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('ApiDetailTabs', () => {
  it('renders all six tab labels', () => {
    render(<ApiDetailTabs entry={entry} />)
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /schema/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /mcp config/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /code snippet/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /notes/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument()
  })

  it('shows History tab with empty state when no events passed', async () => {
    const user = userEvent.setup()
    render(<ApiDetailTabs entry={entry} />)
    await user.click(screen.getByRole('tab', { name: /history/i }))
    expect(screen.getByText(/no history recorded yet/i)).toBeInTheDocument()
  })

  it('shows history events when historyEvents prop is provided', async () => {
    const user = userEvent.setup()
    const historyEvents = [{
      id: 'h1', api_id: 'api-1', api_name: 'Get Items', project_id: 'p1',
      project_name: 'Alpha', action: 'created' as const,
      user_id: 'u1', user_name: 'Alice', user_role: 'editor' as const,
      detail: 'Created: Get Items', created_at: '2024-01-01T00:00:00Z',
    }]
    render(<ApiDetailTabs entry={entry} historyEvents={historyEvents} />)
    await user.click(screen.getByRole('tab', { name: /history/i }))
    expect(screen.getByText('Created: Get Items')).toBeInTheDocument()
  })

  it('shows Overview content by default', () => {
    render(<ApiDetailTabs entry={entry} />)
    expect(screen.getByText('Fetches inventory items')).toBeInTheDocument()
  })

  it('shows method and endpoint in Overview', () => {
    render(<ApiDetailTabs entry={entry} />)
    expect(screen.getByText('GET')).toBeInTheDocument()
    expect(screen.getByText('/api/v1/items')).toBeInTheDocument()
  })

  it('switches to Schema tab and shows copy buttons', async () => {
    const user = userEvent.setup()
    render(<ApiDetailTabs entry={entry} />)
    await user.click(screen.getByRole('tab', { name: /schema/i }))
    // Schema tab has two copy buttons (request + response)
    expect(screen.getAllByRole('button', { name: /copy/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('switches to Notes tab and shows notes content', async () => {
    const user = userEvent.setup()
    render(<ApiDetailTabs entry={entry} />)
    await user.click(screen.getByRole('tab', { name: /notes/i }))
    expect(screen.getByText('Rate limited')).toBeInTheDocument()
  })

  it('shows copy button on MCP Config tab', async () => {
    const user = userEvent.setup()
    render(<ApiDetailTabs entry={entry} />)
    await user.click(screen.getByRole('tab', { name: /mcp config/i }))
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('shows copy button on Code Snippet tab', async () => {
    const user = userEvent.setup()
    render(<ApiDetailTabs entry={entry} />)
    await user.click(screen.getByRole('tab', { name: /code snippet/i }))
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })
})
