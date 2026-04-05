import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OpenAPIImportModal } from '@/components/import/OpenAPIImportModal'

// Helper: paste JSON into a textarea (user.type breaks on { characters)
function pasteInto(el: HTMLElement, text: string) {
  fireEvent.change(el, { target: { value: text } })
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const mockInsert = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: () => ({ insert: mockInsert }),
  }),
}))

const validSpec = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'T', version: '1' },
  paths: {
    '/users': { get: { summary: 'List users', responses: { '200': { description: 'ok' } } } },
    '/orders': { post: { summary: 'Create order', responses: { '201': { description: 'ok' } } } },
  },
})

describe('OpenAPIImportModal', () => {
  beforeEach(() => {
    mockInsert.mockReset()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('renders a textarea and a Parse button', () => {
    render(<OpenAPIImportModal projectId="p1" onClose={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /parse/i })).toBeInTheDocument()
  })

  it('shows a parse error for invalid JSON', async () => {
    const user = userEvent.setup()
    render(<OpenAPIImportModal projectId="p1" onClose={vi.fn()} />)
    pasteInto(screen.getByRole('textbox'), 'bad json')
    await user.click(screen.getByRole('button', { name: /parse/i }))
    await waitFor(() => {
      expect(screen.getByText(/invalid json/i)).toBeInTheDocument()
    })
  })

  it('shows a preview list after parsing a valid spec', async () => {
    const user = userEvent.setup()
    render(<OpenAPIImportModal projectId="p1" onClose={vi.fn()} />)
    pasteInto(screen.getByRole('textbox'), validSpec)
    await user.click(screen.getByRole('button', { name: /parse/i }))
    await waitFor(() => {
      expect(screen.getByText('/users')).toBeInTheDocument()
      expect(screen.getByText('/orders')).toBeInTheDocument()
    })
  })

  it('shows Import N APIs button after parsing', async () => {
    const user = userEvent.setup()
    render(<OpenAPIImportModal projectId="p1" onClose={vi.fn()} />)
    pasteInto(screen.getByRole('textbox'), validSpec)
    await user.click(screen.getByRole('button', { name: /parse/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /import 2/i })).toBeInTheDocument()
    })
  })

  it('calls supabase insert and onClose when Import is confirmed', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<OpenAPIImportModal projectId="p1" onClose={onClose} />)
    pasteInto(screen.getByRole('textbox'), validSpec)
    await user.click(screen.getByRole('button', { name: /parse/i }))
    await waitFor(() => screen.getByRole('button', { name: /import 2/i }))
    await user.click(screen.getByRole('button', { name: /import 2/i }))
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })
})
