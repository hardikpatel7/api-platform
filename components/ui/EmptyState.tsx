'use client'

import React from 'react'
import type { EmptyStateAction } from '@/types'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actions?: EmptyStateAction[]
}

export function EmptyState({ icon, title, description, actions }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-4">{description}</p>
      {actions && actions.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {actions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={
                action.variant === 'primary'
                  ? 'px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50'
                  : action.variant === 'ai'
                  ? 'px-3 py-1.5 bg-violet-600 text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50'
                  : 'px-3 py-1.5 border rounded-md text-sm font-medium hover:bg-accent disabled:opacity-50'
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
