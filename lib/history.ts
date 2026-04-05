import type { HistoryAction } from '@/types'

export type ActionColor = 'green' | 'blue' | 'red' | 'amber' | 'purple'

const ACTION_COLORS: Record<HistoryAction, ActionColor> = {
  created:             'green',
  edited:              'blue',
  deleted:             'red',
  suggested_edit:      'amber',
  suggested_create:    'amber',
  suggested_delete:    'amber',
  suggestion_approved: 'green',
  suggestion_rejected: 'red',
  bulk_import:         'purple',
}

export function getActionColor(action: HistoryAction): ActionColor {
  return ACTION_COLORS[action]
}

export function getActionLabel(action: HistoryAction): string {
  return action.replace(/_/g, ' ')
}
