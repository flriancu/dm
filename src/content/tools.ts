/**
 * Which app pages a module's "Fă" section links to. A module names its tools in
 * front matter (`tools: [dreams, mydream]`); modules without the key fall back to
 * this table. Adding a tool means adding one line here, not editing the page.
 */
export interface Tool { id: string; to: string; labelKey: string }

export const TOOLS: Record<string, Tool> = {
  dreams: { id: 'dreams', to: '/dreams', labelKey: 'dreams.title' },
  mydream: { id: 'mydream', to: '/dream', labelKey: 'mydream.title' },
  week: { id: 'week', to: '/week', labelKey: 'week.title' },
  woop: { id: 'woop', to: '/dream#woop', labelKey: 'woop.title' },
  habit: { id: 'habit', to: '/dream#habit', labelKey: 'habit.title' },
  friends: { id: 'friends', to: '/dream#friends', labelKey: 'friends.title' },
  fear: { id: 'fear', to: '/dream#fear', labelKey: 'fear.title' },
  calm: { id: 'calm', to: '/calm', labelKey: 'calm.title' },
  vision: { id: 'vision', to: '/vision', labelKey: 'vision.title' },
  book: { id: 'book', to: '/book', labelKey: 'book.title' },
}

const BY_ORDER: Record<number, string[]> = {
  1: ['dreams'],
  2: ['dreams', 'mydream'],
  3: ['week', 'woop'],
  4: ['habit', 'friends', 'fear'],
  5: ['calm'],
  6: ['vision'],
  7: ['vision'],
}

export function toolsFor(meta: { order: number; tools?: string[] }): Tool[] {
  const ids = meta.tools ?? BY_ORDER[meta.order] ?? []
  return ids.map((id) => TOOLS[id]).filter((x): x is Tool => !!x)
}
