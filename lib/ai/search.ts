// Input: natural language query + serialized API index
// Output: ordered array of matching API IDs
// Scope: searches across all projects the user has access to
// Call only from server actions or API routes

import Anthropic from '@anthropic-ai/sdk'

export interface ApiIndexEntry {
  id: string
  name: string
  method: string
  endpoint: string
  tool_description?: string
  tags?: string[]
  group?: string
  projectName: string
}

export async function semanticSearch(
  query: string,
  index: ApiIndexEntry[]
): Promise<string[]> {
  const client = new Anthropic()

  const indexText = index
    .map(
      (e) =>
        `ID: ${e.id} | ${e.method} ${e.endpoint} | Name: ${e.name} | Project: ${e.projectName}` +
        (e.tool_description ? ` | Desc: ${e.tool_description}` : '') +
        (e.tags?.length ? ` | Tags: ${e.tags.join(', ')}` : '') +
        (e.group ? ` | Group: ${e.group}` : '')
    )
    .join('\n')

  const prompt = `You are a semantic search assistant for API documentation.

Given the user's query and the list of available APIs, return the IDs of matching APIs ordered by relevance (most relevant first).

User query: "${query}"

Available APIs:
${indexText}

Respond with ONLY a JSON array of matching API IDs, e.g. ["id1","id2"]. Return [] if nothing matches. No explanation, no markdown.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content.find((b) => b.type === 'text')?.text
  if (!text) throw new Error('No text response from AI')

  let ids: unknown
  try {
    ids = JSON.parse(text)
  } catch {
    throw new Error(`AI returned invalid JSON: ${text.slice(0, 100)}`)
  }

  if (!Array.isArray(ids)) {
    throw new Error('AI response is not a JSON array')
  }

  // Filter out any IDs not in the provided index
  const validIds = new Set(index.map((e) => e.id))
  return (ids as string[]).filter((id) => validIds.has(id))
}
