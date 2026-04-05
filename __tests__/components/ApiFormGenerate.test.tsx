import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiForm } from '@/components/api/ApiForm'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

const mockGenerate = vi.fn()

describe('ApiForm — AI Generate button', () => {
  beforeEach(() => mockGenerate.mockReset())

  it('renders an AI Generate button when onGenerate is provided', () => {
    render(<ApiForm onSubmit={vi.fn()} onGenerate={mockGenerate} />)
    expect(screen.getByRole('button', { name: /ai generate/i })).toBeInTheDocument()
  })

  it('does not render AI Generate button when onGenerate is absent', () => {
    render(<ApiForm onSubmit={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /ai generate/i })).not.toBeInTheDocument()
  })

  it('calls onGenerate with name, method, endpoint', async () => {
    mockGenerate.mockResolvedValue({
      tool_description: 'Fetches items',
      mcp_config: { name: 'get_items', description: '', inputSchema: { type: 'object', properties: {}, required: [] } },
    })
    const user = userEvent.setup()
    render(<ApiForm onSubmit={vi.fn()} onGenerate={mockGenerate} />)

    await user.type(screen.getByLabelText(/^name/i), 'Get Items')
    await user.type(screen.getByLabelText(/endpoint/i), '/api/v1/items')
    await user.click(screen.getByRole('button', { name: /ai generate/i }))

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Get Items', method: 'GET', endpoint: '/api/v1/items' })
      )
    })
  })

  it('populates tool_description after generation', async () => {
    mockGenerate.mockResolvedValue({
      tool_description: 'Fetches items from inventory',
      mcp_config: { name: 'get_items', description: '', inputSchema: { type: 'object', properties: {}, required: [] } },
    })
    const user = userEvent.setup()
    render(<ApiForm onSubmit={vi.fn()} onGenerate={mockGenerate} />)

    await user.type(screen.getByLabelText(/^name/i), 'Get Items')
    await user.click(screen.getByRole('button', { name: /ai generate/i }))

    await waitFor(() => {
      const textarea = screen.getByLabelText(/tool description/i) as HTMLTextAreaElement
      expect(textarea.value).toBe('Fetches items from inventory')
    })
  })

  it('shows a loading state during generation', async () => {
    let resolve!: (v: unknown) => void
    mockGenerate.mockReturnValue(new Promise((r) => { resolve = r }))
    render(<ApiForm onSubmit={vi.fn()} onGenerate={mockGenerate} />)

    // Pre-fill name so button is enabled
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Get Items' } })
    fireEvent.click(screen.getByRole('button', { name: /ai generate/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument()
    })

    resolve({
      tool_description: 'Done',
      mcp_config: { name: 'x', description: '', inputSchema: { type: 'object', properties: {}, required: [] } },
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ai generate/i })).toBeInTheDocument()
    })
  })
})
