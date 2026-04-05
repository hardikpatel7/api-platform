import { describe, it, expect } from 'vitest'
import { getActionLabel, getActionColor } from '@/lib/history'
import type { HistoryAction } from '@/types'

describe('getActionLabel', () => {
  it('replaces underscores with spaces', () => {
    expect(getActionLabel('suggested_edit')).toBe('suggested edit')
  })

  it('returns human-readable label for each action', () => {
    const cases: [HistoryAction, string][] = [
      ['created',             'created'],
      ['edited',              'edited'],
      ['deleted',             'deleted'],
      ['suggested_edit',      'suggested edit'],
      ['suggested_create',    'suggested create'],
      ['suggested_delete',    'suggested delete'],
      ['suggestion_approved', 'suggestion approved'],
      ['suggestion_rejected', 'suggestion rejected'],
      ['bulk_import',         'bulk import'],
    ]
    for (const [action, expected] of cases) {
      expect(getActionLabel(action)).toBe(expected)
    }
  })
})

describe('getActionColor', () => {
  it('returns green for created', () => {
    expect(getActionColor('created')).toBe('green')
  })

  it('returns blue for edited', () => {
    expect(getActionColor('edited')).toBe('blue')
  })

  it('returns red for deleted', () => {
    expect(getActionColor('deleted')).toBe('red')
  })

  it('returns amber for suggested_edit', () => {
    expect(getActionColor('suggested_edit')).toBe('amber')
  })

  it('returns amber for suggested_create', () => {
    expect(getActionColor('suggested_create')).toBe('amber')
  })

  it('returns amber for suggested_delete', () => {
    expect(getActionColor('suggested_delete')).toBe('amber')
  })

  it('returns green for suggestion_approved', () => {
    expect(getActionColor('suggestion_approved')).toBe('green')
  })

  it('returns red for suggestion_rejected', () => {
    expect(getActionColor('suggestion_rejected')).toBe('red')
  })

  it('returns purple for bulk_import', () => {
    expect(getActionColor('bulk_import')).toBe('purple')
  })
})
