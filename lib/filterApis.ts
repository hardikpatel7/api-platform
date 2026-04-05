import type { ApiEntry } from '@/types'

export function filterApis(
  entries: ApiEntry[],
  statusFilter: string | null,
  tagFilter: string | null
): ApiEntry[] {
  return entries.filter((entry) => {
    if (statusFilter && entry.status !== statusFilter) return false
    if (tagFilter && !(entry.tags ?? []).includes(tagFilter)) return false
    return true
  })
}

export function groupApis(entries: ApiEntry[]): Map<string | null, ApiEntry[]> {
  const grouped = new Map<string | null, ApiEntry[]>()
  const named: Map<string, ApiEntry[]> = new Map()
  const ungrouped: ApiEntry[] = []

  for (const entry of entries) {
    if (entry.group) {
      const bucket = named.get(entry.group) ?? []
      bucket.push(entry)
      named.set(entry.group, bucket)
    } else {
      ungrouped.push(entry)
    }
  }

  // Sort named groups alphabetically
  const sortedKeys = [...named.keys()].sort()
  for (const key of sortedKeys) {
    grouped.set(key, named.get(key)!)
  }

  // Ungrouped entries last under null key
  if (ungrouped.length > 0) {
    grouped.set(null, ungrouped)
  }

  return grouped
}

export function buildSubtitle(
  count: number,
  statusFilter: string | null,
  tagFilter: string | null
): string {
  const parts: string[] = [`${count} ${count === 1 ? 'endpoint' : 'endpoints'}`]
  if (tagFilter) parts.push(`#${tagFilter}`)
  if (statusFilter) parts.push(statusFilter)
  return parts.join(' · ')
}
