import type { Settings, Role, Config } from '../db/db'

/** Role and configuration rules: who sees what, who leads. Pure functions over the settings fields they read. */

/** The two fields most role rules read; callers may pass a draft (onboarding) or the stored settings. */
export type RoleConfig = { role: Role; config: Config }

/** The per-meeting switch only makes sense in a pair, where the role rotates. */
export function showsFriendSwitch(s: RoleConfig) {
  return s.role === 'both' && s.config === 'pair'
}
export function showsFriendSection(s: Pick<Settings, 'role'>) {
  return s.role === 'friend' || s.role === 'both'
}
export function showsDreamerParts(s: Pick<Settings, 'role'>) {
  return s.role !== 'friend'
}
/**
 * Who leads the next meeting, as seen from this device: 'me' (Friend role, group leader,
 * or the pair member whose turn it is), 'other' (pair member whose turn it is not), or
 * null when the question does not arise (a Dreamer with an outside Friend).
 */
export function leadsMeetings(s: RoleConfig & Pick<Settings, 'friendToday'>): 'me' | 'other' | null {
  if (s.role === 'friend') return 'me'
  if (s.role === 'both' && s.config === 'group') return 'me'
  if (s.role === 'both' && s.config === 'pair') return s.friendToday ? 'me' : 'other'
  return null
}
/** The label of the first-meeting date depends on who is asking. */
export function startDateKey(s: RoleConfig): string {
  if (s.config === 'group') return 'onboarding.start.group'
  if (s.role === 'friend') return 'onboarding.start.friend'
  return 'onboarding.start'
}
