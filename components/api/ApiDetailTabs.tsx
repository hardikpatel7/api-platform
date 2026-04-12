'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { HistoryFeed } from '@/components/history/HistoryFeed'
import { EmptyState } from '@/components/ui/EmptyState'
import { canDo } from '@/lib/permissions'
import type { ApiEntry, HistoryEntry, UserRole } from '@/types'

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-orange-100 text-orange-700',
  PATCH: 'bg-teal-100 text-teal-700',
  DELETE: 'bg-red-100 text-red-700',
  HEAD: 'bg-purple-100 text-purple-700',
}

const STATUS_COLORS: Record<string, string> = {
  Stable: 'bg-green-100 text-green-700',
  Beta: 'bg-amber-100 text-amber-700',
  Deprecated: 'bg-red-100 text-red-700',
  Internal: 'bg-blue-100 text-blue-700',
}

type TabId = 'overview' | 'schema' | 'mcp' | 'snippet' | 'notes' | 'history'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'schema', label: 'Schema' },
  { id: 'mcp', label: 'MCP Config' },
  { id: 'snippet', label: 'Code Snippet' },
  { id: 'notes', label: 'Notes' },
  { id: 'history', label: 'History' },
]

interface ApiDetailTabsProps {
  entry: ApiEntry
  historyEvents?: HistoryEntry[]
  role?: UserRole
  onEdit?: () => void
  onGenerate?: () => void
  generating?: boolean
}

export function ApiDetailTabs({ entry, historyEvents = [], role, onEdit, onGenerate, generating = false }: ApiDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [copied, setCopied] = useState(false)

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function editActions() {
    if (!role || !onEdit || role === 'viewer') return undefined
    const label = canDo(role, 'direct_edit') ? 'Edit API' : 'Suggest Edit'
    return [{ label, variant: 'secondary' as const, onClick: onEdit }]
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b mb-6" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'text-xs font-mono font-semibold px-2 py-0.5 rounded',
                METHOD_COLORS[entry.method] ?? 'bg-muted text-muted-foreground'
              )}
            >
              {entry.method}
            </span>
            <span className="text-sm font-mono text-muted-foreground">{entry.endpoint}</span>
            {entry.status && (
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  STATUS_COLORS[entry.status] ?? 'bg-muted text-muted-foreground'
                )}
              >
                {entry.status}
              </span>
            )}
            {entry.version && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                {entry.version}
              </span>
            )}
          </div>

          {entry.group && (
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Group</span>
              <p className="text-sm mt-0.5">{entry.group}</p>
            </div>
          )}

          {entry.tags && entry.tags.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {entry.tags.map((tag) => (
                  <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {entry.tool_description && (
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tool Description</span>
              <p className="text-sm mt-1 leading-relaxed">{entry.tool_description}</p>
            </div>
          )}
        </div>
      )}

      {/* Schema */}
      {activeTab === 'schema' && (
        !entry.request_schema && !entry.response_schema ? (
          <EmptyState
            icon="📐"
            title="No schema defined"
            description="Edit this API to add request and response schemas."
            actions={editActions()}
          />
        ) : (
          <div className="space-y-6">
            <CodeBlock
              label="Request Schema"
              content={entry.request_schema ? JSON.stringify(entry.request_schema, null, 2) : ''}
              onCopy={handleCopy}
              copied={copied}
            />
            <CodeBlock
              label="Response Schema"
              content={entry.response_schema ? JSON.stringify(entry.response_schema, null, 2) : ''}
              onCopy={handleCopy}
              copied={copied}
            />
          </div>
        )
      )}

      {/* MCP Config */}
      {activeTab === 'mcp' && (
        !entry.mcp_config ? (
          <EmptyState
            icon="⚙️"
            title="No MCP config yet"
            description={role && canDo(role, 'use_ai') ? 'Generate one automatically with AI, or add it manually.' : 'An editor can generate an MCP config for this API.'}
            actions={
              role && canDo(role, 'use_ai') && onGenerate
                ? [
                    ...(onEdit ? [{ label: 'Edit API', variant: 'secondary' as const, onClick: onEdit }] : []),
                    { label: generating ? 'Generating…' : '✨ Generate', variant: 'ai' as const, onClick: onGenerate, disabled: generating },
                  ]
                : editActions()
            }
          />
        ) : (
          <CodeBlock
            label="MCP Config"
            content={JSON.stringify(entry.mcp_config, null, 2)}
            onCopy={handleCopy}
            copied={copied}
          />
        )
      )}

      {/* Code Snippet */}
      {activeTab === 'snippet' && (
        !entry.code_snippet ? (
          <EmptyState
            icon="💻"
            title="No code snippet"
            description="Edit this API to add a usage code snippet."
            actions={editActions()}
          />
        ) : (
          <CodeBlock
            label="Code Snippet"
            content={entry.code_snippet}
            onCopy={handleCopy}
            copied={copied}
          />
        )
      )}

      {/* Notes */}
      {activeTab === 'notes' && (
        !entry.special_notes ? (
          <EmptyState
            icon="📝"
            title="No notes yet"
            description="Edit this API to add notes, caveats, or usage tips."
            actions={editActions()}
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.special_notes}</p>
          </div>
        )
      )}

      {/* History */}
      {activeTab === 'history' && <HistoryFeed events={historyEvents} />}
    </div>
  )
}

interface CodeBlockProps {
  label: string
  content: string
  onCopy: (text: string) => void
  copied: boolean
}

function CodeBlock({ label, content, onCopy, copied }: CodeBlockProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {content && (
          <button
            onClick={() => onCopy(content)}
            className="text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-0.5"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      {content ? (
        <pre className="text-sm font-mono bg-muted rounded-md p-4 overflow-x-auto whitespace-pre-wrap">
          {content}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  )
}
