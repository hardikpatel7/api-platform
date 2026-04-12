import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HistoryFeed } from '@/components/history/HistoryFeed'
import type { HistoryEntry } from '@/types'

const events: HistoryEntry[] = [
  {
    id: 'h1',
    api_id: 'a1',
    api_name: 'Get Users',
    project_id: 'p1',
    project_name: 'Alpha',
    action: 'edited',
    user_id: 'u1',
    user_name: 'Alice',
    user_role: 'editor',
    detail: 'Edited: Get Users',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'h2',
    api_id: 'a1',
    api_name: 'Get Users',
    project_id: 'p1',
    project_name: 'Alpha',
    action: 'created',
    user_id: 'u1',
    user_name: 'Alice',
    user_role: 'editor',
    detail: 'Created: Get Users',
    created_at: '2024-01-14T09:00:00Z',
  },
]

describe('HistoryFeed — events', () => {
  it('renders the action label for each event', () => {
    render(<HistoryFeed events={events} />)
    expect(screen.getByText('edited')).toBeInTheDocument()
    expect(screen.getByText('created')).toBeInTheDocument()
  })

  it('renders the detail string for each event', () => {
    render(<HistoryFeed events={events} />)
    expect(screen.getByText('Edited: Get Users')).toBeInTheDocument()
    expect(screen.getByText('Created: Get Users')).toBeInTheDocument()
  })

  it('renders the user name for each event', () => {
    render(<HistoryFeed events={events} />)
    expect(screen.getAllByText('Alice')).toHaveLength(2)
  })

  it('renders the role badge', () => {
    render(<HistoryFeed events={events} />)
    expect(screen.getAllByText('editor')).toHaveLength(2)
  })

  it('shows events in the order provided (newest first)', () => {
    render(<HistoryFeed events={events} />)
    const details = screen.getAllByText(/Edited:|Created:/)
    expect(details[0].textContent).toContain('Edited:')
    expect(details[1].textContent).toContain('Created:')
  })

  it('renders a colored dot for each event', () => {
    const { container } = render(<HistoryFeed events={events} />)
    const dots = container.querySelectorAll('[data-action-dot]')
    expect(dots).toHaveLength(2)
  })
})

describe('HistoryFeed — empty state', () => {
  it('shows empty message when no events', () => {
    render(<HistoryFeed events={[]} />)
    expect(screen.getByText('No history yet')).toBeInTheDocument()
  })
})
