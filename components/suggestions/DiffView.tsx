'use client'

import { diffApiEntries } from '@/lib/diff'
import type { Suggestion } from '@/types'

interface DiffViewProps {
  suggestion: Suggestion
}

export function DiffView({ suggestion }: DiffViewProps) {
  const { type, payload, original } = suggestion

  if (type === 'create') {
    const p = payload as Record<string, string> | null
    return (
      <div className="text-sm space-y-1 p-3 bg-muted/40 rounded-md">
        <p className="font-medium">Proposed new API</p>
        <p><span className="text-muted-foreground">Name:</span> {p?.name}</p>
        <p><span className="text-muted-foreground">Method:</span> {p?.method}</p>
        <p><span className="text-muted-foreground">Endpoint:</span> {p?.endpoint}</p>
      </div>
    )
  }

  if (type === 'delete') {
    const o = original as Record<string, string> | null
    return (
      <div className="text-sm space-y-1 p-3 bg-destructive/10 rounded-md">
        <p className="font-medium text-destructive">This API will be deleted</p>
        <p><span className="text-muted-foreground">Name:</span> {o?.name}</p>
        <p><span className="text-muted-foreground">Method:</span> {o?.method}</p>
        <p><span className="text-muted-foreground">Endpoint:</span> {o?.endpoint}</p>
      </div>
    )
  }

  // edit
  const diffs = diffApiEntries(
    (original ?? {}) as Record<string, unknown>,
    (payload ?? {}) as Record<string, unknown>
  )

  if (diffs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic p-3">
        Only tags/JSON fields changed
      </p>
    )
  }

  return (
    <div className="text-sm space-y-2 p-3 bg-muted/40 rounded-md">
      {diffs.map(({ field, original: orig, suggested: sugg }) => (
        <div key={field}>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">{field}</p>
          <del className="block text-destructive line-through">{orig || '(empty)'}</del>
          <ins className="block text-green-700 no-underline">{sugg || '(empty)'}</ins>
        </div>
      ))}
    </div>
  )
}
