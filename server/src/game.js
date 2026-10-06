import { randomUUID } from 'node:crypto'
import { players as seedPlayers } from './data/players.js'
import { allCategories, categoryById, loadCategories, nationIdByName } from './data/categories.js'
import { readDataset } from './data/dataset.js'

// ---------------- Live footballer registry ----------------

export let players = []
export const playerById = new Map()
export const datasetInfo = { version: 'seed', source: 'curated', notableFame: 12 }

const catIndex = new Map() // categoryId -> Set<playerId>
const notableIndex = new Map() // categoryId -> Set<playerId> (well-known players only)
const pairCache = new Map() // "a|b" -> { total, notable }

export const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const isNotable = (p) => (p.fame ?? 0) >= datasetInfo.notableFame

function categoryIdsOf(p) {
  const ids = [...p.clubs, ...p.awards]
  const nat = nationIdByName.get(p.nationality)
  if (nat) ids.push(nat)
  return ids
}

export function loadPlayers(list) {
  players = list.map((p) => ({
    ...p,
    clubs: (p.clubs ?? []).filter((id) => categoryById.has(id)),
    awards: (p.awards ?? []).filter((id) => categoryById.has(id)),
    fame: p.fame ?? 0,
    _n: normalize(p.name),
  }))
  players.sort((a, b) => b.fame - a.fame)
  playerById.clear()
  catIndex.clear()
  notableIndex.clear()
  pairCache.clear()
  for (const c of allCategories) {
    catIndex.set(c.id, new Set())
    notableIndex.set(c.id, new Set())
  }
  for (const p of players) {
    playerById.set(p.id, p)
    for (const id of categoryIdsOf(p)) {
      catIndex.get(id)?.add(p.id)
      if (isNotable(p)) notableIndex.get(id)?.add(p.id)
    }
  }
}

/** Load the imported dataset (falls back to the curated seed list) */
export function loadData() {
  const ds = readDataset()
  if (ds) {
    Object.assign(datasetInfo, { version: ds.version, source: ds.source, notableFame: ds.notableFame })
    loadCategories({ clubs: ds.clubs, nations: ds.nations })
    loadPlayers(ds.players)
  } else {
    loadCategories()
    loadPlayers(seedPlayers.map((p) => ({ ...p, fame: 50 })))
  }
  return { players: players.length, categories: allCategories.length, version: datasetInfo.version }
}

/** Hide players (e.g. deactivated in MongoDB) without reloading everything */
export function removePlayers(ids) {
  const drop = new Set(ids)
  if (!drop.size) return
  loadPlayers(players.filter((p) => !drop.has(p.id)))
}

loadData()

// ---------------- Category helpers ----------------

export function matches(player, categoryId) {
  return catIndex.get(categoryId)?.has(player.id) ?? false
}

export const countFor = (catId, notableOnly = false) => (notableOnly ? notableIndex : catIndex).get(catId)?.size ?? 0

function intersect(a, b) {
  const [small, big] = a.size <= b.size ? [a, b] : [b, a]
  const out = []
  for (const id of small) if (big.has(id)) out.push(id)
  return out
}

function pairCount(a, b) {
  const key = a < b ? `${a}|${b}` : `${b}|${a}`
  let hit = pairCache.get(key)
  if (!hit) {
    hit = {
      total: intersect(catIndex.get(a) ?? new Set(), catIndex.get(b) ?? new Set()).length,
      notable: intersect(notableIndex.get(a) ?? new Set(), notableIndex.get(b) ?? new Set()).length,
    }
    pairCache.set(key, hit)
  }
  return hit
}

/** Players fitting both categories, most famous first */
export function answersFor(rowId, colId) {
  const ids = intersect(catIndex.get(rowId) ?? new Set(), catIndex.get(colId) ?? new Set())
  return ids.map((id) => playerById.get(id)).sort((x, y) => y.fame - x.fame)
}

export function publicCategory(c) {
  const { id, type, name } = c
  return { id, type, name, short: c.short, colors: c.colors, flag: c.flag, icon: c.icon, description: c.description, country: c.country, tier: c.tier }
}

// ---------------- Players ----------------

export function publicPlayer(p) {
  const nation = categoryById.get(nationIdByName.get(p.nationality))
  return {
    id: p.id,
    name: p.name,
    nationality: p.nationality,
    flag: nation?.flag ?? p.flag ?? null,
    position: p.position,
    born: p.born ?? null,
    fame: p.fame,
    wikidataId: p.qid ?? null,
    clubs: p.clubs.map((id) => {
      const c = categoryById.get(id)
      return { id, name: c.name, short: c.short, colors: c.colors }
    }),
    awards: p.awards.map((id) => ({ id, name: categoryById.get(id).name, icon: categoryById.get(id).icon })),
  }
}

/** Autocomplete: exact name > whole word > word prefix > contains; ties broken by fame */
export function searchPlayers(query, limit = 8) {
  const q = normalize(query)
  if (q.length < 2) return []
  const multiWord = q.includes(' ')
  const results = []
  for (const p of players) {
    const n = p._n
    let score = -1
    if (n === q) score = multiWord ? 5 : 4 // single words: let fame decide between "Ronaldo" and "Cristiano Ronaldo"
    else if (multiWord ? n.startsWith(q) || n.includes(' ' + q + ' ') || n.endsWith(' ' + q) : (' ' + n + ' ').includes(' ' + q + ' ')) score = 4
    else if (n.startsWith(q) || n.includes(' ' + q)) score = 3
    else if (q.length >= 3 && n.includes(q)) score = 1
    // Obscure namesakes drop below famous partial matches ("ronaldo" → Cristiano before a 1962 Ronaldo)
    if (score >= 0) results.push({ p, score: isNotable(p) ? score : score - 1.5 })
  }
  // players is already sorted by fame, and sort() is stable
  results.sort((a, b) => b.score - a.score)
  return results.slice(0, limit).map(({ p }) => ({
    id: p.id,
    name: p.name,
    nationality: p.nationality,
    flag: categoryById.get(nationIdByName.get(p.nationality))?.flag ?? p.flag ?? null,
    position: p.position,
    born: p.born ?? null,
  }))
}

/** Server-side browsing with filters, for the Players page and API consumers */
export function browsePlayers({ q, nation, club, award, position, sort = 'fame', page = 1, limit = 30 } = {}) {
  const nq = normalize(q)
  const nationName = nation ? (categoryById.get(nation)?.name ?? nation) : null
  let list = players.filter(
    (p) =>
      (!nq || p._n.includes(nq)) &&
      (!nationName || p.nationality === nationName) &&
      (!club || p.clubs.includes(club)) &&
      (!award || p.awards.includes(award)) &&
      (!position || p.position === position),
  )
  if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
  const total = list.length
  const size = Math.min(Math.max(Number(limit) || 30, 1), 100)
  const pg = Math.max(Number(page) || 1, 1)
  return { total, page: pg, pages: Math.ceil(total / size), limit: size, results: list.slice((pg - 1) * size, pg * size) }
}

/** CPU pick: weighted towards famous players, never an already used one */
export function cpuPick(rowId, colId, exclude = []) {
  const used = new Set(exclude)
  const options = answersFor(rowId, colId).filter((p) => !used.has(p.id))
  if (!options.length) return null
  const pool = options.filter(isNotable).length ? options.filter(isNotable) : options
  const top = pool.slice(0, 25)
  const weights = top.map((p) => Math.sqrt(p.fame + 1))
  let r = Math.random() * weights.reduce((s, w) => s + w, 0)
  for (let i = 0; i < top.length; i++) if ((r -= weights[i]) <= 0) return top[i]
  return top[0]
}

// ---------------- Grid generation ----------------

const DIFFICULTY = {
  // only famous clubs / big football nations, and every square needs 4+ well-known answers
  easy: { min: 4, notable: true, allow: (c) => c.type !== 'award' && c.tier === 1 },
  medium: { min: 2, notable: true, allow: (c) => c.tier <= 2 },
  hard: { min: 1, notable: false, allow: (c) => countFor(c.id) >= 5 },
}

const grids = new Map() // gridId -> grid (kept so answers can be revealed later)

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateGrid(difficulty = 'medium') {
  const cfg = DIFFICULTY[difficulty] ?? DIFFICULTY.medium
  const pool = allCategories.filter((c) => cfg.allow(c) && countFor(c.id, cfg.notable) >= cfg.min * 2)
  const ok = (a, b) => a.id !== b.id && pairCount(a.id, b.id)[cfg.notable ? 'notable' : 'total'] >= cfg.min
  const clubsPool = pool.filter((c) => c.type === 'club')
  const othersPool = pool.filter((c) => c.type !== 'club')

  for (let attempt = 0; attempt < 3000; attempt++) {
    // Rows: mostly clubs, sometimes a nation or award for variety
    const extra = Math.random() < 0.6 ? 1 : Math.random() < 0.5 ? 0 : 2
    const rows = shuffle([...shuffle(clubsPool).slice(0, 3 - Math.min(extra, othersPool.length)), ...shuffle(othersPool).slice(0, extra)]).slice(0, 3)
    if (rows.length < 3) continue
    const candidates = pool.filter((c) => !rows.includes(c) && rows.every((r) => ok(r, c)))
    if (candidates.length < 3) continue
    // Prefer a mix on the columns too: at least one club
    const colClubs = shuffle(candidates.filter((c) => c.type === 'club'))
    const colOthers = shuffle(candidates.filter((c) => c.type !== 'club'))
    const cols = shuffle([...colClubs.slice(0, 2), ...colOthers.slice(0, 1), ...colClubs.slice(2), ...colOthers.slice(1)].slice(0, 3))
    if (cols.length < 3) continue

    const grid = {
      id: randomUUID(),
      difficulty,
      createdAt: new Date().toISOString(),
      rows: rows.map(publicCategory),
      cols: cols.map(publicCategory),
      answerCounts: rows.map((r) => cols.map((c) => pairCount(r.id, c.id).total)),
    }
    grids.set(grid.id, grid)
    if (grids.size > 500) grids.delete(grids.keys().next().value)
    return grid
  }
  throw new Error('Could not generate a valid grid')
}

export const getGrid = (id) => grids.get(id)

/** The best-known answers per square (capped so payloads stay small) */
export function solutionsFor(grid, cap = 25) {
  return grid.rows.map((r) => grid.cols.map((c) => answersFor(r.id, c.id).slice(0, cap).map((p) => ({ id: p.id, name: p.name }))))
}
