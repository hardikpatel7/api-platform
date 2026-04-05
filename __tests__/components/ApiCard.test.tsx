import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiCard } from '@/components/api/ApiCard'
import type { ApiEntry } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const baseEntry: ApiEntry = {
  id: 'api-1',
  project_id: 'p1',
  name: 'Get Inventory Items',
  endpoint: '/api/v1/items',
  method: 'GET',
  status: 'Stable',
  version: 'v1',
  tags: ['read-only', 'public'],
  created_by: 'u1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('ApiCard', () => {
  it('renders the API name', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" />)
    expect(screen.getByText('Get Inventory Items')).toBeInTheDocument()
  })

  it('renders the HTTP method badge', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" />)
    expect(screen.getByText('GET')).toBeInTheDocument()
  })

  it('renders the endpoint path', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" />)
    expect(screen.getByText('/api/v1/items')).toBeInTheDocument()
  })

  it('renders the status badge', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" />)
    expect(screen.getByText('Stable')).toBeInTheDocument()
  })

  it('renders the version badge', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" />)
    expect(screen.getByText('v1')).toBeInTheDocument()
  })

  it('renders tag pills', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" />)
    expect(screen.getByText('read-only')).toBeInTheDocument()
    expect(screen.getByText('public')).toBeInTheDocument()
  })

  it('does not render tags section when tags are empty', () => {
    render(<ApiCard entry={{ ...baseEntry, tags: [] }} projectId="p1" />)
    expect(screen.queryByText('read-only')).not.toBeInTheDocument()
  })

  it('links to the API detail page', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/projects/p1/apis/api-1')
  })

  it('applies blue color class to GET badge', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" />)
    const badge = screen.getByText('GET')
    expect(badge.className).toMatch(/blue/)
  })

  it('applies red color class to DELETE badge', () => {
    render(<ApiCard entry={{ ...baseEntry, method: 'DELETE' }} projectId="p1" />)
    const badge = screen.getByText('DELETE')
    expect(badge.className).toMatch(/red/)
  })

  it('applies green color class to Stable status badge', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" />)
    const badge = screen.getByText('Stable')
    expect(badge.className).toMatch(/green/)
  })

  it('applies red color class to Deprecated status badge', () => {
    render(<ApiCard entry={{ ...baseEntry, status: 'Deprecated' }} projectId="p1" />)
    const badge = screen.getByText('Deprecated')
    expect(badge.className).toMatch(/red/)
  })

  it('shows project name badge when projectName prop is provided', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" projectName="Payments API" />)
    expect(screen.getByText('Payments API')).toBeInTheDocument()
  })

  it('does not show project name badge when projectName is not provided', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" />)
    expect(screen.queryByTestId('project-name-badge')).not.toBeInTheDocument()
  })

  it('shows a pending badge when hasPendingSuggestion is true', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" hasPendingSuggestion />)
    expect(screen.getByText(/pending/i)).toBeInTheDocument()
  })

  it('does not show pending badge when hasPendingSuggestion is false', () => {
    render(<ApiCard entry={baseEntry} projectId="p1" hasPendingSuggestion={false} />)
    expect(screen.queryByText(/pending/i)).not.toBeInTheDocument()
  })
})
