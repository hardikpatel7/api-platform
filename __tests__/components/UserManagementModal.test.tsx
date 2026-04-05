import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserManagementModal } from '@/components/settings/UserManagementModal'
import type { User } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const mockUsers: User[] = [
  { id: 'u1', name: 'Alice', role: 'admin', created_at: '2024-01-01T00:00:00Z' },
  { id: 'u2', name: 'Bob', role: 'editor', created_at: '2024-01-02T00:00:00Z' },
  { id: 'u3', name: 'Carol', role: 'viewer', created_at: '2024-01-03T00:00:00Z' },
]

describe('UserManagementModal — display', () => {
  it('renders all users', () => {
    render(<UserManagementModal users={mockUsers} currentUserId="u1" onClose={vi.fn()} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carol')).toBeInTheDocument()
  })

  it('shows role badge for each user', () => {
    render(<UserManagementModal users={mockUsers} currentUserId="u1" onClose={vi.fn()} />)
    // use selector to target badge spans, not select options
    expect(screen.getAllByText('admin', { selector: 'span' })).toHaveLength(1)
    expect(screen.getAllByText('editor', { selector: 'span' })).toHaveLength(1)
  })

  it('marks the current user as (you)', () => {
    render(<UserManagementModal users={mockUsers} currentUserId="u1" onClose={vi.fn()} />)
    expect(screen.getByText('(you)')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<UserManagementModal users={mockUsers} currentUserId="u1" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('UserManagementModal — role change', () => {
  it('calls onChangeRole with userId and new role when role dropdown changes', async () => {
    const onChangeRole = vi.fn().mockResolvedValue(undefined)
    render(
      <UserManagementModal
        users={mockUsers}
        currentUserId="u1"
        onClose={vi.fn()}
        onChangeRole={onChangeRole}
      />
    )
    // Bob's role dropdown (u2)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'viewer' } })
    await waitFor(() => {
      expect(onChangeRole).toHaveBeenCalledWith('u2', 'viewer')
    })
  })

  it('does not render a role dropdown for the current user', () => {
    render(<UserManagementModal users={mockUsers} currentUserId="u1" onClose={vi.fn()} />)
    // Only u2 and u3 should have dropdowns — u1 is current user
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
  })
})

describe('UserManagementModal — delete user', () => {
  it('shows a delete button for other users', () => {
    render(<UserManagementModal users={mockUsers} currentUserId="u1" onClose={vi.fn()} />)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteButtons).toHaveLength(2) // Bob and Carol, not Alice
  })

  it('calls onDeleteUser when delete is confirmed', async () => {
    const onDeleteUser = vi.fn().mockResolvedValue(undefined)
    render(
      <UserManagementModal
        users={mockUsers}
        currentUserId="u1"
        onClose={vi.fn()}
        onDeleteUser={onDeleteUser}
      />
    )
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    await waitFor(() => {
      expect(onDeleteUser).toHaveBeenCalledWith('u2')
    })
  })
})
