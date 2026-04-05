'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseHAR, type HAREntry } from '@/lib/parsers/har'
import { cn } from '@/lib/utils'

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-blue-700',
  POST: 'text-green-700',
  PUT: 'text-orange-700',
  PATCH: 'text-teal-700',
  DELETE: 'text-red-700',
  HEAD: 'text-purple-700',
}

interface Props {
  projectId: string
  projectName?: string
  onClose: () => void
  onImport?: (entries: Record<string, unknown>[]) => Promise<{ error: string } | undefined>
}

interface SelectableEntry extends HAREntry {
  selected: boolean
}

export function HARImportModal({ projectId, projectName, onClose, onImport }: Props) {
  const [raw, setRaw] = useState('')
  const [jsonOnly, setJsonOnly] = useState(true)
  const [deduplicate, setDeduplicate] = useState(true)
  const [parseError, setParseError] = useState<string | null>(null)
  const [entries, setEntries] = useState<SelectableEntry[]>([])
  const [hosts, setHosts] = useState<string[]>([])
  const [hostFilter, setHostFilter] = useState<string>('all')
  const [importing, setImporting] = useState(false)

  function handleParse() {
    setParseError(null)
    setEntries([])
    const result = parseHAR(raw, { jsonOnly, deduplicate })
    if (result.error) {
      setParseError(result.error)
      return
    }
    setHosts(result.hosts)
    setEntries(result.entries.map((e) => ({ ...e, selected: true })))
  }

  function toggleEntry(i: number) {
    setEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, selected: !e.selected } : e))
  }

  function selectAll() {
    setEntries((prev) => prev.map((e) => ({ ...e, selected: true })))
  }

  function selectNone() {
    setEntries((prev) => prev.map((e) => ({ ...e, selected: false })))
  }

  const visible = hostFilter === 'all' ? entries : entries.filter((e) => e.host === hostFilter)
  const selected = entries.filter((e) => e.selected)

  async function handleImport() {
    setImporting(true)
    const rows = selected.map((e) => ({
      name: `${e.method} ${e.endpoint}`,
      method: e.method,
      endpoint: e.endpoint,
      request_schema: e.request_schema ?? null,
      response_schema: e.response_schema ?? null,
      special_notes: e.special_notes ?? null,
    }))

    if (onImport) {
      await onImport(rows)
    } else {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setImporting(false); return }
      await supabase.from('api_entries').insert(rows.map((r) => ({ ...r, project_id: projectId, created_by: user.id })))
    }
    setImporting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Import from HAR / Network Tab</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Security warning — always visible */}
          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
            <span>⚠️</span>
            <p>HAR files may contain sensitive credentials and auth tokens. Review your export before pasting.</p>
          </div>

          {entries.length === 0 ? (
            <>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jsonOnly}
                    onChange={(e) => setJsonOnly(e.target.checked)}
                    aria-label="JSON responses only"
                  />
                  JSON responses only
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deduplicate}
                    onChange={(e) => setDeduplicate(e.target.checked)}
                    aria-label="Deduplicate endpoints"
                  />
                  Deduplicate endpoints
                </label>
              </div>

              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={14}
                placeholder='Paste HAR JSON here…'
                className={cn(
                  'w-full px-3 py-2 border rounded-md text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring',
                  parseError && 'border-destructive'
                )}
              />
              {parseError && <p className="text-sm text-destructive">{parseError}</p>}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {entries.length} endpoint{entries.length !== 1 ? 's' : ''} found
                  {' · '}{selected.length} selected
                </p>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs border rounded px-2 py-1 hover:bg-accent">
                    Select all
                  </button>
                  <button onClick={selectNone} className="text-xs border rounded px-2 py-1 hover:bg-accent">
                    Select none
                  </button>
                </div>
              </div>

              {hosts.length > 1 && (
                <select
                  value={hostFilter}
                  onChange={(e) => setHostFilter(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none"
                >
                  <option value="all">All hosts</option>
                  {hosts.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              )}

              <ul className="space-y-0 border rounded-md divide-y max-h-64 overflow-y-auto">
                {visible.map((e, i) => {
                  const realIdx = entries.indexOf(e)
                  return (
                    <li key={realIdx} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={e.selected}
                        onChange={() => toggleEntry(realIdx)}
                        className="shrink-0"
                      />
                      <span className={cn('font-mono text-xs font-semibold w-14 shrink-0', METHOD_COLORS[e.method])}>
                        {e.method}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground truncate flex-1">{e.endpoint}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{e.status_code}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-3 py-1.5 border rounded-md text-sm hover:bg-accent">
            Cancel
          </button>
          {entries.length === 0 ? (
            <button
              onClick={handleParse}
              disabled={!raw.trim()}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Parse HAR
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={importing || selected.length === 0}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {importing ? 'Importing…' : `Import ${selected.length}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
