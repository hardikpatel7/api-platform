// Input: name, method, endpoint, requestSchema, responseSchema
// Output: tool_description (string) + mcp_config (object)
// Model: claude-sonnet-4-5
// Call only from server actions or API routes

import Anthropic from '@anthropic-ai/sdk'

export interface GenerateInput {
  name: string
  method: string
  endpoint: string
  requestSchema?: unknown
  responseSchema?: unknown
}

export interface GenerateResult {
  tool_description: string
  mcp_config: unknown
}

export async function generateApiDocs(input: GenerateInput): Promise<GenerateResult> {
  const client = new Anthropic()

  const prompt = `You are an API documentation assistant. Given an API endpoint, generate:
1. A tool_description: 2-3 sentences describing what this API does, when to use it, and key behaviors.
2. A mcp_config: a complete MCP tool JSON definition.

API Details:
- Name: ${input.name}
- Method: ${input.method}
- Endpoint: ${input.endpoint}${
    input.requestSchema
      ? `\n- Request Schema:\n${JSON.stringify(input.requestSchema, null, 2)}`
      : ''
  }${
    input.responseSchema
      ? `\n- Response Schema:\n${JSON.stringify(input.responseSchema, null, 2)}`
      : ''
  }

Respond with ONLY a JSON object (no markdown fences) in this exact shape:
{
  "tool_description": "...",
  "mcp_config": {
    "name": "snake_case_function_name",
    "description": "...",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  }
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content.find((b) => b.type === 'text')?.text
  if (!text) throw new Error('No text response from AI')

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`AI returned invalid JSON: ${text.slice(0, 100)}`)
  }

  if (!parsed.tool_description || !parsed.mcp_config) {
    throw new Error('AI response missing required fields: tool_description or mcp_config')
  }

  return {
    tool_description: parsed.tool_description as string,
    mcp_config: parsed.mcp_config,
  }
}
