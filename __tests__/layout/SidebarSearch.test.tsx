import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Project } from '@/types'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}))

function typeInto(el: HTMLElement, value: string) {
  fireEvent.change(el, { target: { value } })
}
function pressEnter(el: HTMLElement) {
  fireEvent.keyDown(el, { key: 'Enter', code: 'Enter' })
}

const mockProjects: Project[] = [
  { id: 'p1', name: 'Alpha API', created_by: 'u1', created_at: '2024-01-01T00:00:00Z' },
]

const defaultProps = {
  projects: mockProjects,
  apiCounts: { p1: 3 },
  activeProjectId: null,
  statusFilter: null,
  tagFilter: null,
  availableTags: [],
  onStatusFilter: vi.fn(),
  onTagFilter: vi.fn(),
}

describe('Sidebar — semantic search', () => {
  it('renders a search input when onSearch is provided', () => {
    render(<Sidebar {...defaultProps} onSearchResults={vi.fn()} onSearch={vi.fn()} />)
    expect(screen.getByPlaceholderText(/search apis/i)).toBeInTheDocument()
  })

  it('does not render search input when onSearch is absent', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.queryByPlaceholderText(/search apis/i)).not.toBeInTheDocument()
  })

  it('calls onSearch when Enter is pressed', async () => {
    const onSearch = vi.fn().mockResolvedValue({ ids: ['api-1'] })
    render(<Sidebar {...defaultProps} onSearchResults={vi.fn()} onSearch={onSearch} />)

    const input = screen.getByPlaceholderText(/search apis/i)
    typeInto(input, 'find users endpoint')
    pressEnter(input)

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('find users endpoint')
    })
  })

  it('calls onSearchResults with the returned IDs', async () => {
    const onSearch = vi.fn().mockResolvedValue({ ids: ['api-1', 'api-2'] })
    const onSearchResults = vi.fn()
    render(<Sidebar {...defaultProps} onSearchResults={onSearchResults} onSearch={onSearch} />)

    const input = screen.getByPlaceholderText(/search apis/i)
    typeInto(input, 'orders')
    pressEnter(input)

    await waitFor(() => {
      expect(onSearchResults).toHaveBeenCalledWith(['api-1', 'api-2'])
    })
  })

  it('renders a Clear button when searchResultIds are active', () => {
    render(
      <Sidebar
        {...defaultProps}
        searchResultIds={['api-1']}
        onSearchResults={vi.fn()}
        onSearch={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('calls onSearchResults with null when Clear is clicked', () => {
    const onSearchResults = vi.fn()
    render(
      <Sidebar
        {...defaultProps}
        searchResultIds={['api-1']}
        onSearchResults={onSearchResults}
        onSearch={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onSearchResults).toHaveBeenCalledWith(null)
  })
})
