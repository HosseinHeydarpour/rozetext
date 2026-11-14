import { readFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.join(process.cwd(), '..')

export interface TelegramGroup {
  id: string
  title: string
  type: string
  seen_at: string
}

/** Groups the bot process recorded; it is the only source of valid chat ids for posting. */
export async function readGroups(): Promise<TelegramGroup[]> {
  try {
    const body = JSON.parse(await readFile(path.join(ROOT, 'runtime', 'telegram-groups.json'), 'utf8')) as { groups?: TelegramGroup[] }
    return Array.isArray(body.groups) ? body.groups : []
  } catch {
    return []
  }
}
