import type { Saboteur } from '../db/db'

/**
 * Public pages of Positive Intelligence that describe the ten voices and the five
 * powers of the Sage in full (English). The course links to them and copies nothing:
 * their terms (12 Sept 2022) forbid copying, distributing or downloading their content.
 */
const SUPPORT = 'https://support.positiveintelligence.com/article/'

export const SABOTEUR_LINKS: Record<Saboteur, string> = {
  judge: `${SUPPORT}108-judge`,
  avoider: `${SUPPORT}109-avoider`,
  controller: `${SUPPORT}110-controller`,
  achiever: `${SUPPORT}111-hyper-achiever`,
  rational: `${SUPPORT}112-hyper-rational`,
  vigilant: `${SUPPORT}113-hyper-vigilant`,
  pleaser: `${SUPPORT}114-pleaser`,
  restless: `${SUPPORT}115-restless`,
  stickler: `${SUPPORT}116-stickler`,
  victim: `${SUPPORT}117-victim`,
}

export const SAGE_POWERS_URL = 'https://positiveintelligence.com/blog/five-sage-powers/'
export const SABOTEURS_OVERVIEW_URL = 'https://www.positiveintelligence.com/saboteurs/'
