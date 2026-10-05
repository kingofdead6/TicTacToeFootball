// Tiny JSON-file persistence for match history
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'storage', 'matches.json')

function load() {
  try {
    return existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : []
  } catch {
    return []
  }
}

let matches = load()

function persist() {
  mkdirSync(dirname(FILE), { recursive: true })
  writeFileSync(FILE, JSON.stringify(matches, null, 2))
}

export function addMatch(match) {
  matches.unshift(match)
  matches = matches.slice(0, 200)
  persist()
  return match
}

export const listMatches = (limit = 20) => matches.slice(0, limit)

export function leaderboard() {
  const table = new Map()
  const row = (name) => {
    const key = name.trim().toLowerCase()
    if (!table.has(key)) table.set(key, { name: name.trim(), played: 0, wins: 0, draws: 0, losses: 0, points: 0 })
    return table.get(key)
  }
  for (const m of matches) {
    const [a, b] = m.players
    if (!a || !b) continue
    const ra = row(a.name)
    const rb = row(b.name)
    ra.played++
    rb.played++
    if (m.winner === null) {
      ra.draws++
      rb.draws++
    } else {
      const [w, l] = m.winner === 'X' ? [ra, rb] : [rb, ra]
      w.wins++
      l.losses++
    }
  }
  for (const r of table.values()) r.points = r.wins * 3 + r.draws
  return [...table.values()].sort((x, y) => y.points - x.points || y.wins - x.wins).slice(0, 20)
}

export function stats() {
  const playerPicks = new Map()
  for (const m of matches) for (const pick of m.picks ?? []) playerPicks.set(pick.name, (playerPicks.get(pick.name) ?? 0) + 1)
  const mostPicked = [...playerPicks.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))
  return { totalMatches: matches.length, draws: matches.filter((m) => m.winner === null).length, mostPicked }
}
