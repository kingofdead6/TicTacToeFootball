import { randomUUID } from 'node:crypto'
import { players } from './data/players.js'
import { allCategories, categoryById, nationIdByName } from './data/categories.js'

export const playerById = new Map(players.map((p) => [p.id, p]))

export const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()

/** Does a player satisfy a single category? */
export function matches(player, categoryId) {
  const cat = categoryById.get(categoryId)
  if (!cat) return false
  if (cat.type === 'club') return player.clubs.includes(categoryId)
  if (cat.type === 'nation') return nationIdByName.get(player.nationality) === categoryId
  if (cat.type === 'award') return player.awards.includes(categoryId)
  return false
}

export function answersFor(rowId, colId) {
  return players.filter((p) => matches(p, rowId) && matches(p, colId))
}

/** Public shape of a player, with club/award ids expanded into display objects */
export function publicPlayer(p) {
  const nation = categoryById.get(nationIdByName.get(p.nationality))
  return {
    id: p.id,
    name: p.name,
    nationality: p.nationality,
    flag: nation?.flag ?? null,
    position: p.position,
    clubs: p.clubs.map((id) => {
      const c = categoryById.get(id)
      return { id, name: c.name, short: c.short, colors: c.colors }
    }),
    awards: p.awards.map((id) => ({ id, name: categoryById.get(id).name, icon: categoryById.get(id).icon })),
  }
}

export function searchPlayers(query, limit = 8) {
  const q = normalize(query ?? '')
  if (q.length < 2) return []
  const scored = []
  for (const p of players) {
    const n = normalize(p.name)
    let score = -1
    if (n === q) score = 100
    else if (n.startsWith(q)) score = 80
    else if (n.split(' ').some((w) => w.startsWith(q))) score = 60
    else if (n.includes(q)) score = 40
    if (score >= 0) scored.push({ p, score })
  }
  scored.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
  // Search results deliberately exclude clubs/awards so they don't give answers away
  return scored.slice(0, limit).map(({ p }) => ({ id: p.id, name: p.name, nationality: p.nationality, flag: categoryById.get(nationIdByName.get(p.nationality))?.flag ?? null, position: p.position }))
}

// ---------------- Grid generation ----------------

const DIFFICULTY = {
  easy: { minAnswers: 4, pool: (c) => c.type !== 'award' && (c.type === 'nation' ? countFor(c.id) >= 15 : countFor(c.id) >= 12) },
  medium: { minAnswers: 2, pool: (c) => countFor(c.id) >= 6 },
  hard: { minAnswers: 1, pool: (c) => countFor(c.id) >= 3 },
}

const countCache = new Map()
function countFor(catId) {
  if (!countCache.has(catId)) countCache.set(catId, players.filter((p) => matches(p, catId)).length)
  return countCache.get(catId)
}

const grids = new Map() // gridId -> grid (kept in memory so answers can be revealed later)

function sample(arr, n) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

export function publicCategory(c) {
  const { id, type, name } = c
  return { id, type, name, short: c.short, colors: c.colors, flag: c.flag, icon: c.icon, description: c.description }
}

export function generateGrid(difficulty = 'medium') {
  const cfg = DIFFICULTY[difficulty] ?? DIFFICULTY.medium
  const pool = allCategories.filter(cfg.pool)
  const clubsPool = pool.filter((c) => c.type === 'club')
  const othersPool = pool.filter((c) => c.type !== 'club')

  for (let attempt = 0; attempt < 20000; attempt++) {
    // Mostly clubs, sprinkled with nations / awards for variety
    const extra = Math.floor(Math.random() * 3) + 1 // 1..3 non-club categories
    const picked = sample([...sample(clubsPool, 6 - extra), ...sample(othersPool, extra)], 6)
    if (picked.length < 6) continue
    const rows = picked.slice(0, 3)
    const cols = picked.slice(3)

    const counts = rows.map((r) => cols.map((c) => answersFor(r.id, c.id).length))
    if (counts.flat().every((n) => n >= cfg.minAnswers)) {
      const grid = {
        id: randomUUID(),
        difficulty,
        createdAt: new Date().toISOString(),
        rows: rows.map(publicCategory),
        cols: cols.map(publicCategory),
        answerCounts: counts,
      }
      grids.set(grid.id, grid)
      if (grids.size > 500) grids.delete(grids.keys().next().value)
      return grid
    }
  }
  throw new Error('Could not generate a valid grid')
}

export const getGrid = (id) => grids.get(id)

export function solutionsFor(grid) {
  return grid.rows.map((r) => grid.cols.map((c) => answersFor(r.id, c.id).map((p) => ({ id: p.id, name: p.name }))))
}
