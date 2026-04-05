'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SuggestionCard } from './SuggestionCard'
import type { Suggestion, UserRole } from '@/types'

type Tab = 'pending' | 'approved' | 'rejected'

interface SuggestionPanelProps {
  suggestions: Suggestion[]
  role: UserRole
  currentUserId?: string
  onApprove?: (id: string) => void
  onReject?: (id: string, note: string) => void
  onWithdraw?: (id: string) => void
}

export function SuggestionPanel({
  suggestions,
  role,
  currentUserId,
  onApprove,
  onReject,
  onWithdraw,
}: SuggestionPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pending')

  const counts: Record<Tab, number> = {
    pending:  suggestions.filter((s) => s.status === 'pending').length,
    approved: suggestions.filter((s) => s.status === 'approved').length,
    rejected: suggestions.filter((s) => s.status === 'rejected').length,
  }

  const visible = suggestions.filter((s) => s.status === activeTab)

  const tabs: Tab[] = ['pending', 'approved', 'rejected']

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2 text-sm capitalize flex items-center justify-center gap-1.5',
              activeTab === tab
                ? 'border-b-2 border-primary font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
            <span data-count className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No {activeTab} suggestions
          </p>
        ) : (
          visible.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              role={role}
              currentUserId={currentUserId}
              onApprove={onApprove}
              onReject={onReject}
              onWithdraw={onWithdraw}
            />
          ))
        )}
      </div>
    </div>
  )
}
