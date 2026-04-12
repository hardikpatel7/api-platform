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
    <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center">
      {/* Radial glow + icon */}
      <div className="relative mb-7 flex items-center justify-center">
        {/* diffuse glow layer */}
        <div
          className="animate-pulse-glow absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
            width: '88px',
            height: '88px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(12px)',
          }}
        />
        <div
          className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            borderColor: 'rgba(255,255,255,0.1)',
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.5)',
          }}
        >
          <span className="text-zinc-300 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        </div>
      </div>

      {/* Decorative rule with dot */}
      <div className="mb-4 flex items-center gap-2.5">
        <div
          className="h-px w-12"
          style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }}
        />
        <div
          className="h-1 w-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        />
        <div
          className="h-px w-12"
          style={{ background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.12))' }}
        />
      </div>

      {/* Title */}
      <h3
        className="mb-2 text-base font-semibold tracking-tight text-zinc-100"
        style={{ fontFamily: 'var(--font-sora, system-ui)' }}
      >
        {title}
      </h3>

      {/* Description */}
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-zinc-500">
        {description}
      </p>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2.5">
          {actions.map((action) => {
            if (action.variant === 'primary') {
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="group relative overflow-hidden rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(99,102,241,0.9) 0%, rgba(79,70,229,0.9) 100%)',
                    boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 0 4px 16px rgba(99,102,241,0.25)',
                  }}
                >
                  {/* Shimmer sweep */}
                  <span
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                  />
                  <span className="relative">{action.label}</span>
                </button>
              )
            }

            if (action.variant === 'ai') {
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(139,92,246,0.85) 0%, rgba(124,58,237,0.85) 100%)',
                    boxShadow: '0 1px 0 rgba(255,255,255,0.1) inset, 0 4px 16px rgba(139,92,246,0.2)',
                  }}
                >
                  {action.label}
                </button>
              )
            }

            // secondary
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100 disabled:opacity-40"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {action.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
