import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '@/components/ui/EmptyState'

describe('EmptyState', () => {
  it('renders icon, title, and description', () => {
    render(
      <EmptyState
        icon="📁"
        title="No projects yet"
        description="Create one to get started."
      />
    )
    expect(screen.getByText('📁')).toBeInTheDocument()
    expect(screen.getByText('No projects yet')).toBeInTheDocument()
    expect(screen.getByText('Create one to get started.')).toBeInTheDocument()
  })

  it('renders no buttons when actions is omitted', () => {
    render(<EmptyState icon="📁" title="No projects" description="Ask your admin." />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders a primary action button and calls onClick', () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        icon="📁"
        title="No projects"
        description="Create one."
        actions={[{ label: '+ New project', variant: 'primary', onClick }]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '+ New project' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders secondary and ai action buttons', () => {
    render(
      <EmptyState
        icon="⚙️"
        title="No MCP config"
        description="Generate or edit."
        actions={[
          { label: 'Edit API', variant: 'secondary', onClick: vi.fn() },
          { label: '✨ Generate', variant: 'ai', onClick: vi.fn() },
        ]}
      />
    )
    expect(screen.getByRole('button', { name: 'Edit API' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✨ Generate' })).toBeInTheDocument()
  })
})
