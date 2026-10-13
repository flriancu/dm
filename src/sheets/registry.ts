import type { ComponentType } from 'react'
import { CoverSheet, DreamsSheet, RatingSheet, ClarifySheet, WeekSheet, WoopSheet } from './learner'
import { HabitSheet, FriendsSheet, FearSheet, LetgoSheet } from './dream'
import { ProfileSheet, JournalSheet, WheelSheet } from './calm'
import { ValuesSheet, LetterSheet, VisionSheet, RegretSheet, CheckinSheet, RetroSheet } from './vision'

/** Every printable sheet of the Dream Book, in book order (FR-04). Adding a sheet = one line here. */
export interface SheetDef {
  id: string
  module: number
  Component: ComponentType
}

export const SHEETS: readonly SheetDef[] = [
  { id: 'cover', module: 0, Component: CoverSheet },
  { id: 'dreams', module: 1, Component: DreamsSheet },
  { id: 'rating', module: 2, Component: RatingSheet },
  { id: 'clarify', module: 2, Component: ClarifySheet },
  { id: 'week', module: 3, Component: WeekSheet },
  { id: 'woop', module: 3, Component: WoopSheet },
  { id: 'habit', module: 4, Component: HabitSheet },
  { id: 'friends', module: 4, Component: FriendsSheet },
  { id: 'fear', module: 4, Component: FearSheet },
  { id: 'profile', module: 5, Component: ProfileSheet },
  { id: 'journal', module: 5, Component: JournalSheet },
  { id: 'wheel', module: 5, Component: WheelSheet },
  { id: 'values', module: 6, Component: ValuesSheet },
  { id: 'letter', module: 6, Component: LetterSheet },
  { id: 'sheet', module: 6, Component: VisionSheet },
  { id: 'regret', module: 7, Component: RegretSheet },
  { id: 'letgo', module: 7, Component: LetgoSheet },
  { id: 'checkin', module: 7, Component: CheckinSheet },
  { id: 'retro', module: 7, Component: RetroSheet },
]

export const sheetById = (id: string) => SHEETS.find((s) => s.id === id)
