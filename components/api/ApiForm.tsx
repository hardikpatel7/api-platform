'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ApiEntry } from '@/types'
import type { GenerateResult } from '@/lib/ai/generate'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const
const STATUSES = ['Stable', 'Beta', 'Deprecated', 'Internal'] as const

type FormData = Partial<ApiEntry>

interface ApiFormProps {
  initialData?: FormData
  onSubmit: (data: FormData) => Promise<void>
  submitLabel?: string
  onGenerate?: (input: { name: string; method: string; endpoint: string; requestSchema?: unknown; responseSchema?: unknown }) => Promise<GenerateResult>
}

function useJsonField(initial = '') {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)

  function validate(v: string) {
    if (!v.trim()) {
      setError(null)
      return
    }
    try {
      JSON.parse(v)
      setError(null)
    } catch {
      setError('Invalid JSON')
    }
  }

  return {
    value,
    error,
    props: {
      value,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value),
      onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => validate(e.target.value),
    },
  }
}

export function ApiForm({ initialData, onSubmit, submitLabel = 'Save', onGenerate }: ApiFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [method, setMethod] = useState(initialData?.method ?? 'GET')
  const [endpoint, setEndpoint] = useState(initialData?.endpoint ?? '')
  const [version, setVersion] = useState(initialData?.version ?? '')
  const [status, setStatus] = useState(initialData?.status ?? '')
  const [group, setGroup] = useState(initialData?.group ?? '')
  const [tags, setTags] = useState(
    Array.isArray(initialData?.tags) ? initialData.tags.join(', ') : ''
  )
  const [toolDescription, setToolDescription] = useState(initialData?.tool_description ?? '')
  const [codeSnippet, setCodeSnippet] = useState(initialData?.code_snippet ?? '')
  const [specialNotes, setSpecialNotes] = useState(initialData?.special_notes ?? '')

  const requestSchema = useJsonField(
    initialData?.request_schema ? JSON.stringify(initialData.request_schema, null, 2) : ''
  )
  const responseSchema = useJsonField(
    initialData?.response_schema ? JSON.stringify(initialData.response_schema, null, 2) : ''
  )
  const mcpConfig = useJsonField(
    initialData?.mcp_config ? JSON.stringify(initialData.mcp_config, null, 2) : ''
  )

  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    if (!name.trim() || !onGenerate) return
    setGenerating(true)
    try {
      const result = await onGenerate({
        name,
        method,
        endpoint,
        requestSchema: parseJson(requestSchema.value),
        responseSchema: parseJson(responseSchema.value),
      })
      setToolDescription(result.tool_description)
      const mcpStr = JSON.stringify(result.mcp_config, null, 2)
      mcpConfig.props.onChange({ target: { value: mcpStr } } as React.ChangeEvent<HTMLTextAreaElement>)
    } catch {
      // silently ignore — user can retry
    } finally {
      setGenerating(false)
    }
  }

  function parseJson(raw: string): unknown | undefined {
    if (!raw.trim()) return undefined
    try { return JSON.parse(raw) } catch { return undefined }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (requestSchema.error || responseSchema.error || mcpConfig.error) return

    setLoading(true)
    await onSubmit({
      name,
      method,
      endpoint,
      version: version || undefined,
      status: status || undefined,
      group: group || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      tool_description: toolDescription || undefined,
      request_schema: parseJson(requestSchema.value),
      response_schema: parseJson(responseSchema.value),
      mcp_config: parseJson(mcpConfig.value),
      code_snippet: codeSnippet || undefined,
      special_notes: specialNotes || undefined,
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* AI Generate — only shown when an onGenerate handler is provided */}
      {onGenerate && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !name.trim()}
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-accent disabled:opacity-50 flex items-center gap-1.5"
          >
            {generating ? 'Generating…' : '✦ AI Generate'}
          </button>
        </div>
      )}

      {/* Overview fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="method" className="text-sm font-medium">
            Method <span className="text-destructive">*</span>
          </label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="endpoint" className="text-sm font-medium">
            Endpoint <span className="text-destructive">*</span>
          </label>
          <input
            id="endpoint"
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            required
            placeholder="/api/v1/resource"
            className="w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="version" className="text-sm font-medium">Version</label>
          <input
            id="version"
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="v1"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— None —</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="group" className="text-sm font-medium">Group</label>
          <input
            id="group"
            type="text"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="e.g. Auth, Inventory"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="tags" className="text-sm font-medium">Tags</label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="auth, read-only (comma-separated)"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="tool_description" className="text-sm font-medium">Tool Description</label>
          <textarea
            id="tool_description"
            value={toolDescription}
            onChange={(e) => setToolDescription(e.target.value)}
            rows={3}
            placeholder="What this API does, when to use it, key behaviors…"
            className="w-full px-3 py-2 border rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Schema fields */}
      <div className="space-y-4">
        <JsonField
          id="request_schema"
          label="Request Schema"
          placeholder={'{\n  "type": "object",\n  "properties": {}\n}'}
          field={requestSchema}
        />
        <JsonField
          id="response_schema"
          label="Response Schema"
          placeholder={'{\n  "type": "object",\n  "properties": {}\n}'}
          field={responseSchema}
        />
        <JsonField
          id="mcp_config"
          label="MCP Config"
          placeholder={'{\n  "name": "",\n  "description": "",\n  "inputSchema": { "type": "object", "properties": {}, "required": [] }\n}'}
          field={mcpConfig}
        />
      </div>

      {/* Code snippet */}
      <div className="space-y-1">
        <label htmlFor="code_snippet" className="text-sm font-medium">Code Snippet</label>
        <textarea
          id="code_snippet"
          value={codeSnippet}
          onChange={(e) => setCodeSnippet(e.target.value)}
          rows={5}
          placeholder="curl, Python, JavaScript usage example…"
          className="w-full px-3 py-2 border rounded-md text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label htmlFor="special_notes" className="text-sm font-medium">Notes</label>
        <textarea
          id="special_notes"
          value={specialNotes}
          onChange={(e) => setSpecialNotes(e.target.value)}
          rows={3}
          placeholder="Auth requirements, rate limits, edge cases…"
          className="w-full px-3 py-2 border rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !!requestSchema.error || !!responseSchema.error || !!mcpConfig.error}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}

interface JsonFieldProps {
  id: string
  label: string
  placeholder: string
  field: ReturnType<typeof useJsonField>
}

function JsonField({ id, label, placeholder, field }: JsonFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <textarea
        id={id}
        rows={6}
        placeholder={placeholder}
        className={cn(
          'w-full px-3 py-2 border rounded-md text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring',
          field.error && 'border-destructive focus:ring-destructive'
        )}
        {...field.props}
      />
      {field.error && (
        <p className="text-xs text-destructive">{field.error}</p>
      )}
    </div>
  )
}
