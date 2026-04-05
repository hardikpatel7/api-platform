import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ApiEntry } from '@/types'

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

interface ApiCardProps {
  entry: ApiEntry
  projectId: string
  projectName?: string
  hasPendingSuggestion?: boolean
}

export function ApiCard({ entry, projectId, projectName, hasPendingSuggestion }: ApiCardProps) {
  return (
    <Link
      href={`/projects/${projectId}/apis/${entry.id}`}
      className="block border rounded-lg p-4 hover:border-primary/50 hover:shadow-sm transition-all bg-card"
    >
      <div className="flex items-start gap-3">
        {/* Method badge */}
        <span
          className={cn(
            'shrink-0 text-xs font-mono font-semibold px-2 py-0.5 rounded',
            METHOD_COLORS[entry.method] ?? 'bg-muted text-muted-foreground'
          )}
        >
          {entry.method}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{entry.name}</span>

            {projectName && (
              <span
                data-testid="project-name-badge"
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
              >
                {projectName}
              </span>
            )}

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

            {hasPendingSuggestion && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                Pending review
              </span>
            )}
          </div>

          <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
            {entry.endpoint}
          </p>

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
