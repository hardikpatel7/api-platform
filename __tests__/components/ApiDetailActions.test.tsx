import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ApiDetailActions } from '@/components/api/ApiDetailActions'
import type { UserRole } from '@/types'

const handlers = {
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onSuggestEdit: vi.fn(),
  onSuggestDelete: vi.fn(),
}

function renderActions(role: UserRole) {
  return render(<ApiDetailActions role={role} {...handlers} />)
}

describe('ApiDetailActions — editor', () => {
  it('shows Edit and Delete buttons', () => {
    renderActions('editor')
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
  })

  it('does not show suggest buttons', () => {
    renderActions('editor')
    expect(screen.queryByRole('button', { name: /suggest edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /suggest delete/i })).not.toBeInTheDocument()
  })

  it('calls onEdit when Edit is clicked', () => {
    renderActions('editor')
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(handlers.onEdit).toHaveBeenCalled()
  })

  it('calls onDelete when Delete is clicked', () => {
    renderActions('editor')
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(handlers.onDelete).toHaveBeenCalled()
  })
})

describe('ApiDetailActions — admin', () => {
  it('shows Edit and Delete buttons', () => {
    renderActions('admin')
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
  })
})

describe('ApiDetailActions — suggester', () => {
  it('shows Suggest Edit and Suggest Delete buttons', () => {
    renderActions('suggester')
    expect(screen.getByRole('button', { name: /suggest edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /suggest delete/i })).toBeInTheDocument()
  })

  it('does not show direct Edit or Delete buttons', () => {
    renderActions('suggester')
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument()
  })

  it('calls onSuggestEdit when Suggest Edit is clicked', () => {
    renderActions('suggester')
    fireEvent.click(screen.getByRole('button', { name: /suggest edit/i }))
    expect(handlers.onSuggestEdit).toHaveBeenCalled()
  })

  it('calls onSuggestDelete when Suggest Delete is clicked', () => {
    renderActions('suggester')
    fireEvent.click(screen.getByRole('button', { name: /suggest delete/i }))
    expect(handlers.onSuggestDelete).toHaveBeenCalled()
  })
})

describe('ApiDetailActions — viewer', () => {
  it('shows no action buttons', () => {
    renderActions('viewer')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
