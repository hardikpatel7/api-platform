import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectActionBar } from '@/components/api/ProjectActionBar'
import type { UserRole } from '@/types'

const handlers = {
  onAddApi: vi.fn(),
  onImportHAR: vi.fn(),
  onImportOpenAPI: vi.fn(),
  onSuggestNewApi: vi.fn(),
}

function renderBar(role: UserRole) {
  return render(<ProjectActionBar role={role} {...handlers} />)
}

describe('ProjectActionBar — editor', () => {
  it('shows Add API, Import HAR, Import OpenAPI buttons', () => {
    renderBar('editor')
    expect(screen.getByRole('button', { name: /add api/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import har/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import openapi/i })).toBeInTheDocument()
  })

  it('does not show Suggest New API', () => {
    renderBar('editor')
    expect(screen.queryByRole('button', { name: /suggest new api/i })).not.toBeInTheDocument()
  })

  it('calls onAddApi when Add API is clicked', () => {
    renderBar('editor')
    fireEvent.click(screen.getByRole('button', { name: /add api/i }))
    expect(handlers.onAddApi).toHaveBeenCalled()
  })

  it('calls onImportHAR when Import HAR is clicked', () => {
    renderBar('editor')
    fireEvent.click(screen.getByRole('button', { name: /import har/i }))
    expect(handlers.onImportHAR).toHaveBeenCalled()
  })

  it('calls onImportOpenAPI when Import OpenAPI is clicked', () => {
    renderBar('editor')
    fireEvent.click(screen.getByRole('button', { name: /import openapi/i }))
    expect(handlers.onImportOpenAPI).toHaveBeenCalled()
  })
})

describe('ProjectActionBar — admin', () => {
  it('shows all editor buttons', () => {
    renderBar('admin')
    expect(screen.getByRole('button', { name: /add api/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import har/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import openapi/i })).toBeInTheDocument()
  })
})

describe('ProjectActionBar — suggester', () => {
  it('shows Suggest New API button', () => {
    renderBar('suggester')
    expect(screen.getByRole('button', { name: /suggest new api/i })).toBeInTheDocument()
  })

  it('does not show Add API, Import HAR, Import OpenAPI', () => {
    renderBar('suggester')
    expect(screen.queryByRole('button', { name: /add api/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /import har/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /import openapi/i })).not.toBeInTheDocument()
  })

  it('calls onSuggestNewApi when Suggest New API is clicked', () => {
    renderBar('suggester')
    fireEvent.click(screen.getByRole('button', { name: /suggest new api/i }))
    expect(handlers.onSuggestNewApi).toHaveBeenCalled()
  })
})

describe('ProjectActionBar — viewer', () => {
  it('shows no buttons', () => {
    renderBar('viewer')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
