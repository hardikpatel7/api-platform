import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Project } from '@/types'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockProjects: Project[] = [
  { id: 'p1', name: 'Alpha API', created_by: 'u1', created_at: '2024-01-01T00:00:00Z' },
  { id: 'p2', name: 'Beta API', created_by: 'u1', created_at: '2024-01-01T00:00:00Z' },
]

describe('Sidebar', () => {
  it('renders all project names', () => {
    render(
      <Sidebar
        projects={mockProjects}
        apiCounts={{ p1: 3, p2: 7 }}
        activeProjectId={null}
        statusFilter={null}
        tagFilter={null}
        availableTags={[]}
        onStatusFilter={vi.fn()}
        onTagFilter={vi.fn()}
      />
    )
    expect(screen.getByText('Alpha API')).toBeInTheDocument()
    expect(screen.getByText('Beta API')).toBeInTheDocument()
  })

  it('shows API count badge next to each project', () => {
    render(
      <Sidebar
        projects={mockProjects}
        apiCounts={{ p1: 3, p2: 7 }}
        activeProjectId={null}
        statusFilter={null}
        tagFilter={null}
        availableTags={[]}
        onStatusFilter={vi.fn()}
        onTagFilter={vi.fn()}
      />
    )
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('does not show status/tag filters when no active project', () => {
    render(
      <Sidebar
        projects={mockProjects}
        apiCounts={{ p1: 3, p2: 7 }}
        activeProjectId={null}
        statusFilter={null}
        tagFilter={null}
        availableTags={['auth', 'read-only']}
        onStatusFilter={vi.fn()}
        onTagFilter={vi.fn()}
      />
    )
    expect(screen.queryByText('Stable')).not.toBeInTheDocument()
    expect(screen.queryByText('auth')).not.toBeInTheDocument()
  })

  it('shows status filter chips when inside a project', () => {
    render(
      <Sidebar
        projects={mockProjects}
        apiCounts={{ p1: 3, p2: 7 }}
        activeProjectId="p1"
        statusFilter={null}
        tagFilter={null}
        availableTags={[]}
        onStatusFilter={vi.fn()}
        onTagFilter={vi.fn()}
      />
    )
    expect(screen.getByText('Stable')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Deprecated')).toBeInTheDocument()
    expect(screen.getByText('Internal')).toBeInTheDocument()
  })

  it('shows tag chips when inside a project and tags exist', () => {
    render(
      <Sidebar
        projects={mockProjects}
        apiCounts={{ p1: 3, p2: 7 }}
        activeProjectId="p1"
        statusFilter={null}
        tagFilter={null}
        availableTags={['auth', 'read-only']}
        onStatusFilter={vi.fn()}
        onTagFilter={vi.fn()}
      />
    )
    expect(screen.getByText('auth')).toBeInTheDocument()
    expect(screen.getByText('read-only')).toBeInTheDocument()
  })

  it('calls onStatusFilter when a status chip is clicked', async () => {
    const onStatusFilter = vi.fn()
    const user = userEvent.setup()
    render(
      <Sidebar
        projects={mockProjects}
        apiCounts={{ p1: 3, p2: 7 }}
        activeProjectId="p1"
        statusFilter={null}
        tagFilter={null}
        availableTags={[]}
        onStatusFilter={onStatusFilter}
        onTagFilter={vi.fn()}
      />
    )
    await user.click(screen.getByText('Stable'))
    expect(onStatusFilter).toHaveBeenCalledWith('Stable')
  })

  it('calls onStatusFilter with null to deselect active status', async () => {
    const onStatusFilter = vi.fn()
    const user = userEvent.setup()
    render(
      <Sidebar
        projects={mockProjects}
        apiCounts={{ p1: 3, p2: 7 }}
        activeProjectId="p1"
        statusFilter="Stable"
        tagFilter={null}
        availableTags={[]}
        onStatusFilter={onStatusFilter}
        onTagFilter={vi.fn()}
      />
    )
    await user.click(screen.getByText('Stable'))
    expect(onStatusFilter).toHaveBeenCalledWith(null)
  })
})
