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
    // selects[0] is the Add User form select; selects[1] is Bob's (first non-current user)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[1], { target: { value: 'viewer' } })
    await waitFor(() => {
      expect(onChangeRole).toHaveBeenCalledWith('u2', 'viewer')
    })
  })

  it('does not render a role dropdown for the current user', () => {
    render(<UserManagementModal users={mockUsers} currentUserId="u1" onClose={vi.fn()} />)
    // u2 and u3 have dropdowns + the Add User form select = 3 total
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
  })
})

describe('UserManagementModal — add user', () => {
  it('shows an Add User form with name, email inputs and role selector', () => {
    render(<UserManagementModal users={mockUsers} currentUserId="u1" onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument()
  })

  it('calls onAddUser with name, role, and email when form is submitted', async () => {
    const onAddUser = vi.fn().mockResolvedValue(undefined)
    render(
      <UserManagementModal
        users={mockUsers}
        currentUserId="u1"
        onClose={vi.fn()}
        onAddUser={onAddUser}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: 'Dave' } })
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'dave@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /add user/i }))
    await waitFor(() => {
      expect(onAddUser).toHaveBeenCalledWith('Dave', expect.any(String), 'dave@example.com')
    })
  })

  it('does not call onAddUser when name is empty', async () => {
    const onAddUser = vi.fn()
    render(
      <UserManagementModal
        users={mockUsers}
        currentUserId="u1"
        onClose={vi.fn()}
        onAddUser={onAddUser}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /add user/i }))
    expect(onAddUser).not.toHaveBeenCalled()
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
