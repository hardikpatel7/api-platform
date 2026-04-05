import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HARImportModal } from '@/components/import/HARImportModal'

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

const validHAR = JSON.stringify({
  log: {
    entries: [
      {
        request: {
          method: 'GET',
          url: 'https://api.example.com/users',
          queryString: [],
          headers: [],
        },
        response: {
          status: 200,
          content: { mimeType: 'application/json', text: '{"id":1}', size: 8 },
        },
      },
      {
        request: {
          method: 'POST',
          url: 'https://api.example.com/orders',
          queryString: [],
          headers: [],
          postData: { mimeType: 'application/json', text: '{"item":"x"}' },
        },
        response: {
          status: 201,
          content: { mimeType: 'application/json', text: '{"id":2}', size: 8 },
        },
      },
    ],
  },
})

describe('HARImportModal', () => {
  beforeEach(() => {
    mockInsert.mockReset()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('renders a textarea, toggle options, and Parse HAR button', () => {
    render(<HARImportModal projectId="p1" onClose={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /parse har/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/json responses only/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/deduplicate/i)).toBeInTheDocument()
  })

  it('shows a security warning about auth tokens', () => {
    render(<HARImportModal projectId="p1" onClose={vi.fn()} />)
    expect(screen.getByText(/auth token|credential|sensitive/i)).toBeInTheDocument()
  })

  it('shows parse error for invalid JSON', async () => {
    const user = userEvent.setup()
    render(<HARImportModal projectId="p1" onClose={vi.fn()} />)
    pasteInto(screen.getByRole('textbox'), 'bad json')
    await user.click(screen.getByRole('button', { name: /parse har/i }))
    await waitFor(() => {
      expect(screen.getByText(/invalid json/i)).toBeInTheDocument()
    })
  })

  it('shows a checkbox list of parsed entries after parsing', async () => {
    const user = userEvent.setup()
    render(<HARImportModal projectId="p1" onClose={vi.fn()} />)
    pasteInto(screen.getByRole('textbox'), validHAR)
    await user.click(screen.getByRole('button', { name: /parse har/i }))
    await waitFor(() => {
      expect(screen.getByText('/users')).toBeInTheDocument()
      expect(screen.getByText('/orders')).toBeInTheDocument()
    })
  })

  it('shows Select All and Select None buttons after parsing', async () => {
    const user = userEvent.setup()
    render(<HARImportModal projectId="p1" onClose={vi.fn()} />)
    pasteInto(screen.getByRole('textbox'), validHAR)
    await user.click(screen.getByRole('button', { name: /parse har/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /select none/i })).toBeInTheDocument()
    })
  })

  it('calls insert and onClose after confirming import', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<HARImportModal projectId="p1" onClose={onClose} />)
    pasteInto(screen.getByRole('textbox'), validHAR)
    await user.click(screen.getByRole('button', { name: /parse har/i }))
    await waitFor(() => screen.getByRole('button', { name: /import/i }))
    await user.click(screen.getByRole('button', { name: /^import/i }))
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })
})
