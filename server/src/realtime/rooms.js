import { randomBytes } from 'node:crypto'
import { generateGrid, matches, playerById, publicPlayer, solutionsFor } from '../game.js'
import { isDbReady } from '../db.js'
import { Match } from '../models/Match.js'
import { applyMatchResult, profileFromToken } from '../services/profiles.js'
import { trackPick } from '../services/stats.js'

// ---------------- Constants ----------------
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion
const RECONNECT_GRACE_MS = 30_000
const NEXT_ROUND_DELAY_MS = 10_000
const WAITING_ROOM_TTL_MS = 10 * 60_000
const REACTIONS = ['⚽', '🔥', '😂', '😱', '👏', '🤯', '😎', '💀', '🐐', 'GG']

const other = (m) => (m === 'X' ? 'O' : 'X')
const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

/** @type {Map<string, any>} */
const rooms = new Map()
let io = null

function makeCode() {
  let code
  do {
    code = Array.from(randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
  } while (rooms.has(code))
  return code
}

function findWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line
    if (board[a] && board[a].mark === board[b]?.mark && board[a].mark === board[c]?.mark) return { mark: board[a].mark, line }
  }
  return null
}

// ---------------- State serialisation ----------------

function publicSeat(seat) {
  if (!seat) return null
  return {
    name: seat.name,
    avatar: seat.avatar,
    rating: seat.rating,
    registered: !!seat.profileId,
    connected: seat.connected,
  }
}

function publicState(room, mark) {
  return {
    code: room.code,
    you: mark ?? null,
    settings: room.settings,
    status: room.status,
    ranked: isRanked(room),
    seats: { X: publicSeat(room.seats.X), O: publicSeat(room.seats.O) },
    round: room.round,
    scores: room.scores,
    grid: room.grid ? { id: room.grid.id, rows: room.grid.rows, cols: room.grid.cols, answerCounts: room.grid.answerCounts } : null,
    board: room.board,
    turn: room.turn,
    turnEndsAt: room.turnEndsAt,
    nextRoundAt: room.nextRoundAt,
    roundResult: room.roundResult,
    solutions: room.status === 'round_over' || room.status === 'finished' ? room.solutions : null,
    readyNext: [...room.readyNext],
    rematch: [...room.rematch],
    matchResult: room.matchResult,
    chat: room.chat,
    serverNow: Date.now(),
  }
}

function broadcast(room) {
  for (const mark of ['X', 'O']) {
    const seat = room.seats[mark]
    if (seat?.socketId) io.to(seat.socketId).emit('room:state', publicState(room, mark))
  }
}

function emitEvent(room, event) {
  io.to(room.code).emit('game:event', { ...event, at: Date.now() })
}

const isRanked = (room) =>
  !!(room.seats.X?.profileId && room.seats.O?.profileId && room.seats.X.profileId !== room.seats.O.profileId)

export function roomPreview(code) {
  const room = rooms.get(code)
  if (!room) return null
  return {
    code,
    status: room.status,
    settings: room.settings,
    host: publicSeat(room.seats.X),
    full: !!(room.seats.X && room.seats.O),
  }
}

export function liveStats() {
  let playing = 0
  let waiting = 0
  for (const r of rooms.values()) {
    if (r.status === 'waiting') waiting++
    else if (r.status !== 'finished') playing++
  }
  return { rooms: rooms.size, playing, waiting, online: io ? io.engine.clientsCount : 0 }
}

// ---------------- Game flow ----------------

function clearTimers(room) {
  clearTimeout(room.turnTimer)
  clearTimeout(room.nextRoundTimer)
  room.turnTimer = null
  room.nextRoundTimer = null
}

function startMatch(room) {
  room.round = 0
  room.scores = { X: 0, O: 0, draws: 0 }
  room.rounds = []
  room.matchResult = null
  room.rematch = new Set()
  room.startedAt = new Date()
  room.guesses = { X: { correct: 0, wrong: 0 }, O: { correct: 0, wrong: 0 } }
  emitEvent(room, { type: 'kickoff' })
  startRound(room)
}

function startRound(room) {
  clearTimers(room)
  room.round += 1
  room.grid = generateGrid(room.settings.difficulty)
  room.solutions = solutionsFor(room.grid)
  room.board = Array(9).fill(null)
  room.turn = room.round % 2 === 1 ? 'X' : 'O' // alternate who starts
  room.roundResult = null
  room.readyNext = new Set()
  room.nextRoundAt = null
  room.moves = []
  room.status = 'playing'
  startTurn(room)
}

function startTurn(room) {
  clearTimeout(room.turnTimer)
  if (room.settings.timer > 0) {
    room.turnEndsAt = Date.now() + room.settings.timer * 1000
    room.turnTimer = setTimeout(() => onTimeout(room), room.settings.timer * 1000 + 250)
  } else {
    room.turnEndsAt = null
  }
  broadcast(room)
}

function passTurn(room) {
  room.turn = other(room.turn)
  startTurn(room)
}

function onTimeout(room) {
  if (room.status !== 'playing') return
  const mark = room.turn
  room.moves.push({ mark, result: 'timeout' })
  emitEvent(room, { type: 'timeout', mark, name: room.seats[mark]?.name })
  passTurn(room)
}

function endRound(room, winner, line) {
  clearTimers(room)
  room.turnEndsAt = null
  if (winner) room.scores[winner] += 1
  else room.scores.draws += 1
  room.roundResult = { winner, line }
  room.rounds.push({ grid: { rows: room.grid.rows.map((r) => r.id), cols: room.grid.cols.map((c) => c.id) }, winner, moves: room.moves })

  const { bestOf } = room.settings
  const needed = Math.ceil(bestOf / 2)
  const decided = room.scores.X >= needed || room.scores.O >= needed
  // Draws make a series longer, so cap it at bestOf + 2 rounds
  const outOfRounds = room.round >= bestOf + 2 || (room.round >= bestOf && room.scores.X !== room.scores.O)

  if (decided || outOfRounds) {
    const w = room.scores.X > room.scores.O ? 'X' : room.scores.O > room.scores.X ? 'O' : null
    finishMatch(room, w, 'completed')
    return
  }
  room.status = 'round_over'
  room.nextRoundAt = Date.now() + NEXT_ROUND_DELAY_MS
  room.nextRoundTimer = setTimeout(() => room.status === 'round_over' && startRound(room), NEXT_ROUND_DELAY_MS)
  emitEvent(room, { type: 'round_over', winner, name: winner ? room.seats[winner]?.name : null })
  broadcast(room)
}

async function finishMatch(room, winner, reason) {
  clearTimers(room)
  room.turnEndsAt = null
  room.nextRoundAt = null
  room.status = 'finished'
  room.matchResult = { winner, reason, ratingChange: null, saving: true }
  emitEvent(room, { type: 'match_over', winner, reason, name: winner ? room.seats[winner]?.name : null })
  broadcast(room)

  const ranked = isRanked(room)
  try {
    const ratingChange = await applyMatchResult({
      seats: room.seats,
      winner,
      ranked,
      guesses: room.guesses,
      roundsWon: { X: room.scores.X, O: room.scores.O },
    })
    if (isDbReady()) {
      await Match.create({
        code: room.code,
        mode: 'online',
        ranked,
        difficulty: room.settings.difficulty,
        timer: room.settings.timer,
        bestOf: room.settings.bestOf,
        players: ['X', 'O'].map((m) => ({
          profile: room.seats[m]?.profileId ?? null,
          name: room.seats[m]?.name ?? 'Player',
          avatar: room.seats[m]?.avatar,
          mark: m,
          roundsWon: room.scores[m],
          ratingBefore: ratingChange?.[m]?.before,
          ratingAfter: ratingChange?.[m]?.after,
        })),
        rounds: room.rounds,
        winner,
        endReason: reason,
        startedAt: room.startedAt,
        endedAt: new Date(),
      })
    }
    if (ratingChange) {
      for (const m of ['X', 'O']) if (ratingChange[m] && room.seats[m]) room.seats[m].rating = ratingChange[m].after
    }
    room.matchResult = { winner, reason, ratingChange, saving: false }
  } catch (err) {
    console.error('Failed to save match', err.message)
    room.matchResult = { winner, reason, ratingChange: null, saving: false, error: 'Could not save match' }
  }
  broadcast(room)
}

function deleteRoom(room) {
  clearTimers(room)
  for (const m of ['X', 'O']) clearTimeout(room.seats[m]?.disconnectTimer)
  rooms.delete(room.code)
}

// ---------------- Seats ----------------

function makeSeat(socket, guestName) {
  const profile = socket.data.profile
  if (clean(guestName, 18)) socket.data.guestName = clean(guestName, 18)
  return {
    seatToken: randomBytes(16).toString('hex'),
    socketId: socket.id,
    profileId: profile?.id ?? null,
    name: profile?.username ?? socket.data.guestName,
    avatar: profile?.avatar ?? '👤',
    rating: profile?.rating ?? null,
    connected: true,
    disconnectTimer: null,
  }
}

function seatOf(room, socketId) {
  if (room.seats.X?.socketId === socketId) return 'X'
  if (room.seats.O?.socketId === socketId) return 'O'
  return null
}

function leaveCurrentRoom(socket, { explicit }) {
  const code = socket.data.roomCode
  if (!code) return
  const room = rooms.get(code)
  socket.leave(code)
  socket.data.roomCode = null
  if (!room) return
  const mark = seatOf(room, socket.id)
  if (!mark) return
  const seat = room.seats[mark]

  if (!explicit) {
    // Socket dropped: keep the seat for a grace period
    seat.connected = false
    seat.socketId = null
    emitEvent(room, { type: 'disconnected', mark, name: seat.name })
    broadcast(room)
    seat.disconnectTimer = setTimeout(() => {
      if (seat.connected) return
      if (room.status === 'playing' || room.status === 'round_over') finishMatch(room, other(mark), 'forfeit')
      else if (room.status === 'waiting') deleteRoom(room)
      else if (!room.seats[other(mark)]?.connected) deleteRoom(room)
    }, RECONNECT_GRACE_MS)
    return
  }

  // Explicit leave
  clearTimeout(seat.disconnectTimer)
  if (room.status === 'playing' || room.status === 'round_over') {
    seat.connected = false
    seat.socketId = null
    emitEvent(room, { type: 'left', mark, name: seat.name })
    finishMatch(room, other(mark), 'forfeit')
    return
  }
  room.seats[mark] = null
  if (room.status === 'waiting') {
    if (mark === 'X') {
      // Host left the lobby: promote the guest if there is one, otherwise close the room
      if (room.seats.O) {
        room.seats.X = room.seats.O
        room.seats.O = null
      } else return deleteRoom(room)
    }
    broadcast(room)
    return
  }
  // finished
  emitEvent(room, { type: 'left', mark, name: seat.name })
  if (!room.seats.X && !room.seats.O) deleteRoom(room)
  else broadcast(room)
}

// ---------------- Socket handlers ----------------

const ok = (cb, data = {}) => typeof cb === 'function' && cb({ ok: true, ...data })
const fail = (cb, error) => typeof cb === 'function' && cb({ ok: false, error })

export function attachRealtime(server) {
  io = server

  // Identify sockets: registered profile (token) or guest name
  io.use(async (socket, next) => {
    const { token, guestName } = socket.handshake.auth ?? {}
    socket.data.guestName = clean(guestName, 18) || `Guest${Math.floor(1000 + Math.random() * 9000)}`
    try {
      const profile = await profileFromToken(token)
      socket.data.profile = profile ? { id: profile._id.toString(), username: profile.username, avatar: profile.avatar, rating: Math.round(profile.rating) } : null
    } catch {
      socket.data.profile = null
    }
    next()
  })

  io.on('connection', (socket) => {
    socket.emit('hello', { profile: socket.data.profile, guestName: socket.data.guestName, live: liveStats() })

    socket.on('room:create', (payload, cb) => {
      leaveCurrentRoom(socket, { explicit: true })
      const s = payload?.settings ?? {}
      const room = {
        code: makeCode(),
        createdAt: Date.now(),
        settings: {
          difficulty: ['easy', 'medium', 'hard'].includes(s.difficulty) ? s.difficulty : 'medium',
          timer: [0, 15, 30, 60].includes(Number(s.timer)) ? Number(s.timer) : 30,
          bestOf: [1, 3, 5].includes(Number(s.bestOf)) ? Number(s.bestOf) : 3,
        },
        seats: { X: makeSeat(socket, payload?.guestName), O: null },
        status: 'waiting',
        round: 0,
        scores: { X: 0, O: 0, draws: 0 },
        board: Array(9).fill(null),
        turn: 'X',
        readyNext: new Set(),
        rematch: new Set(),
        chat: [],
        moves: [],
        rounds: [],
      }
      rooms.set(room.code, room)
      socket.join(room.code)
      socket.data.roomCode = room.code
      ok(cb, { code: room.code, seatToken: room.seats.X.seatToken, state: publicState(room, 'X') })
    })

    socket.on('room:join', (payload, cb) => {
      const code = clean(payload?.code, 6).toUpperCase()
      const room = rooms.get(code)
      if (!room) return fail(cb, 'Room not found — check the code')
      if (socket.data.roomCode === code && seatOf(room, socket.id)) return ok(cb, { code, state: publicState(room, seatOf(room, socket.id)) })
      if (room.status !== 'waiting' || (room.seats.X && room.seats.O)) return fail(cb, 'This room is already full')
      const profileId = socket.data.profile?.id
      if (profileId && (room.seats.X?.profileId === profileId || room.seats.O?.profileId === profileId))
        return fail(cb, "You can't play against yourself 😄")

      leaveCurrentRoom(socket, { explicit: true })
      const mark = room.seats.X ? 'O' : 'X'
      room.seats[mark] = makeSeat(socket, payload?.guestName)
      socket.join(code)
      socket.data.roomCode = code
      ok(cb, { code, seatToken: room.seats[mark].seatToken, state: publicState(room, mark) })
      emitEvent(room, { type: 'joined', mark, name: room.seats[mark].name })
      if (room.seats.X && room.seats.O) startMatch(room)
      else broadcast(room)
    })

    // Reconnect to a seat after a refresh / network drop
    socket.on('room:rejoin', (payload, cb) => {
      const room = rooms.get(clean(payload?.code, 6).toUpperCase())
      if (!room) return fail(cb, 'Room no longer exists')
      const mark = ['X', 'O'].find((m) => room.seats[m]?.seatToken === payload?.seatToken)
      if (!mark) return fail(cb, 'Seat not found')
      const seat = room.seats[mark]
      clearTimeout(seat.disconnectTimer)
      if (seat.socketId && seat.socketId !== socket.id) io.sockets.sockets.get(seat.socketId)?.disconnect(true)
      seat.socketId = socket.id
      seat.connected = true
      socket.join(room.code)
      socket.data.roomCode = room.code
      ok(cb, { code: room.code, seatToken: seat.seatToken, state: publicState(room, mark) })
      emitEvent(room, { type: 'reconnected', mark, name: seat.name })
      broadcast(room)
    })

    socket.on('room:leave', (_p, cb) => {
      leaveCurrentRoom(socket, { explicit: true })
      ok(cb)
    })

    // Live "opponent is looking at this square" indicator
    socket.on('game:focus', (payload) => {
      const room = rooms.get(socket.data.roomCode)
      if (!room || room.status !== 'playing') return
      const mark = seatOf(room, socket.id)
      if (!mark || mark !== room.turn) return
      const cell = Number.isInteger(payload?.cell) && payload.cell >= 0 && payload.cell < 9 ? payload.cell : null
      socket.to(room.code).emit('game:focus', { mark, cell })
    })

    socket.on('game:guess', (payload, cb) => {
      const room = rooms.get(socket.data.roomCode)
      if (!room || room.status !== 'playing') return fail(cb, 'No active round')
      const mark = seatOf(room, socket.id)
      if (mark !== room.turn) return fail(cb, "It's not your turn")
      const cell = Number(payload?.cell)
      if (!Number.isInteger(cell) || cell < 0 || cell > 8 || room.board[cell]) return fail(cb, 'Square not available')
      const player = playerById.get(payload?.footballerId)
      if (!player) return fail(cb, 'Unknown player')
      if (room.board.some((c) => c?.player.id === player.id)) return fail(cb, 'That player is already on the board')

      const row = room.grid.rows[Math.floor(cell / 3)]
      const col = room.grid.cols[cell % 3]
      const okRow = matches(player, row.id)
      const okCol = matches(player, col.id)
      const valid = okRow && okCol
      trackPick(player.id, valid)
      room.guesses[mark][valid ? 'correct' : 'wrong'] += 1
      room.moves.push({ mark, cell, footballer: player.id, name: player.name, result: valid ? 'correct' : 'wrong' })
      ok(cb, { valid })
      socket.to(room.code).emit('game:focus', { mark, cell: null })

      if (!valid) {
        const missed = [!okRow && row.name, !okCol && col.name].filter(Boolean)
        emitEvent(room, { type: 'wrong', mark, name: room.seats[mark].name, cell, player: player.name, missed })
        passTurn(room)
        return
      }

      room.board[cell] = { mark, player: publicPlayer(player) }
      emitEvent(room, { type: 'correct', mark, name: room.seats[mark].name, cell, player: player.name })
      const win = findWinner(room.board)
      if (win) endRound(room, win.mark, win.line)
      else if (room.board.every(Boolean)) endRound(room, null, null)
      else passTurn(room)
    })

    socket.on('game:skip', (_p, cb) => {
      const room = rooms.get(socket.data.roomCode)
      if (!room || room.status !== 'playing') return fail(cb, 'No active round')
      const mark = seatOf(room, socket.id)
      if (mark !== room.turn) return fail(cb, "It's not your turn")
      room.moves.push({ mark, result: 'skip' })
      emitEvent(room, { type: 'skip', mark, name: room.seats[mark].name })
      ok(cb)
      passTurn(room)
    })

    socket.on('game:ready', (_p, cb) => {
      const room = rooms.get(socket.data.roomCode)
      if (!room || room.status !== 'round_over') return fail(cb, 'Not between rounds')
      const mark = seatOf(room, socket.id)
      if (!mark) return fail(cb, 'Not seated')
      room.readyNext.add(mark)
      ok(cb)
      if (room.readyNext.size === 2) startRound(room)
      else broadcast(room)
    })

    socket.on('game:rematch', (_p, cb) => {
      const room = rooms.get(socket.data.roomCode)
      if (!room || room.status !== 'finished') return fail(cb, 'Match is not over')
      const mark = seatOf(room, socket.id)
      if (!mark) return fail(cb, 'Not seated')
      if (!room.seats[other(mark)]?.connected) return fail(cb, 'Your opponent has left')
      room.rematch.add(mark)
      ok(cb)
      if (room.rematch.size === 2) {
        // Swap marks so the other player gets X (and starts round 1)
        const { X, O } = room.seats
        room.seats = { X: O, O: X }
        startMatch(room)
      } else {
        emitEvent(room, { type: 'rematch_request', mark, name: room.seats[mark].name })
        broadcast(room)
      }
    })

    socket.on('chat:send', (payload, cb) => {
      const room = rooms.get(socket.data.roomCode)
      if (!room) return fail(cb, 'Not in a room')
      const mark = seatOf(room, socket.id)
      if (!mark) return fail(cb, 'Not seated')
      const now = Date.now()
      if (now - (socket.data.lastChat ?? 0) < 600) return fail(cb, 'Slow down')
      socket.data.lastChat = now
      const reaction = REACTIONS.includes(payload?.reaction) ? payload.reaction : null
      const text = reaction ? null : clean(payload?.text, 140)
      if (!reaction && !text) return fail(cb, 'Empty message')
      const msg = { id: randomBytes(6).toString('hex'), mark, name: room.seats[mark].name, text, reaction, at: now }
      if (text) room.chat = [...room.chat, msg].slice(-40)
      io.to(room.code).emit('chat:message', msg)
      ok(cb)
    })

    socket.on('disconnect', () => leaveCurrentRoom(socket, { explicit: false }))
  })

  // Housekeeping: drop stale lobbies and abandoned finished rooms
  setInterval(() => {
    const now = Date.now()
    for (const room of rooms.values()) {
      const anyone = room.seats.X?.connected || room.seats.O?.connected
      if (room.status === 'waiting' && now - room.createdAt > WAITING_ROOM_TTL_MS) deleteRoom(room)
      else if (room.status === 'finished' && !anyone) deleteRoom(room)
    }
  }, 60_000).unref()
}
