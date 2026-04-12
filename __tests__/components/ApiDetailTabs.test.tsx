import { describe, it, expect, vi } from 'vitest'
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

const emptyEntry: ApiEntry = {
  id: 'api-2',
  project_id: 'p1',
  name: 'Empty API',
  endpoint: '/api/v1/empty',
  method: 'POST',
  tags: [],
  request_schema: null,
  response_schema: null,
  mcp_config: null,
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
    expect(screen.getByText('No history yet')).toBeInTheDocument()
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

describe('ApiDetailTabs — empty tab states', () => {
  it('shows EmptyState on Schema tab when both schemas are null', async () => {
    const user = userEvent.setup()
    render(<ApiDetailTabs entry={emptyEntry} role="editor" onEdit={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /schema/i }))
    expect(screen.getByText('No schema defined')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit API' })).toBeInTheDocument()
  })

  it('shows Edit API button on Schema tab for suggester', async () => {
    const user = userEvent.setup()
    render(<ApiDetailTabs entry={emptyEntry} role="suggester" onEdit={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /schema/i }))
    expect(screen.getByText('No schema defined')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit API' })).toBeInTheDocument()
  })

  it('shows no CTA on Schema tab for viewer', async () => {
    const user = userEvent.setup()
    render(<ApiDetailTabs entry={emptyEntry} role="viewer" onEdit={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /schema/i }))
    expect(screen.getByText('No schema defined')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit API' })).not.toBeInTheDocument()
  })

  it('calls onEdit when Edit API is clicked on Schema tab', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<ApiDetailTabs entry={emptyEntry} role="editor" onEdit={onEdit} />)
    await user.click(screen.getByRole('tab', { name: /schema/i }))
    await user.click(screen.getByRole('button', { name: 'Edit API' }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('shows EmptyState on Code Snippet tab when snippet is null', async () => {
    const user = userEvent.setup()
    render(<ApiDetailTabs entry={emptyEntry} role="editor" onEdit={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /code snippet/i }))
    expect(screen.getByText('No code snippet')).toBeInTheDocument()
  })

  it('shows EmptyState on Notes tab when special_notes is null', async () => {
    const user = userEvent.setup()
    render(<ApiDetailTabs entry={emptyEntry} role="editor" onEdit={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /notes/i }))
    expect(screen.getByText('No notes yet')).toBeInTheDocument()
  })

  it('shows EmptyState with Generate button on MCP Config tab for editor', async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn()
    render(<ApiDetailTabs entry={emptyEntry} role="editor" onEdit={vi.fn()} onGenerate={onGenerate} />)
    await user.click(screen.getByRole('tab', { name: /mcp config/i }))
    expect(screen.getByText('No MCP config yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✨ Generate' })).toBeInTheDocument()
  })

  it('calls onGenerate when Generate button is clicked on MCP Config tab', async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn()
    render(<ApiDetailTabs entry={emptyEntry} role="editor" onEdit={vi.fn()} onGenerate={onGenerate} />)
    await user.click(screen.getByRole('tab', { name: /mcp config/i }))
    await user.click(screen.getByRole('button', { name: '✨ Generate' }))
    expect(onGenerate).toHaveBeenCalledOnce()
  })

  it('shows no Generate button on MCP Config tab for suggester', async () => {
    const user = userEvent.setup()
    render(<ApiDetailTabs entry={emptyEntry} role="suggester" onEdit={vi.fn()} onGenerate={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /mcp config/i }))
    expect(screen.getByText('No MCP config yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '✨ Generate' })).not.toBeInTheDocument()
  })
})
