import { Footballer } from '../models/Footballer.js'
import { isDbReady } from '../db.js'

/** Increment pick counters for a guessed footballer (fire-and-forget) */
export function trackPick(slug, correct) {
  if (!isDbReady() || !slug) return
  Footballer.updateOne({ slug }, { $inc: { 'stats.picked': 1, 'stats.correct': correct ? 1 : 0 } }).catch(() => {})
}
