'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { SuggestionCard } from './SuggestionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { CheckCircle2, Lightbulb, ClipboardList } from 'lucide-react'
import type { Suggestion, UserRole } from '@/types'

type Tab = 'pending' | 'approved' | 'rejected'

interface SuggestionPanelProps {
  suggestions: Suggestion[]
  role: UserRole
  currentUserId?: string
  onApprove?: (id: string) => void
  onReject?: (id: string, note: string) => void
  onWithdraw?: (id: string) => void
  onBrowse?: () => void
}

const EMPTY_STATES: Record<Tab, {
  editor: { icon: React.ReactNode; title: string; description: string }
  default: { icon: React.ReactNode; title: string; description: string }
}> = {
  pending: {
    editor: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: 'All caught up',
      description: 'No pending suggestions right now. Team suggestions will appear here for your review.',
    },
    default: {
      icon: <Lightbulb className="w-5 h-5" />,
      title: 'No pending suggestions',
      description: 'Browse API entries and suggest edits or additions for editors to review.',
    },
  },
  approved: {
    editor: {
      icon: <ClipboardList className="w-5 h-5" />,
      title: 'No approved suggestions',
      description: 'Approved suggestions will be archived here after editors accept them.',
    },
    default: {
      icon: <ClipboardList className="w-5 h-5" />,
      title: 'No approved suggestions',
      description: 'Approved suggestions will be archived here after editors accept them.',
    },
  },
  rejected: {
    editor: {
      icon: <ClipboardList className="w-5 h-5" />,
      title: 'No rejected suggestions',
      description: 'Suggestions that were declined will be archived here.',
    },
    default: {
      icon: <ClipboardList className="w-5 h-5" />,
      title: 'No rejected suggestions',
      description: 'Suggestions that were declined will be archived here.',
    },
  },
}

export function SuggestionPanel({
  suggestions,
  role,
  currentUserId,
  onApprove,
  onReject,
  onWithdraw,
  onBrowse,
}: SuggestionPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pending')

  const counts: Record<Tab, number> = {
    pending:  suggestions.filter((s) => s.status === 'pending').length,
    approved: suggestions.filter((s) => s.status === 'approved').length,
    rejected: suggestions.filter((s) => s.status === 'rejected').length,
  }

  const visible = suggestions.filter((s) => s.status === activeTab)
  const tabs: Tab[] = ['pending', 'approved', 'rejected']

  function renderEmpty(tab: Tab) {
    const isEditor = role === 'editor' || role === 'admin'
    const state = isEditor ? EMPTY_STATES[tab].editor : EMPTY_STATES[tab].default
    const actions =
      tab === 'pending' && !isEditor && onBrowse
        ? [{ label: 'Browse projects', variant: 'primary' as const, onClick: onBrowse }]
        : undefined
    return (
      <EmptyState
        icon={state.icon}
        title={state.title}
        description={state.description}
        actions={actions}
      />
    )
  }

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
          renderEmpty(activeTab)
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
