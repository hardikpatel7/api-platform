'use client'

import { canDo } from '@/lib/permissions'
import type { UserRole } from '@/types'

interface ApiDetailActionsProps {
  role: UserRole
  onEdit: () => void
  onDelete: () => void
  onSuggestEdit: () => void
  onSuggestDelete: () => void
}

export function ApiDetailActions({ role, onEdit, onDelete, onSuggestEdit, onSuggestDelete }: ApiDetailActionsProps) {
  if (canDo(role, 'direct_edit')) {
    return (
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 border rounded-md text-sm hover:bg-accent"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 border border-destructive text-destructive rounded-md text-sm hover:bg-destructive/10"
        >
          Delete
        </button>
      </div>
    )
  }

  if (canDo(role, 'suggest')) {
    return (
      <div className="flex gap-2">
        <button
          onClick={onSuggestEdit}
          className="px-3 py-1.5 border rounded-md text-sm hover:bg-accent"
        >
          Suggest Edit
        </button>
        <button
          onClick={onSuggestDelete}
          className="px-3 py-1.5 border border-destructive text-destructive rounded-md text-sm hover:bg-destructive/10"
        >
          Suggest Delete
        </button>
      </div>
    )
  }

  return null
}
