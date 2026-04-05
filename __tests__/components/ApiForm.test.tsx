import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiForm } from '@/components/api/ApiForm'
import type { ApiEntry } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

const onSubmit = vi.fn()

describe('ApiForm — required fields', () => {
  beforeEach(() => onSubmit.mockReset())

  it('renders Name, Method, Endpoint fields', () => {
    render(<ApiForm onSubmit={onSubmit} />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/method/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/endpoint/i)).toBeInTheDocument()
  })

  it('calls onSubmit with form data when valid', async () => {
    onSubmit.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ApiForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/name/i), 'Get Items')
    await user.type(screen.getByLabelText(/endpoint/i), '/api/v1/items')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Get Items', endpoint: '/api/v1/items' })
      )
    })
  })

  it('populates fields with initialData when editing', () => {
    const initialData: Partial<ApiEntry> = {
      name: 'Existing API',
      endpoint: '/api/v1/existing',
      method: 'POST',
      version: 'v2',
      status: 'Beta',
    }
    render(<ApiForm onSubmit={onSubmit} initialData={initialData} />)
    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Existing API')
    expect((screen.getByLabelText(/endpoint/i) as HTMLInputElement).value).toBe('/api/v1/existing')
  })
})

describe('ApiForm — JSON validation (Schema tab)', () => {
  it('shows no error for empty schema field', async () => {
    render(<ApiForm onSubmit={onSubmit} />)
    // Empty is valid (optional field)
    expect(screen.queryByText(/invalid json/i)).not.toBeInTheDocument()
  })

  it('shows inline error when request schema has invalid JSON', async () => {
    const user = userEvent.setup()
    render(<ApiForm onSubmit={onSubmit} />)

    const schemaField = screen.getByLabelText(/request schema/i)
    await user.type(schemaField, '{{invalid json')
    await user.tab() // blur to trigger validation

    await waitFor(() => {
      // Use selector 'p' to avoid matching the textarea value
      expect(screen.getByText(/invalid json/i, { selector: 'p' })).toBeInTheDocument()
    })
  })

  it('clears the error when valid JSON is entered', async () => {
    const user = userEvent.setup()
    render(<ApiForm onSubmit={onSubmit} />)

    const schemaField = screen.getByLabelText(/request schema/i)
    await user.type(schemaField, '{{invalid')
    fireEvent.blur(schemaField)

    await waitFor(() => {
      expect(screen.getByText(/invalid json/i, { selector: 'p' })).toBeInTheDocument()
    })

    await user.clear(schemaField)
    await user.type(schemaField, '{{"type":"object"}')
    fireEvent.blur(schemaField)

    await waitFor(() => {
      expect(screen.queryByText(/invalid json/i, { selector: 'p' })).not.toBeInTheDocument()
    })
  })

  it('shows inline error when MCP config has invalid JSON', async () => {
    const user = userEvent.setup()
    render(<ApiForm onSubmit={onSubmit} />)

    const mcpField = screen.getByLabelText(/mcp config/i)
    await user.type(mcpField, 'not-valid-json')
    fireEvent.blur(mcpField)

    await waitFor(() => {
      expect(screen.getByText(/invalid json/i, { selector: 'p' })).toBeInTheDocument()
    })
  })
})
