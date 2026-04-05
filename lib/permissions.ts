import type { UserRole } from '@/types'

type Action =
  | 'direct_edit'
  | 'suggest'
  | 'approve_reject'
  | 'manage_users'
  | 'view_all_suggestions'
  | 'use_ai'
  | 'import'

const PERMISSIONS: Record<Action, UserRole[]> = {
  direct_edit:          ['editor', 'admin'],
  suggest:              ['suggester', 'editor', 'admin'],
  approve_reject:       ['editor', 'admin'],
  manage_users:         ['admin'],
  view_all_suggestions: ['editor', 'admin'],
  use_ai:               ['editor', 'admin'],
  import:               ['editor', 'admin'],
}

export function canDo(role: UserRole, action: Action): boolean {
  return PERMISSIONS[action].includes(role)
}
