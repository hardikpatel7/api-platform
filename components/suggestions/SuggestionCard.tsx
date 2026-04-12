'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { canDo } from '@/lib/permissions'
import { DiffView } from './DiffView'
import { Check, X, Undo2 } from 'lucide-react'
import type { Suggestion, UserRole } from '@/types'

interface SuggestionCardProps {
  suggestion: Suggestion
  role: UserRole
  currentUserId?: string
  onApprove?: (id: string) => void
  onReject?: (id: string, note: string) => void
  onWithdraw?: (id: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  edit: 'edit',
  create: 'create',
  delete: 'delete',
}

const TYPE_COLORS: Record<string, string> = {
  edit: 'bg-blue-100 text-blue-700',
  create: 'bg-green-100 text-green-700',
  delete: 'bg-red-100 text-red-700',
}

export function SuggestionCard({
  suggestion,
  role,
  currentUserId,
  onApprove,
  onReject,
  onWithdraw,
}: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  const { id, type, api_name, project_name, user_name, status, review_note, reviewer_name } = suggestion
  const isPending = status === 'pending'
  const isOwn = currentUserId === suggestion.user_id

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-background">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', TYPE_COLORS[type])}>
              {TYPE_LABELS[type]}
            </span>
            <span className="text-sm font-medium">{api_name}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            <span>{project_name}</span>
            <span className="mx-1">·</span>
            <span>{user_name}</span>
            {reviewer_name && (
              <span className="ml-2 text-muted-foreground/70">reviewed by <span>{reviewer_name}</span></span>
            )}
          </p>
        </div>

        <button
          aria-label="View diff"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground shrink-0"
        >
          {expanded ? 'Hide' : 'View diff'}
        </button>
      </div>

      {/* Diff */}
      {expanded && <DiffView suggestion={suggestion} />}

      {/* Rejection note (visible to submitter on rejected suggestions) */}
      {status === 'rejected' && review_note && (
        <p className="text-xs text-muted-foreground italic border-l-2 pl-2">{review_note}</p>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex items-center gap-2 pt-1">
          {canDo(role, 'approve_reject') && !rejecting && (
            <>
              <button
                onClick={() => onApprove?.(id)}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                onClick={() => setRejecting(true)}
                className="px-3 py-1 text-xs border border-destructive text-destructive rounded-md hover:bg-destructive/10 flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
            </>
          )}

          {canDo(role, 'approve_reject') && rejecting && (
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Reason (optional)"
                className="flex-1 px-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={() => { onReject?.(id, rejectNote); setRejecting(false) }}
                className="px-3 py-1 text-xs border border-destructive text-destructive rounded-md hover:bg-destructive/10"
              >
                Confirm
              </button>
            </div>
          )}

          {canDo(role, 'suggest') && !canDo(role, 'approve_reject') && isOwn && (
            <button
              onClick={() => onWithdraw?.(id)}
              className="px-3 py-1 text-xs border rounded-md hover:bg-accent flex items-center gap-1.5"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Withdraw
            </button>
          )}
        </div>
      )}
    </div>
  )
}
