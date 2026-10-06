import { Router } from 'express'
import mongoose from 'mongoose'
import { allCategories, categoryById } from '../data/categories.js'
import {
  answersFor,
  generateGrid,
  getGrid,
  matches,
  playerById,
  players,
  publicCategory,
  publicPlayer,
  searchPlayers,
  solutionsFor,
} from '../game.js'
import { isDbReady } from '../db.js'
import { Profile } from '../models/Profile.js'
import { Match } from '../models/Match.js'
import { Footballer } from '../models/Footballer.js'
import { AVATARS, USERNAME_RE, attachProfile, hashToken, newToken, requireDb } from '../services/profiles.js'
import { trackPick } from '../services/stats.js'
import { roomPreview, liveStats } from '../realtime/rooms.js'

const router = Router()
router.use(attachProfile)

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

router.get('/health', (_req, res) =>
  res.json({ ok: true, db: isDbReady(), players: players.length, categories: allCategories.length, live: liveStats() }),
)

// ---------------- Categories ----------------
router.get('/categories', (req, res) => {
  const { type } = req.query
  res.json(
    allCategories
      .filter((c) => !type || c.type === type)
      .map((c) => ({ ...publicCategory(c), playerCount: players.filter((p) => matches(p, c.id)).length })),
  )
})

// ---------------- Footballers ----------------
router.get(
  '/players',
  wrap(async (req, res) => {
    const { search, limit } = req.query
    if (search) return res.json(searchPlayers(search, Math.min(Number(limit) || 8, 25)))

    const page = Math.max(Number(req.query.page) || 1, 1)
    const size = Math.min(Number(limit) || 50, 500)
    const statsBySlug = new Map()
    if (isDbReady()) {
      const docs = await Footballer.find({}, { slug: 1, stats: 1 }).lean()
      for (const d of docs) statsBySlug.set(d.slug, d.stats)
    }
    const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name))
    res.json({
      total: sorted.length,
      page,
      results: sorted
        .slice((page - 1) * size, page * size)
        .map((p) => ({ ...publicPlayer(p), stats: statsBySlug.get(p.id) ?? { picked: 0, correct: 0 } })),
    })
  }),
)

router.get('/players/:id', (req, res) => {
  const p = playerById.get(req.params.id)
  if (!p) return res.status(404).json({ error: 'Player not found' })
  res.json(publicPlayer(p))
})

// ---------------- Grids (offline modes) ----------------
router.get('/grid', (req, res) => {
  try {
    res.json(generateGrid(req.query.difficulty))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/grid/:id/solutions', (req, res) => {
  const grid = getGrid(req.params.id)
  if (!grid) return res.status(404).json({ error: 'Grid not found (server may have restarted)' })
  res.json(solutionsFor(grid))
})

router.post('/validate', (req, res) => {
  const { playerId, rowId, colId } = req.body ?? {}
  const player = playerById.get(playerId)
  if (!player) return res.status(404).json({ error: 'Player not found' })
  if (!categoryById.has(rowId) || !categoryById.has(colId)) return res.status(400).json({ error: 'Unknown category' })
  const okRow = matches(player, rowId)
  const okCol = matches(player, colId)
  trackPick(player.id, okRow && okCol)
  res.json({ valid: okRow && okCol, matchesRow: okRow, matchesCol: okCol, player: publicPlayer(player) })
})

router.post('/cpu-answer', (req, res) => {
  const { rowId, colId, exclude = [] } = req.body ?? {}
  const options = answersFor(rowId, colId).filter((p) => !exclude.includes(p.id))
  if (!options.length) return res.json({ player: null })
  res.json({ player: publicPlayer(options[Math.floor(Math.random() * options.length)]) })
})

// ---------------- Profiles ----------------
router.get('/avatars', (_req, res) => res.json(AVATARS))

router.get(
  '/profiles/available',
  requireDb,
  wrap(async (req, res) => {
    const u = String(req.query.username ?? '')
    if (!USERNAME_RE.test(u)) return res.json({ available: false, reason: '3–18 letters, numbers or _' })
    const taken = await Profile.exists({ usernameLower: u.toLowerCase() })
    res.json({ available: !taken, reason: taken ? 'Username already taken' : null })
  }),
)

router.post(
  '/profiles',
  requireDb,
  wrap(async (req, res) => {
    const username = String(req.body?.username ?? '').trim()
    const avatar = AVATARS.includes(req.body?.avatar) ? req.body.avatar : AVATARS[0]
    if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'Username must be 3–18 letters, numbers or _' })
    if (await Profile.exists({ usernameLower: username.toLowerCase() })) return res.status(409).json({ error: 'Username already taken' })
    const token = newToken()
    const profile = await Profile.create({ username, usernameLower: username.toLowerCase(), avatar, tokenHash: hashToken(token) })
    res.status(201).json({ token, profile: profile.toPublic() })
  }),
)

router.get(
  '/profiles/me',
  requireDb,
  wrap(async (req, res) => {
    if (!req.profile) return res.status(401).json({ error: 'Invalid or missing profile token' })
    const rank = (await Profile.countDocuments({ rating: { $gt: req.profile.rating }, 'stats.played': { $gt: 0 } })) + 1
    res.json({ ...req.profile.toPublic(), rank: req.profile.stats.played ? rank : null })
  }),
)

router.patch(
  '/profiles/me',
  requireDb,
  wrap(async (req, res) => {
    if (!req.profile) return res.status(401).json({ error: 'Invalid or missing profile token' })
    if (req.body?.avatar && AVATARS.includes(req.body.avatar)) req.profile.avatar = req.body.avatar
    await req.profile.save()
    res.json(req.profile.toPublic())
  }),
)

router.get(
  '/profiles/:username',
  requireDb,
  wrap(async (req, res) => {
    const profile = await Profile.findOne({ usernameLower: String(req.params.username).toLowerCase() })
    if (!profile) return res.status(404).json({ error: 'Profile not found' })
    const recent = await Match.find({ 'players.profile': profile._id }).sort({ endedAt: -1 }).limit(10)
    res.json({ ...profile.toPublic(), recentMatches: recent.map((m) => m.toPublic()) })
  }),
)

// ---------------- Leaderboard ----------------
router.get(
  '/leaderboard',
  wrap(async (req, res) => {
    if (!isDbReady()) return res.json({ db: false, results: [] })
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const top = await Profile.find({ 'stats.played': { $gt: 0 } })
      .sort({ rating: -1, 'stats.wins': -1 })
      .limit(limit)
    res.json({ db: true, results: top.map((p, i) => ({ rank: i + 1, ...p.toPublic() })) })
  }),
)

// ---------------- Matches ----------------
router.get(
  '/matches',
  wrap(async (req, res) => {
    if (!isDbReady()) return res.json([])
    const filter = req.query.mode ? { mode: req.query.mode } : {}
    const list = await Match.find(filter)
      .sort({ endedAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 20, 100))
    res.json(list.map((m) => m.toPublic()))
  }),
)

// Offline (local / cpu) rounds reported by the client. These never change ratings.
router.post(
  '/matches',
  wrap(async (req, res) => {
    const { players: ps, winner, mode, difficulty, picks } = req.body ?? {}
    if (!Array.isArray(ps) || ps.length !== 2) return res.status(400).json({ error: 'players must be an array of 2' })
    if (!isDbReady()) return res.status(202).json({ saved: false })
    const w = winner === 'X' || winner === 'O' ? winner : null
    const match = await Match.create({
      mode: mode === 'cpu' ? 'cpu' : 'local',
      ranked: false,
      difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
      players: ps.map((p, i) => ({
        profile: i === 0 && req.profile ? req.profile._id : null,
        name: String(p.name ?? '').slice(0, 24) || 'Player',
        avatar: i === 0 && req.profile ? req.profile.avatar : undefined,
        mark: i === 0 ? 'X' : 'O',
        roundsWon: w === (i === 0 ? 'X' : 'O') ? 1 : 0,
      })),
      rounds: [
        {
          winner: w,
          moves: (Array.isArray(picks) ? picks.slice(0, 9) : []).map((p) => ({ mark: p.mark, name: String(p.name), result: 'correct' })),
        },
      ],
      winner: w,
      startedAt: new Date(),
    })
    res.status(201).json(match.toPublic())
  }),
)

// ---------------- Stats ----------------
router.get(
  '/stats',
  wrap(async (_req, res) => {
    const live = liveStats()
    if (!isDbReady()) return res.json({ db: false, totalMatches: 0, onlineMatches: 0, profiles: 0, mostPicked: [], live })
    const [totalMatches, onlineMatches, profiles, mostPicked] = await Promise.all([
      Match.estimatedDocumentCount(),
      Match.countDocuments({ mode: 'online' }),
      Profile.estimatedDocumentCount(),
      Footballer.find({ 'stats.picked': { $gt: 0 } }).sort({ 'stats.picked': -1 }).limit(10).lean(),
    ])
    res.json({
      db: true,
      totalMatches,
      onlineMatches,
      profiles,
      live,
      mostPicked: mostPicked.map((f) => ({ name: f.name, count: f.stats.picked, correct: f.stats.correct })),
    })
  }),
)

// ---------------- Rooms (preview before joining) ----------------
router.get('/rooms/:code', (req, res) => {
  const preview = roomPreview(String(req.params.code).toUpperCase())
  if (!preview) return res.status(404).json({ error: 'Room not found' })
  res.json(preview)
})

// Error handler
router.use((err, _req, res, _next) => {
  if (err instanceof mongoose.Error) return res.status(503).json({ error: 'Database error', detail: err.message })
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

export default router
