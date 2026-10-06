import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { api } from '../api.js'
import Cell from '../components/Cell.jsx'
import CategoryBadge from '../components/CategoryBadge.jsx'
import SearchModal from '../components/SearchModal.jsx'
import ResultModal from '../components/ResultModal.jsx'
import Toasts from '../components/Toasts.jsx'
import WinLine from '../components/WinLine.jsx'

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]
const CPU_SKILL = { rookie: 0.5, pro: 0.75, legend: 0.93 }
const other = (m) => (m === 'X' ? 'O' : 'X')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const emptyBoard = () => Array(9).fill(null)

function findWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line
    if (board[a] && board[a].mark === board[b]?.mark && board[a].mark === board[c]?.mark) return { mark: board[a].mark, line }
  }
  return null
}

// Win if possible, otherwise block, otherwise take center/corners
function chooseCpuCell(board) {
  for (const mark of ['O', 'X']) {
    for (const line of LINES) {
      const free = line.filter((i) => !board[i])
      if (free.length === 1 && line.filter((i) => board[i]?.mark === mark).length === 2) return free[0]
    }
  }
  if (!board[4]) return 4
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
  const corners = [0, 2, 6, 8].filter((i) => !board[i])
  if (corners.length && Math.random() < 0.7) return pick(corners)
  return pick(board.map((v, i) => (v ? null : i)).filter((i) => i !== null))
}

function fireConfetti(mark) {
  const colors = mark === 'X' ? ['#38bdf8', '#e0f2fe', '#fbbf24'] : ['#fb7185', '#ffe4e6', '#fbbf24']
  const end = Date.now() + 1200
  ;(function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors })
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
  confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors, scalar: 1.1 })
}

export default function Game({ settings, onExit }) {
  const { names, mode, difficulty, timer, cpuLevel } = settings

  const [grid, setGrid] = useState(null)
  const [error, setError] = useState(null)
  const [board, setBoard] = useState(emptyBoard)
  const [turn, setTurn] = useState('X')
  const [round, setRound] = useState(1)
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 })
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [checking, setChecking] = useState(false)
  const [shakeIdx, setShakeIdx] = useState(null)
  const [timeLeft, setTimeLeft] = useState(timer)
  const [cpuTarget, setCpuTarget] = useState(null)
  const [solutions, setSolutions] = useState(null)
  const [toasts, setToasts] = useState([])

  const boardRef = useRef(board)
  boardRef.current = board

  const isCpuTurn = mode === 'cpu' && turn === 'O'
  const usedIds = board.filter(Boolean).map((c) => c.player.id)
  const nameOf = (mark) => names[mark === 'X' ? 0 : 1]

  const toast = useCallback((text, tone = 'info') => {
    const id = Math.random()
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800)
  }, [])

  const loadGrid = useCallback(async () => {
    setGrid(null)
    setError(null)
    try {
      setGrid(await api.grid(difficulty))
    } catch (e) {
      setError(e.message)
    }
  }, [difficulty])

  useEffect(() => {
    loadGrid()
  }, [loadGrid])

  const passTurn = useCallback(() => {
    setTurn((t) => other(t))
    setTimeLeft(timer)
  }, [timer])

  const shake = (idx) => {
    setShakeIdx(idx)
    setTimeout(() => setShakeIdx(null), 550)
  }

  const finishRound = (finalBoard, res) => {
    setResult(res)
    setScores((s) => (res.winner === 'draw' ? { ...s, draws: s.draws + 1 } : { ...s, [res.winner]: s[res.winner] + 1 }))
    if (res.winner !== 'draw') fireConfetti(res.winner)
    setTimeout(() => setShowResult(true), res.winner === 'draw' ? 500 : 1400)
    api
      .saveMatch({
        players: [
          { name: names[0], mark: 'X' },
          { name: names[1], mark: 'O' },
        ],
        winner: res.winner === 'draw' ? null : res.winner,
        mode,
        difficulty,
        gridId: grid?.id,
        picks: finalBoard.filter(Boolean).map((c) => ({ name: c.player.name, mark: c.mark })),
      })
      .catch(() => {})
  }

  const place = (idx, player, mark) => {
    const next = boardRef.current.slice()
    next[idx] = { mark, player }
    setBoard(next)
    const win = findWinner(next)
    if (win) finishRound(next, { winner: win.mark, line: win.line })
    else if (next.every(Boolean)) finishRound(next, { winner: 'draw', line: null })
    else passTurn()
  }

  const handlePick = async (p) => {
    if (selected == null || checking) return
    const idx = selected
    const row = grid.rows[Math.floor(idx / 3)]
    const col = grid.cols[idx % 3]
    setChecking(true)
    try {
      const res = await api.validate(p.id, row.id, col.id)
      setSelected(null)
      if (res.valid) {
        toast(`✅ ${res.player.name} — correct!`, 'success')
        place(idx, res.player, turn)
      } else {
        const missed = [!res.matchesRow && row.name, !res.matchesCol && col.name].filter(Boolean).join(' & ')
        toast(`❌ ${p.name} doesn't fit ${missed}`, 'error')
        shake(idx)
        passTurn()
      }
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setChecking(false)
    }
  }

  // Turn timer
  useEffect(() => {
    if (!timer || result || !grid || isCpuTurn || checking) return
    if (timeLeft <= 0) {
      toast(`⏱ Time's up for ${nameOf(turn)}!`, 'error')
      setSelected(null)
      passTurn()
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, timeLeft, result, grid, isCpuTurn, checking])

  // CPU opponent
  useEffect(() => {
    if (!isCpuTurn || result || !grid) return
    let cancelled = false
    ;(async () => {
      await wait(800)
      if (cancelled) return
      const idx = chooseCpuCell(boardRef.current)
      setCpuTarget(idx)
      await wait(900)
      if (cancelled) return
      const row = grid.rows[Math.floor(idx / 3)]
      const col = grid.cols[idx % 3]
      let player = null
      if (Math.random() < CPU_SKILL[cpuLevel]) {
        const used = boardRef.current.filter(Boolean).map((c) => c.player.id)
        try {
          ;({ player } = await api.cpuAnswer(row.id, col.id, used))
        } catch {
          /* treat as a miss */
        }
      }
      if (cancelled) return
      setCpuTarget(null)
      if (player) {
        toast(`🤖 AI Scout picks ${player.name}`, 'info')
        place(idx, player, 'O')
      } else {
        toast(`🤖 AI Scout drew a blank on ${row.name} × ${col.name}`, 'success')
        shake(idx)
        passTurn()
      }
    })()
    return () => {
      cancelled = true
      setCpuTarget(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCpuTurn, result, grid])

  const nextRound = () => {
    const nr = round + 1
    setBoard(emptyBoard())
    setResult(null)
    setShowResult(false)
    setSolutions(null)
    setSelected(null)
    setRound(nr)
    setTurn(nr % 2 === 1 ? 'X' : 'O') // alternate who kicks off
    setTimeLeft(timer)
    loadGrid()
  }

  const reveal = async () => {
    setShowResult(false)
    if (!grid) return
    try {
      setSolutions(await api.solutions(grid.id))
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const skipTurn = () => {
    toast(`⏭ ${nameOf(turn)} skipped`, 'info')
    passTurn()
  }

  // ------------- Render -------------
  if (error)
    return (
      <div className="mx-auto max-w-md rounded-3xl glass p-8 text-center">
        <div className="text-5xl">🚫</div>
        <h2 className="mt-3 font-display text-3xl">Can't reach the stadium</h2>
        <p className="mt-2 text-sm text-white/60">{error}. Make sure the API server is running on port 4000.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={loadGrid} className="btn-primary">Retry</button>
          <button onClick={onExit} className="btn-ghost">Menu</button>
        </div>
      </div>
    )

  if (!grid)
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <motion.div
          className="text-6xl"
          animate={{ y: [0, -40, 0], rotate: [0, 360] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        >
          ⚽
        </motion.div>
        <motion.div className="h-2 w-12 rounded-full bg-black/40" animate={{ scaleX: [1, 0.5, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
        <p className="font-display text-2xl tracking-widest text-white/60">DRAWING THE GRID…</p>
      </div>
    )

  const selRow = selected != null ? grid.rows[Math.floor(selected / 3)] : null
  const selCol = selected != null ? grid.cols[selected % 3] : null
  const hRow = hovered != null ? Math.floor(hovered / 3) : -1
  const hCol = hovered != null ? hovered % 3 : -1
  const boardLocked = !!result || isCpuTurn || checking

  return (
    <div className="flex flex-col items-center">
      <Toasts toasts={toasts} />

      {/* Scoreboard */}
      <div className="mb-6 grid w-full max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-3">
        <PlayerCard mark="X" name={names[0]} score={scores.X} active={turn === 'X' && !result} timer={timer} timeLeft={timeLeft} />
        <div className="text-center">
          <div className="font-display text-sm tracking-[0.3em] text-white/40">ROUND</div>
          <motion.div key={round} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-4xl">
            {round}
          </motion.div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">{difficulty}</div>
        </div>
        <PlayerCard mark="O" name={names[1]} score={scores.O} active={turn === 'O' && !result} timer={timer} timeLeft={timeLeft} thinking={isCpuTurn && !result} alignRight />
      </div>

      {/* Board */}
      <div
        className="grid gap-2 sm:gap-3"
        style={{ '--cell': 'min(21vw, 132px)', gridTemplateColumns: 'repeat(4, var(--cell))', gridTemplateRows: 'repeat(4, var(--cell))' }}
      >
        {/* Corner: whose turn */}
        <div className="grid place-items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={result ? 'end' : turn}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              {result ? (
                <div className="text-4xl">🏁</div>
              ) : (
                <>
                  <div className={`font-display text-5xl leading-none sm:text-6xl ${turn === 'X' ? 'text-x' : 'text-o'}`}>{turn}</div>
                  <div className="text-[9px] font-semibold uppercase tracking-widest text-white/50 sm:text-[10px]">to play</div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {grid.cols.map((c, i) => (
          <CategoryBadge key={c.id} category={c} index={i} highlight={hCol === i} />
        ))}

        {grid.rows.map((r, i) => (
          <div key={r.id} style={{ gridColumn: 1, gridRow: i + 2 }}>
            <CategoryBadge category={r} index={i + 3} highlight={hRow === i} />
          </div>
        ))}

        <div className="relative grid grid-cols-3 gap-2 sm:gap-3" style={{ gridColumn: '2 / span 3', gridRow: '2 / span 3' }}>
          {board.map((value, i) => (
            <div key={`${grid.id}-${i}`} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <Cell
                index={i}
                value={value}
                turn={turn}
                disabled={boardLocked}
                shake={shakeIdx === i}
                isWinning={result?.line?.includes(i)}
                cpuTarget={cpuTarget === i}
                answerCount={grid.answerCounts[Math.floor(i / 3)][i % 3]}
                solutions={solutions?.[Math.floor(i / 3)][i % 3]}
                onClick={() => setSelected(i)}
              />
            </div>
          ))}
          {result?.line && <WinLine line={result.line} mark={result.winner} />}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {result && !showResult ? (
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={nextRound} className="btn-primary font-display text-xl tracking-widest">
            NEXT ROUND →
          </motion.button>
        ) : (
          <button onClick={skipTurn} disabled={boardLocked} className="btn-ghost text-sm">
            ⏭ Skip turn
          </button>
        )}
        {!result && (
          <button onClick={() => finishRound(board, { winner: 'draw', line: null })} disabled={boardLocked} className="btn-ghost text-sm">
            🏳 Call it a draw
          </button>
        )}
        <button onClick={onExit} className="btn-ghost text-sm">
          🏠 Menu
        </button>
      </div>

      <SearchModal
        open={selected != null}
        row={selRow}
        col={selCol}
        turn={turn}
        playerName={nameOf(turn)}
        usedIds={usedIds}
        checking={checking}
        timeLeft={timer ? timeLeft : null}
        onPick={handlePick}
        onClose={() => !checking && setSelected(null)}
      />

      <ResultModal open={showResult} result={result} names={names} scores={scores} onNext={nextRound} onReveal={reveal} onExit={onExit} />
    </div>
  )
}

function PlayerCard({ mark, name, score, active, timer, timeLeft, thinking, alignRight }) {
  const isX = mark === 'X'
  const pct = timer ? Math.max(0, timeLeft / timer) : 1
  return (
    <motion.div
      animate={{ scale: active ? 1.03 : 0.97, opacity: active ? 1 : 0.55 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`relative overflow-hidden rounded-2xl border px-4 py-3 ${
        isX ? 'border-x/40 bg-x/10' : 'border-o/40 bg-o/10'
      } ${active ? (isX ? 'shadow-lg shadow-x/25' : 'shadow-lg shadow-o/25') : ''}`}
    >
      <div className={`flex items-center gap-3 ${alignRight ? 'flex-row-reverse text-right' : ''}`}>
        <span className={`font-display text-4xl leading-none ${isX ? 'text-x' : 'text-o'}`}>{mark}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{name}</div>
          <div className="h-4 text-[11px] text-white/50">
            {thinking ? (
              <span className="inline-flex gap-0.5">
                thinking
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}>
                    .
                  </motion.span>
                ))}
              </span>
            ) : active ? (
              timer ? `${timeLeft}s left` : 'your turn'
            ) : (
              ''
            )}
          </div>
        </div>
        <motion.span key={score} initial={{ scale: 1.8, color: '#fde68a' }} animate={{ scale: 1, color: '#ffffff' }} className="font-display text-4xl">
          {score}
        </motion.span>
      </div>
      {active && timer > 0 && !thinking && (
        <motion.div
          className={`absolute bottom-0 left-0 h-1 ${pct < 0.25 ? 'bg-rose-400' : isX ? 'bg-x' : 'bg-o'}`}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      )}
    </motion.div>
  )
}
