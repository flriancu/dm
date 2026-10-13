import type { Config } from '../db/db'
import headings from './plan-headings.json'

/**
 * The three meeting configurations and how a plan file names their tables.
 * One source for the app and for scripts/check-content.mjs (which reads the JSON).
 */
export const CONFIGS = ['solo', 'pair', 'group'] as const satisfies readonly Config[]

/** Heading prefix of each configuration's table in content/<lang>/friend/NN.md. */
export const PLAN_HEADINGS: Record<Config, string> = headings

/** Which configuration a `##` heading belongs to, or null for other sections (questions, lessons). */
export function configOfHeading(title: string): Config | null {
  return CONFIGS.find((c) => title.startsWith(PLAN_HEADINGS[c])) ?? null
}

/** The chosen configuration first, the other two after (the module page and the plan page both do this). */
export function orderedConfigs(chosen: Config): Config[] {
  return [chosen, ...CONFIGS.filter((c) => c !== chosen)]
}
