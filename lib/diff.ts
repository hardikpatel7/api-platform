import type { ApiEntry } from '@/types'

export interface FieldDiff {
  field: string
  original: string
  suggested: string
}

const TEXT_FIELDS = [
  'name', 'method', 'endpoint', 'version', 'status',
  'group', 'tool_description', 'special_notes',
] as const

function normalize(v: unknown): string {
  if (v === undefined || v === null) return ''
  return String(v)
}

export function diffApiEntries(original: Partial<ApiEntry>, suggested: Partial<ApiEntry>): FieldDiff[] {
  const diffs: FieldDiff[] = []
  for (const field of TEXT_FIELDS) {
    const orig = normalize(original[field])
    const sugg = normalize(suggested[field])
    if (orig !== sugg) {
      diffs.push({ field, original: orig, suggested: sugg })
    }
  }
  return diffs
}
