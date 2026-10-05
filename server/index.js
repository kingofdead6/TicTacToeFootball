import express from 'express'
import cors from 'cors'
import { randomUUID } from 'node:crypto'
import { players } from './src/data/players.js'
import { allCategories, categoryById } from './src/data/categories.js'
import {
  answersFor,
  generateGrid,
  getGrid,
  matches,
  playerById,
  publicCategory,
  publicPlayer,
  searchPlayers,
  solutionsFor,
} from './src/game.js'
import { addMatch, leaderboard, listMatches, stats } from './src/store.js'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true, players: players.length, categories: allCategories.length }))

// ---- Categories ----
app.get('/api/categories', (req, res) => {
  const { type } = req.query
  const list = allCategories.filter((c) => !type || c.type === type).map((c) => ({
    ...publicCategory(c),
    playerCount: players.filter((p) => matches(p, c.id)).length,
  }))
  res.json(list)
})

// ---- Players ----
app.get('/api/players', (req, res) => {
  const { search, limit } = req.query
  if (search) return res.json(searchPlayers(search, Math.min(Number(limit) || 8, 25)))
  const page = Math.max(Number(req.query.page) || 1, 1)
  const size = Math.min(Number(limit) || 50, 500)
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name))
  res.json({
    total: sorted.length,
    page,
    results: sorted.slice((page - 1) * size, page * size).map(publicPlayer),
  })
})

app.get('/api/players/:id', (req, res) => {
  const p = playerById.get(req.params.id)
  if (!p) return res.status(404).json({ error: 'Player not found' })
  res.json(publicPlayer(p))
})

// ---- Grids ----
app.get('/api/grid', (req, res) => {
  try {
    res.json(generateGrid(req.query.difficulty))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/grid/:id/solutions', (req, res) => {
  const grid = getGrid(req.params.id)
  if (!grid) return res.status(404).json({ error: 'Grid not found (server may have restarted)' })
  res.json(solutionsFor(grid))
})

// Validate a guess for one cell
app.post('/api/validate', (req, res) => {
  const { playerId, rowId, colId } = req.body ?? {}
  const player = playerById.get(playerId)
  if (!player) return res.status(404).json({ error: 'Player not found' })
  if (!categoryById.has(rowId) || !categoryById.has(colId)) return res.status(400).json({ error: 'Unknown category' })
  const okRow = matches(player, rowId)
  const okCol = matches(player, colId)
  res.json({ valid: okRow && okCol, matchesRow: okRow, matchesCol: okCol, player: publicPlayer(player) })
})

// Random valid answer for a cell (used by the CPU opponent), excluding already used players
app.post('/api/cpu-answer', (req, res) => {
  const { rowId, colId, exclude = [] } = req.body ?? {}
  const options = answersFor(rowId, colId).filter((p) => !exclude.includes(p.id))
  if (!options.length) return res.json({ player: null })
  res.json({ player: publicPlayer(options[Math.floor(Math.random() * options.length)]) })
})

// ---- Matches / leaderboard ----
app.get('/api/matches', (req, res) => res.json(listMatches(Math.min(Number(req.query.limit) || 20, 100))))

app.post('/api/matches', (req, res) => {
  const { players: ps, winner, mode, difficulty, picks, gridId } = req.body ?? {}
  if (!Array.isArray(ps) || ps.length !== 2) return res.status(400).json({ error: 'players must be an array of 2' })
  const match = addMatch({
    id: randomUUID(),
    playedAt: new Date().toISOString(),
    players: ps.map((p) => ({ name: String(p.name ?? '').slice(0, 24) || 'Player', mark: p.mark })),
    winner: winner === 'X' || winner === 'O' ? winner : null,
    mode: mode ?? 'local',
    difficulty: difficulty ?? 'medium',
    gridId: gridId ?? null,
    picks: Array.isArray(picks) ? picks.slice(0, 9).map((p) => ({ name: String(p.name), mark: p.mark })) : [],
  })
  res.status(201).json(match)
})

app.get('/api/leaderboard', (_req, res) => res.json(leaderboard()))
app.get('/api/stats', (_req, res) => res.json(stats()))

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`TicTacToe Football API running on http://localhost:${PORT}`))
