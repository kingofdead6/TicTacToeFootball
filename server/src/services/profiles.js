import { createHash, randomBytes } from 'node:crypto'
import { Profile } from '../models/Profile.js'
import { isDbReady } from '../db.js'

export const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex')
export const newToken = () => randomBytes(32).toString('hex')

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,18}$/
export const AVATARS = ['⚽', '🦁', '🐐', '🔥', '⚡', '👑', '🦅', '🐺', '🐉', '🚀', '🎯', '🧤', '🥅', '🏆', '💎', '🌟', '🦈', '🐯', '🤖', '👽']

export async function profileFromToken(token) {
  if (!token || !isDbReady()) return null
  return Profile.findOne({ tokenHash: hashToken(token) })
}

/** Express middleware: attaches req.profile when a valid x-profile-token header is sent */
export async function attachProfile(req, _res, next) {
  try {
    req.profile = await profileFromToken(req.get('x-profile-token'))
  } catch {
    req.profile = null
  }
  next()
}

export function requireDb(_req, res, next) {
  if (!isDbReady()) return res.status(503).json({ error: 'Database not connected yet', code: 'NO_DB' })
  next()
}

// ---------------- Elo ----------------

const K = 32
export function eloDelta(ratingA, ratingB, scoreA) {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
  return Math.round(K * (scoreA - expectedA))
}

/**
 * Applies the result of a finished online match to both profiles.
 * winner: 'X' | 'O' | null (draw). seats: { X: {profileId}, O: {profileId} }
 * guesses: { X: {correct, wrong}, O: {...} }, roundsWon: { X, O }
 * Returns { X: {before, after}, O: {before, after} } or null when not ranked.
 */
export async function applyMatchResult({ seats, winner, ranked, guesses, roundsWon }) {
  // Only card-vs-card matches count, so wins against throwaway guests can't pad the leaderboard
  if (!isDbReady() || !ranked) return null
  const ids = ['X', 'O'].map((m) => seats[m]?.profileId).filter(Boolean)
  if (!ids.length) return null
  const docs = await Profile.find({ _id: { $in: ids } })
  const byMark = {}
  for (const m of ['X', 'O']) byMark[m] = docs.find((d) => d._id.toString() === seats[m]?.profileId) ?? null

  const change = {}
  const canRate = ranked && byMark.X && byMark.O
  const deltaX = canRate ? eloDelta(byMark.X.rating, byMark.O.rating, winner === 'X' ? 1 : winner === 'O' ? 0 : 0.5) : 0
  const now = new Date()

  for (const m of ['X', 'O']) {
    const p = byMark[m]
    if (!p) continue
    const before = Math.round(p.rating)
    const delta = canRate ? (m === 'X' ? deltaX : -deltaX) : 0
    p.rating = Math.max(100, p.rating + delta)
    p.peakRating = Math.max(p.peakRating, p.rating)
    p.stats.played += 1
    p.stats.roundsWon += roundsWon?.[m] ?? 0
    p.stats.correctGuesses += guesses?.[m]?.correct ?? 0
    p.stats.wrongGuesses += guesses?.[m]?.wrong ?? 0
    if (winner === m) {
      p.stats.wins += 1
      p.streak += 1
      p.bestStreak = Math.max(p.bestStreak, p.streak)
    } else if (winner === null) {
      p.stats.draws += 1
    } else {
      p.stats.losses += 1
      p.streak = 0
    }
    p.lastPlayedAt = now
    await p.save()
    change[m] = { before, after: Math.round(p.rating), delta }
  }
  return change
}
