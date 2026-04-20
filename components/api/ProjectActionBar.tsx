'use client'

import { canDo } from '@/lib/permissions'
import { Plus, FileCode, FileJson, MessageSquarePlus } from 'lucide-react'
import type { UserRole } from '@/types'

interface ProjectActionBarProps {
  role: UserRole
  onAddApi: () => void
  onImportHAR: () => void
  onImportOpenAPI: () => void
  onSuggestNewApi: () => void
}

export function ProjectActionBar({ role, onAddApi, onImportHAR, onImportOpenAPI, onSuggestNewApi }: ProjectActionBarProps) {
  if (canDo(role, 'direct_edit')) {
    return (
      <div className="flex gap-2">
        <button
          onClick={onImportHAR}
          className="px-3 py-1.5 border rounded-md text-sm hover:bg-accent flex items-center gap-1.5"
        >
          <FileJson className="w-3.5 h-3.5" />
          Import HAR
        </button>
        <button
          onClick={onImportOpenAPI}
          className="px-3 py-1.5 border rounded-md text-sm hover:bg-accent flex items-center gap-1.5"
        >
          <FileCode className="w-3.5 h-3.5" />
          Import OpenAPI
        </button>
        <button
          onClick={onAddApi}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add API
        </button>
      </div>
    )
  }

  if (canDo(role, 'suggest')) {
    return (
      <button
        onClick={onSuggestNewApi}
        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 flex items-center gap-1.5"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        Suggest New API
      </button>
    )
  }

  return null
}
