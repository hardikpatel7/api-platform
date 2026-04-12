'use client'

import { getActionColor, getActionLabel, type ActionColor } from '@/lib/history'
import type { HistoryEntry } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { Clock } from 'lucide-react'

const DOT_CLASSES: Record<ActionColor, string> = {
  green:  'bg-green-500',
  blue:   'bg-blue-500',
  red:    'bg-red-500',
  amber:  'bg-amber-500',
  purple: 'bg-purple-500',
}

interface HistoryFeedProps {
  events: HistoryEntry[]
}

export function HistoryFeed({ events }: HistoryFeedProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="w-5 h-5" />}
        title="No history yet"
        description="Changes to this API will be logged here automatically."
      />
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const color = getActionColor(event.action)
        return (
          <div key={event.id} className="flex gap-3 items-start">
            <span
              data-action-dot
              className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${DOT_CLASSES[color]}`}
            />
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{getActionLabel(event.action)}</span>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{event.user_role}</span>
                <span className="text-xs text-muted-foreground">{event.user_name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{event.detail}</p>
              <p className="text-xs text-muted-foreground/70">
                {new Date(event.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
