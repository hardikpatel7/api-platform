// Pure function — no side effects

const STATIC_EXTENSIONS = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|html)(\?.*)?$/i
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NUMERIC_RE = /^\d+$/
const MAX_RESPONSE_BYTES = 60 * 1024
const MAX_DEPTH = 4
const MAX_KEYS = 20

export interface HAREntry {
  method: string
  endpoint: string
  status_code: number
  host: string
  request_schema?: unknown
  response_schema?: unknown
  special_notes?: string
}

export interface HARParseResult {
  entries: HAREntry[]
  hosts: string[]
  error?: string
}

export interface HARParseOptions {
  jsonOnly?: boolean
  deduplicate?: boolean
}

export function normalizePath(path: string): string {
  return path
    .split('/')
    .map((seg) => (NUMERIC_RE.test(seg) || UUID_RE.test(seg) ? '{id}' : seg))
    .join('/')
}

export function inferSchema(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return { type: 'null' }
  if (typeof value === 'boolean') return { type: 'boolean' }
  if (typeof value === 'string') return { type: 'string' }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' }
  }
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? inferSchema(value[0], depth + 1) : {},
    }
  }
  if (typeof value === 'object') {
    if (depth >= MAX_DEPTH) return { type: 'object' }
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).slice(0, MAX_KEYS)
    const properties: Record<string, unknown> = {}
    for (const key of keys) {
      properties[key] = inferSchema(obj[key], depth + 1)
    }
    return { type: 'object', properties }
  }
  return {}
}

export function parseHAR(raw: string, options: HARParseOptions = {}): HARParseResult {
  const { jsonOnly = true, deduplicate = true } = options

  let har: Record<string, unknown>
  try {
    har = JSON.parse(raw)
  } catch {
    return { entries: [], hosts: [], error: 'Invalid JSON' }
  }

  const log = har.log as Record<string, unknown> | undefined
  const rawEntries = log?.entries as unknown[] | undefined
  if (!Array.isArray(rawEntries)) {
    return { entries: [], hosts: [], error: 'Invalid HAR: missing log.entries' }
  }

  const seen = new Set<string>()
  const hostsSet = new Set<string>()
  const entries: HAREntry[] = []

  for (const raw of rawEntries) {
    const e = raw as Record<string, unknown>
    const request = e.request as Record<string, unknown>
    const response = e.response as Record<string, unknown>
    if (!request || !response) continue

    const url = request.url as string
    const method = (request.method as string).toUpperCase()

    // Filter static assets
    try {
      const parsed = new URL(url)
      if (STATIC_EXTENSIONS.test(parsed.pathname)) continue

      const host = parsed.host
      hostsSet.add(host)

      const content = response.content as Record<string, unknown>
      const mimeType = (content?.mimeType as string) ?? ''
      const status = response.status as number

      // JSON-only filter
      if (jsonOnly && !mimeType.includes('json')) continue

      // Normalize path
      const endpoint = normalizePath(parsed.pathname)

      // Deduplication
      const key = `${method}:${endpoint}`
      if (deduplicate && seen.has(key)) continue
      seen.add(key)

      // Response schema
      let response_schema: unknown
      const responseText = content?.text as string | undefined
      const responseSize = (content?.size as number) ?? 0
      if (responseText && responseSize <= MAX_RESPONSE_BYTES) {
        try {
          const body = JSON.parse(responseText)
          response_schema = inferSchema(body)
        } catch { /* skip */ }
      }

      // Request schema
      let request_schema: unknown
      const postData = request.postData as Record<string, unknown> | undefined
      const queryString = (request.queryString as { name: string; value: string }[]) ?? []

      if (postData?.mimeType && (postData.mimeType as string).includes('json')) {
        try {
          const body = JSON.parse(postData.text as string)
          request_schema = inferSchema(body)
        } catch { /* skip */ }
      } else if (queryString.length > 0 && !request_schema) {
        const properties: Record<string, unknown> = {}
        for (const { name, value } of queryString) {
          properties[name] = { type: 'string', example: value }
        }
        request_schema = { type: 'object', properties }
      }

      // Special notes
      const headers = (request.headers as { name: string; value: string }[]) ?? []
      const noteParts: string[] = [`Host: ${host}`]
      for (const h of headers) {
        const lower = h.name.toLowerCase()
        if (lower === 'authorization') {
          const scheme = (h.value as string).split(' ')[0]
          noteParts.push(`Auth: ${scheme} scheme detected`)
        }
        if (lower === 'cookie') {
          noteParts.push('Cookie auth detected')
        }
      }

      entries.push({
        method,
        endpoint,
        status_code: status,
        host,
        request_schema,
        response_schema,
        special_notes: noteParts.join('\n'),
      })
    } catch { /* skip malformed entries */ }
  }

  return { entries, hosts: [...hostsSet] }
}
