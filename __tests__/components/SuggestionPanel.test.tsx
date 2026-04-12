import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SuggestionPanel } from '@/components/suggestions/SuggestionPanel'
import type { Suggestion, UserRole } from '@/types'

const pending: Suggestion = {
  id: 's1', type: 'edit', project_id: 'p1', project_name: 'Alpha',
  api_id: 'a1', api_name: 'Get Users', user_id: 'u1', user_name: 'Alice',
  payload: { name: 'List Users' }, original: { name: 'Get Users' },
  status: 'pending', created_at: '2024-01-01T00:00:00Z',
}
const approved: Suggestion = {
  ...pending, id: 's2', status: 'approved',
  reviewed_by: 'u2', reviewer_name: 'Bob', reviewed_at: '2024-01-02T00:00:00Z',
}
const rejected: Suggestion = {
  ...pending, id: 's3', status: 'rejected', review_note: 'Not needed',
  reviewed_by: 'u2', reviewer_name: 'Bob', reviewed_at: '2024-01-02T00:00:00Z',
}

const allSuggestions = [pending, approved, rejected]

describe('SuggestionPanel — tabs', () => {
  it('renders Pending, Approved, Rejected tabs', () => {
    render(<SuggestionPanel suggestions={allSuggestions} role="editor" />)
    expect(screen.getByRole('tab', { name: /pending/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /approved/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /rejected/i })).toBeInTheDocument()
  })

  it('shows count badges on each tab', () => {
    render(<SuggestionPanel suggestions={allSuggestions} role="editor" />)
    const badges = screen.getAllByText('1', { selector: '[data-count]' })
    expect(badges).toHaveLength(3)
  })

  it('shows pending suggestions by default', () => {
    render(<SuggestionPanel suggestions={allSuggestions} role="editor" />)
    expect(screen.getByText('Get Users')).toBeInTheDocument()
  })

  it('switches to approved tab and shows reviewer name', () => {
    render(<SuggestionPanel suggestions={allSuggestions} role="editor" />)
    fireEvent.click(screen.getByRole('tab', { name: /approved/i }))
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('switches to rejected tab and shows rejection note', () => {
    render(<SuggestionPanel suggestions={allSuggestions} role="editor" />)
    fireEvent.click(screen.getByRole('tab', { name: /rejected/i }))
    expect(screen.getByText('Not needed')).toBeInTheDocument()
  })
})

describe('SuggestionPanel — empty state', () => {
  it('shows "All caught up" for editor on empty pending tab', () => {
    render(<SuggestionPanel suggestions={[approved, rejected]} role="editor" />)
    expect(screen.getByText('All caught up')).toBeInTheDocument()
  })

  it('shows "No pending suggestions" for suggester on empty pending tab', () => {
    render(<SuggestionPanel suggestions={[approved, rejected]} role="suggester" />)
    expect(screen.getByText('No pending suggestions')).toBeInTheDocument()
  })

  it('shows Browse projects button for suggester on empty pending tab', () => {
    const onBrowse = vi.fn()
    render(
      <SuggestionPanel
        suggestions={[approved, rejected]}
        role="suggester"
        onBrowse={onBrowse}
      />
    )
    const btn = screen.getByRole('button', { name: /browse projects/i })
    fireEvent.click(btn)
    expect(onBrowse).toHaveBeenCalledOnce()
  })

  it('shows "No approved suggestions" on empty approved tab', () => {
    render(<SuggestionPanel suggestions={[pending, rejected]} role="editor" />)
    fireEvent.click(screen.getByRole('tab', { name: /approved/i }))
    expect(screen.getByText('No approved suggestions')).toBeInTheDocument()
  })

  it('shows "No rejected suggestions" on empty rejected tab', () => {
    render(<SuggestionPanel suggestions={[pending, approved]} role="editor" />)
    fireEvent.click(screen.getByRole('tab', { name: /rejected/i }))
    expect(screen.getByText('No rejected suggestions')).toBeInTheDocument()
  })
})

describe('SuggestionPanel — callbacks', () => {
  it('passes onApprove to suggestion cards', () => {
    const onApprove = vi.fn()
    render(<SuggestionPanel suggestions={[pending]} role="editor" onApprove={onApprove} />)
    fireEvent.click(screen.getByRole('button', { name: /approve/i }))
    expect(onApprove).toHaveBeenCalledWith('s1')
  })

  it('passes onWithdraw to suggestion cards for suggesters', () => {
    const onWithdraw = vi.fn()
    render(
      <SuggestionPanel
        suggestions={[pending]}
        role="suggester"
        currentUserId="u1"
        onWithdraw={onWithdraw}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /withdraw/i }))
    expect(onWithdraw).toHaveBeenCalledWith('s1')
  })
})
