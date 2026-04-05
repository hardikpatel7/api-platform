import { describe, it, expect } from 'vitest'
import { canDo } from '@/lib/permissions'
import type { UserRole } from '@/types'

describe('canDo — viewer', () => {
  const role: UserRole = 'viewer'

  it('cannot direct-edit', () => expect(canDo(role, 'direct_edit')).toBe(false))
  it('cannot suggest', () => expect(canDo(role, 'suggest')).toBe(false))
  it('cannot approve_reject', () => expect(canDo(role, 'approve_reject')).toBe(false))
  it('cannot manage_users', () => expect(canDo(role, 'manage_users')).toBe(false))
  it('cannot view_all_suggestions', () => expect(canDo(role, 'view_all_suggestions')).toBe(false))
  it('cannot use_ai', () => expect(canDo(role, 'use_ai')).toBe(false))
  it('cannot import', () => expect(canDo(role, 'import')).toBe(false))
})

describe('canDo — suggester', () => {
  const role: UserRole = 'suggester'

  it('can suggest', () => expect(canDo(role, 'suggest')).toBe(true))
  it('cannot direct-edit', () => expect(canDo(role, 'direct_edit')).toBe(false))
  it('cannot approve_reject', () => expect(canDo(role, 'approve_reject')).toBe(false))
  it('cannot manage_users', () => expect(canDo(role, 'manage_users')).toBe(false))
  it('cannot view_all_suggestions', () => expect(canDo(role, 'view_all_suggestions')).toBe(false))
  it('cannot use_ai', () => expect(canDo(role, 'use_ai')).toBe(false))
  it('cannot import', () => expect(canDo(role, 'import')).toBe(false))
})

describe('canDo — editor', () => {
  const role: UserRole = 'editor'

  it('can direct-edit', () => expect(canDo(role, 'direct_edit')).toBe(true))
  it('can suggest', () => expect(canDo(role, 'suggest')).toBe(true))
  it('can approve_reject', () => expect(canDo(role, 'approve_reject')).toBe(true))
  it('cannot manage_users', () => expect(canDo(role, 'manage_users')).toBe(false))
  it('can view_all_suggestions', () => expect(canDo(role, 'view_all_suggestions')).toBe(true))
  it('can use_ai', () => expect(canDo(role, 'use_ai')).toBe(true))
  it('can import', () => expect(canDo(role, 'import')).toBe(true))
})

describe('canDo — admin', () => {
  const role: UserRole = 'admin'

  it('can direct-edit', () => expect(canDo(role, 'direct_edit')).toBe(true))
  it('can suggest', () => expect(canDo(role, 'suggest')).toBe(true))
  it('can approve_reject', () => expect(canDo(role, 'approve_reject')).toBe(true))
  it('can manage_users', () => expect(canDo(role, 'manage_users')).toBe(true))
  it('can view_all_suggestions', () => expect(canDo(role, 'view_all_suggestions')).toBe(true))
  it('can use_ai', () => expect(canDo(role, 'use_ai')).toBe(true))
  it('can import', () => expect(canDo(role, 'import')).toBe(true))
})
