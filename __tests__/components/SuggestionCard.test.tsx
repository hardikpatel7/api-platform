import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SuggestionCard } from '@/components/suggestions/SuggestionCard'
import type { Suggestion, UserRole } from '@/types'

const editSuggestion: Suggestion = {
  id: 's1',
  type: 'edit',
  project_id: 'p1',
  project_name: 'Alpha API',
  api_id: 'a1',
  api_name: 'Get Users',
  user_id: 'u1',
  user_name: 'Alice',
  payload: { name: 'List Users', method: 'GET', endpoint: '/api/users' },
  original: { name: 'Get Users', method: 'GET', endpoint: '/api/users' },
  status: 'pending',
  created_at: '2024-01-15T10:00:00Z',
}

describe('SuggestionCard — display', () => {
  it('shows the type badge', () => {
    render(<SuggestionCard suggestion={editSuggestion} role="editor" />)
    expect(screen.getByText(/edit/i)).toBeInTheDocument()
  })

  it('shows the API name', () => {
    render(<SuggestionCard suggestion={editSuggestion} role="editor" />)
    expect(screen.getByText('Get Users')).toBeInTheDocument()
  })

  it('shows the project name', () => {
    render(<SuggestionCard suggestion={editSuggestion} role="editor" />)
    expect(screen.getByText('Alpha API')).toBeInTheDocument()
  })

  it('shows the submitter name', () => {
    render(<SuggestionCard suggestion={editSuggestion} role="editor" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('diff is collapsed by default', () => {
    render(<SuggestionCard suggestion={editSuggestion} role="editor" />)
    expect(screen.queryByText('List Users')).not.toBeInTheDocument()
  })

  it('expands diff when toggle is clicked', () => {
    render(<SuggestionCard suggestion={editSuggestion} role="editor" />)
    fireEvent.click(screen.getByRole('button', { name: /expand|show diff|view/i }))
    expect(screen.getByText('List Users')).toBeInTheDocument()
  })

  it('collapses diff when toggle is clicked again', () => {
    render(<SuggestionCard suggestion={editSuggestion} role="editor" />)
    const toggle = screen.getByRole('button', { name: /expand|show diff|view/i })
    fireEvent.click(toggle)
    fireEvent.click(toggle)
    expect(screen.queryByText('List Users')).not.toBeInTheDocument()
  })
})

describe('SuggestionCard — editor approve/reject controls', () => {
  it('shows Approve and Reject buttons for editor on pending suggestion', () => {
    render(<SuggestionCard suggestion={editSuggestion} role="editor" />)
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })

  it('calls onApprove when Approve is clicked', () => {
    const onApprove = vi.fn()
    render(<SuggestionCard suggestion={editSuggestion} role="editor" onApprove={onApprove} />)
    fireEvent.click(screen.getByRole('button', { name: /approve/i }))
    expect(onApprove).toHaveBeenCalledWith('s1')
  })

  it('shows rejection note input when Reject is clicked', () => {
    render(<SuggestionCard suggestion={editSuggestion} role="editor" />)
    fireEvent.click(screen.getByRole('button', { name: /reject/i }))
    expect(screen.getByPlaceholderText(/reason/i)).toBeInTheDocument()
  })

  it('calls onReject with id and note when Confirm is clicked', () => {
    const onReject = vi.fn()
    render(<SuggestionCard suggestion={editSuggestion} role="editor" onReject={onReject} />)
    fireEvent.click(screen.getByRole('button', { name: /reject/i }))
    fireEvent.change(screen.getByPlaceholderText(/reason/i), { target: { value: 'Not needed' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onReject).toHaveBeenCalledWith('s1', 'Not needed')
  })
})

describe('SuggestionCard — suggester withdraw control', () => {
  it('shows Withdraw button for suggester on own pending suggestion', () => {
    render(<SuggestionCard suggestion={editSuggestion} role="suggester" currentUserId="u1" />)
    expect(screen.getByRole('button', { name: /withdraw/i })).toBeInTheDocument()
  })

  it('does not show Withdraw for someone else\'s suggestion', () => {
    render(<SuggestionCard suggestion={editSuggestion} role="suggester" currentUserId="u2" />)
    expect(screen.queryByRole('button', { name: /withdraw/i })).not.toBeInTheDocument()
  })

  it('calls onWithdraw when Withdraw is clicked', () => {
    const onWithdraw = vi.fn()
    render(<SuggestionCard suggestion={editSuggestion} role="suggester" currentUserId="u1" onWithdraw={onWithdraw} />)
    fireEvent.click(screen.getByRole('button', { name: /withdraw/i }))
    expect(onWithdraw).toHaveBeenCalledWith('s1')
  })
})

describe('SuggestionCard — viewer', () => {
  it('shows no action buttons for viewer', () => {
    render(<SuggestionCard suggestion={editSuggestion} role="viewer" />)
    expect(screen.queryByRole('button', { name: /approve|reject|withdraw/i })).not.toBeInTheDocument()
  })
})

describe('SuggestionCard — non-pending', () => {
  it('shows no approve/reject on approved suggestion', () => {
    const approved = { ...editSuggestion, status: 'approved' as const }
    render(<SuggestionCard suggestion={approved} role="editor" />)
    expect(screen.queryByRole('button', { name: /approve|reject/i })).not.toBeInTheDocument()
  })

  it('shows rejection note when suggestion is rejected with a note', () => {
    const rejected: Suggestion = {
      ...editSuggestion,
      status: 'rejected',
      review_note: 'Not aligned with roadmap',
    }
    render(<SuggestionCard suggestion={rejected} role="suggester" currentUserId="u1" />)
    expect(screen.getByText('Not aligned with roadmap')).toBeInTheDocument()
  })
})
