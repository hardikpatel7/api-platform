// Pure function — no side effects
import type { ApiEntry } from '@/types'

type ParsedEntry = Pick<
  ApiEntry,
  'name' | 'endpoint' | 'method' | 'group' | 'tags' | 'tool_description' | 'request_schema' | 'response_schema'
>

export interface OpenAPIParseResult {
  entries: ParsedEntry[]
  error?: string
}

export function parseOpenAPI(raw: string): OpenAPIParseResult {
  let spec: Record<string, unknown>
  try {
    spec = JSON.parse(raw)
  } catch {
    return { entries: [], error: 'Invalid JSON' }
  }

  const isOA3 = typeof spec.openapi === 'string' && spec.openapi.startsWith('3.')
  const isSW2 = typeof spec.swagger === 'string' && spec.swagger.startsWith('2.')

  if (!isOA3 && !isSW2) {
    return { entries: [], error: 'Unrecognised spec format (expected OpenAPI 3.x or Swagger 2.x)' }
  }

  const paths = spec.paths as Record<string, Record<string, unknown>> | undefined
  if (!paths || Object.keys(paths).length === 0) {
    return { entries: [], error: 'No API paths found' }
  }

  const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head']
  const entries: ParsedEntry[] = []

  for (const [endpoint, pathItem] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as Record<string, unknown> | undefined
      if (!op) continue

      const summary = op.summary as string | undefined
      const operationId = op.operationId as string | undefined
      const description = op.description as string | undefined
      const opTags = (op.tags as string[] | undefined) ?? []

      const name = summary ?? operationId ?? `${method.toUpperCase()} ${endpoint}`
      const group = opTags[0] ?? undefined
      const tags = opTags.map((t) => t.toLowerCase())
      const tool_description = description ?? summary ?? undefined

      let request_schema: unknown = undefined
      let response_schema: unknown = undefined

      if (isOA3) {
        // Request schema from requestBody
        const requestBody = op.requestBody as Record<string, unknown> | undefined
        if (requestBody) {
          const content = requestBody.content as Record<string, unknown> | undefined
          const jsonContent = content?.['application/json'] as Record<string, unknown> | undefined
          request_schema = jsonContent?.schema
        }

        // Response schema from 200 or 201
        const responses = op.responses as Record<string, unknown> | undefined
        const successResponse = (responses?.['200'] ?? responses?.['201']) as Record<string, unknown> | undefined
        if (successResponse) {
          const content = successResponse.content as Record<string, unknown> | undefined
          const jsonContent = content?.['application/json'] as Record<string, unknown> | undefined
          response_schema = jsonContent?.schema
        }
      } else {
        // Swagger 2.0
        const parameters = (op.parameters as Record<string, unknown>[] | undefined) ?? []

        // Body parameter
        const bodyParam = parameters.find((p) => p.in === 'body') as Record<string, unknown> | undefined
        if (bodyParam) {
          request_schema = bodyParam.schema
        }

        // Response schema
        const responses = op.responses as Record<string, unknown> | undefined
        const successResponse = (responses?.['200'] ?? responses?.['201']) as Record<string, unknown> | undefined
        response_schema = (successResponse as Record<string, unknown> | undefined)?.schema
      }

      entries.push({
        name,
        endpoint,
        method: method.toUpperCase(),
        group,
        tags,
        tool_description,
        request_schema,
        response_schema,
      })
    }
  }

  if (entries.length === 0) {
    return { entries: [], error: 'No API paths found' }
  }

  return { entries }
}
