'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseOpenAPI } from '@/lib/parsers/openapi'
import { cn } from '@/lib/utils'

interface Props {
  projectId: string
  projectName?: string
  onClose: () => void
  onImport?: (entries: Record<string, unknown>[]) => Promise<{ error: string } | undefined>
}

export function OpenAPIImportModal({ projectId, projectName, onClose, onImport }: Props) {
  const [raw, setRaw] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ReturnType<typeof parseOpenAPI>['entries']>([])
  const [importing, setImporting] = useState(false)

  function handleParse() {
    setParseError(null)
    setPreview([])
    const result = parseOpenAPI(raw)
    if (result.error) {
      setParseError(result.error)
      return
    }
    setPreview(result.entries)
  }

  async function handleImport() {
    setImporting(true)
    if (onImport) {
      await onImport(preview as Record<string, unknown>[])
    } else {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setImporting(false); return }
      const rows = preview.map((e) => ({ ...e, project_id: projectId, created_by: user.id }))
      await supabase.from('api_entries').insert(rows)
    }
    setImporting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Import from OpenAPI / Swagger</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {preview.length === 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Paste an OpenAPI 3.0 or Swagger 2.0 JSON spec below.
              </p>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={14}
                placeholder='{"openapi":"3.0.0", ...}'
                className={cn(
                  'w-full px-3 py-2 border rounded-md text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring',
                  parseError && 'border-destructive'
                )}
              />
              {parseError && (
                <p className="text-sm text-destructive">{parseError}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Found <strong>{preview.length}</strong> API{preview.length !== 1 ? 's' : ''}. Review before importing.
              </p>
              <ul className="space-y-1 border rounded-md divide-y max-h-64 overflow-y-auto">
                {preview.map((e, i) => (
                  <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="font-mono text-xs font-semibold text-blue-700 w-14 shrink-0">{e.method}</span>
                    <span className="font-mono text-xs text-muted-foreground truncate">{e.endpoint}</span>
                    {e.group && <span className="text-xs text-muted-foreground ml-auto shrink-0">{e.group}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-3 py-1.5 border rounded-md text-sm hover:bg-accent">
            Cancel
          </button>
          {preview.length === 0 ? (
            <button
              onClick={handleParse}
              disabled={!raw.trim()}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Parse
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {importing ? 'Importing…' : `Import ${preview.length} APIs`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
