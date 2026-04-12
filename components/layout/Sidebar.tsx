'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { canDo } from '@/lib/permissions'
import { FolderOpen, Folder, LayoutGrid, MessageSquare, Users } from 'lucide-react'
import type { Project, UserRole } from '@/types'

const STATUS_VALUES = ['Stable', 'Beta', 'Deprecated', 'Internal'] as const

interface SidebarProps {
  projects: Project[]
  apiCounts: Record<string, number>
  activeProjectId: string | null
  statusFilter: string | null
  tagFilter: string | null
  availableTags: string[]
  onStatusFilter: (status: string | null) => void
  onTagFilter: (tag: string | null) => void
  onSearchResults?: (ids: string[] | null) => void
  searchResultIds?: string[] | null
  onSearch?: (query: string) => Promise<{ ids: string[] }>
  role?: UserRole | null
  pendingSuggestionCount?: number
  onOpenSuggestions?: () => void
  onOpenUsers?: () => void
}

export function Sidebar({
  projects,
  apiCounts,
  activeProjectId,
  statusFilter,
  tagFilter,
  availableTags,
  onStatusFilter,
  onTagFilter,
  onSearchResults,
  searchResultIds,
  onSearch,
  role,
  pendingSuggestionCount = 0,
  onOpenSuggestions,
  onOpenUsers,
}: SidebarProps) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  async function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !searchQuery.trim() || !onSearch || !onSearchResults) return
    setSearching(true)
    const result = await onSearch(searchQuery.trim())
    onSearchResults(result.ids)
    setSearching(false)
  }

  function handleClear() {
    setSearchQuery('')
    onSearchResults?.(null)
  }

  return (
    <aside className="w-60 shrink-0 border-r bg-background flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-4">
        {/* Search bar */}
        {onSearchResults && (
          <div className="px-3 mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Search APIs…"
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring pr-8"
              />
              {searching && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">…</span>
              )}
            </div>
            {searchResultIds && (
              <button
                onClick={handleClear}
                className="mt-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Projects list */}
        <div className="px-3 mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" />
            Projects
          </p>
        </div>
        <nav className="space-y-0.5 px-2">
          {projects.map((project) => {
            const isActive = activeProjectId === project.id
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 rounded-md text-sm border-l-2 transition-all duration-150',
                  isActive
                    ? 'border-l-2 border-primary bg-primary/10 text-accent-foreground font-medium'
                    : 'border-l-2 border-transparent text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                )}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {isActive
                    ? <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                    : <Folder className="w-3.5 h-3.5 shrink-0" />
                  }
                  <span className="truncate">{project.name}</span>
                </span>
                <span className="ml-2 text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5 shrink-0">
                  {apiCounts[project.id] ?? 0}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Filters — visible only inside a project */}
        {activeProjectId && (
          <div className="mt-6 px-3 space-y-4">
            {/* Status filter */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Status
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_VALUES.map((status) => (
                  <button
                    key={status}
                    onClick={() => onStatusFilter(statusFilter === status ? null : status)}
                    className={cn(
                      'text-xs px-2 py-1 rounded-full border transition-colors',
                      statusFilter === status
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag cloud */}
            {availableTags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => onTagFilter(tagFilter === tag ? null : tag)}
                      className={cn(
                        'text-xs px-2 py-1 rounded-full border transition-colors',
                        tagFilter === tag
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear filters */}
            {(statusFilter || tagFilter) && (
              <button
                onClick={() => {
                  onStatusFilter(null)
                  onTagFilter(null)
                }}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer — suggestions + user management */}
      {role && (canDo(role, 'suggest') || canDo(role, 'approve_reject') || canDo(role, 'manage_users')) && (
        <div className="border-t px-3 py-3 space-y-1">
          {(canDo(role, 'suggest') || canDo(role, 'approve_reject')) && (
            <button
              onClick={onOpenSuggestions}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Suggestions
              </span>
              {pendingSuggestionCount > 0 && (
                <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                  {pendingSuggestionCount}
                </span>
              )}
            </button>
          )}
          {canDo(role, 'manage_users') && (
            <button
              onClick={onOpenUsers}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            >
              <Users className="w-3.5 h-3.5" />
              Users
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
