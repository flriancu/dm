import type { Role, Config } from '../db/db'

/**
 * Which role/configuration pairs make sense (REQUIREMENTS FR-07).
 * A pair needs "both" on every device; "both" needs a configuration where this person can be someone's Dreamer.
 */
export type ComboIssue = 'pairNeedsBoth' | 'friendNoPair' | 'bothNeedsPartner' | null

export function comboIssue(role: Role, config: Config): ComboIssue {
  if (config === 'pair' && role !== 'both') return role === 'friend' ? 'friendNoPair' : 'pairNeedsBoth'
  if (role === 'both' && config === 'solo') return 'bothNeedsPartner'
  return null
}

/** Apply the rule after a change: a pair forces role "both"; a Friend who picks pair is kept on solo. */
export function reconcile(
  role: Role,
  config: Config,
  changed: 'role' | 'config',
): { role: Role; config: Config; note: ComboIssue } {
  if (changed === 'config' && config === 'pair' && role === 'dreamer')
    return { role: 'both', config, note: 'pairNeedsBoth' }
  if (changed === 'config' && config === 'pair' && role === 'friend')
    return { role, config: 'solo', note: 'friendNoPair' }
  if (changed === 'role' && role === 'friend' && config === 'pair')
    return { role, config: 'solo', note: 'friendNoPair' }
  if (changed === 'role' && role === 'dreamer' && config === 'pair') return { role, config: 'solo', note: null }
  return { role, config, note: comboIssue(role, config) }
}

/** Configurations offered for each role; the picker never shows an invalid pair. */
export const CONFIGS_FOR_ROLE: Record<Role, Config[]> = {
  dreamer: ['solo', 'group'],
  friend: ['solo', 'group'],
  both: ['pair', 'group'],
}

/** Locale key of the configuration help, written from the reader's own role. */
export function configHelpKey(role: Role, config: Config): string {
  if (config === 'pair') return 'config.help.pair'
  return `config.help.${config}.${role === 'both' && config === 'solo' ? 'dreamer' : role}`
}
