import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import GridBoard from '../GridBoard.jsx'
import SearchModal from '../SearchModal.jsx'
import MatchFeed from './MatchFeed.jsx'
import { StatTile } from '../Brand.jsx'
import Portal from '../Portal.jsx'

const other = (m) => (m === 'X' ? 'O' : 'X')

function celebrate(mark, big) {
  const colors = mark === 'X' ? ['#38bdf8', '#e0f2fe', '#fbbf24'] : ['#fb7185', '#ffe4e6', '#fbbf24']
  confetti({ particleCount: big ? 180 : 90, spread: big ? 120 : 80, origin: { y: 0.55 }, colors })
  if (big) {
    setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 250)
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 400)
  }
}

export default function OnlineMatch({ room, clockOffset, feed, focus, reactions, lastEvent, actions, onNavigate }) {
  const [selected, setSelected] = useState(null)
  const [checking, setChecking] = useState(false)
  const [shakeIdx, setShakeIdx] = useState(null)
  const [now, setNow] = useState(Date.now())

  const me = room.you
  const opp = other(me)
  const myTurn = room.status === 'playing' && room.turn === me
  const serverNow = now + clockOffset
  const timeLeft = room.turnEndsAt ? Math.max(0, Math.ceil((room.turnEndsAt - serverNow) / 1000)) : null
  const nextIn = room.nextRoundAt ? Math.max(0, Math.ceil((room.nextRoundAt - serverNow) / 1000)) : null
  const needed = Math.ceil(room.settings.bestOf / 2)
  const usedIds = room.board.filter(Boolean).map((c) => c.player.id)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  // Close the search when the turn is gone (timeout, round end…)
  useEffect(() => {
    if (!myTurn) setSelected(null)
  }, [myTurn])

  useEffect(() => {
    if (!lastEvent) return
    if (lastEvent.type === 'wrong') {
      setShakeIdx(lastEvent.cell)
      const t = setTimeout(() => setShakeIdx(null), 550)
      return () => clearTimeout(t)
    }
    if (lastEvent.type === 'round_over' && lastEvent.winner) celebrate(lastEvent.winner, lastEvent.winner === me)
    if (lastEvent.type === 'match_over' && lastEvent.winner === me) celebrate(me, true)
  }, [lastEvent, me])

  const openCell = (i) => {
    if (!myTurn) return
    setSelected(i)
    actions.focus(i)
  }
  const closeCell = () => {
    if (checking) return
    setSelected(null)
    actions.focus(null)
  }
  const pick = async (p) => {
    if (selected == null) return
    setChecking(true)
    const res = await actions.guess(selected, p.id)
    setChecking(false)
    if (res.ok) setSelected(null)
  }

  const grid = room.grid
  const selRow = selected != null ? grid.rows[Math.floor(selected / 3)] : null
  const selCol = selected != null ? grid.cols[selected % 3] : null
  const rr = room.roundResult

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col items-center">
        {/* Scoreboard */}
        <div className="mb-4 grid w-full max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-3">
          <SeatPanel room={room} mark="X" needed={needed} timeLeft={timeLeft} />
          <div className="flex flex-col items-center">
            <StatTile label="Round" value={room.round} />
            <div className="mt-1 font-display text-sm font-extrabold uppercase tracking-widest text-blue-100">
              {room.settings.bestOf === 1 ? 'single' : `best of ${room.settings.bestOf}`}
            </div>
            {room.ranked && <div className="mt-1 rounded-full bg-orange-500 px-2.5 py-0.5 font-display text-sm font-black text-white">RANKED</div>}
          </div>
          <SeatPanel room={room} mark="O" needed={needed} timeLeft={timeLeft} alignRight />
        </div>

        {/* Status banner */}
        <div className="mb-4 h-12">
          <AnimatePresence mode="wait">
            {room.status === 'playing' && (
              <motion.div
                key={myTurn ? 'mine' : 'theirs'}
                initial={{ y: -10, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 10, opacity: 0 }}
                className={`rounded-full px-5 py-2.5 text-sm font-bold ${
                  myTurn ? `${me === 'X' ? 'bg-x/20 text-x ring-x/50' : 'bg-o/20 text-o ring-o/50'} ring-2` : 'bg-white/5 text-white/60'
                }`}
              >
                {myTurn ? (
                  <motion.span animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                    🎯 Your turn: pick a square {timeLeft != null && `· ${timeLeft}s`}
                  </motion.span>
                ) : (
                  <span>
                    {room.seats[opp]?.avatar} {room.seats[opp]?.name} is {focus ? 'looking at a square' : 'thinking'}
                    <Dots />
                  </span>
                )}
              </motion.div>
            )}
            {room.status === 'round_over' && rr && (
              <motion.div
                key="round-over"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-3 rounded-full bg-white/10 py-1.5 pl-5 pr-1.5 text-sm font-bold"
              >
                <span>
                  {rr.winner ? (rr.winner === me ? '🎉 You won the round!' : `😤 ${room.seats[rr.winner]?.name} took the round`) : '🤝 Round drawn'}
                </span>
                <span className="text-white/50">Next in {nextIn}s</span>
                <button
                  onClick={actions.ready}
                  disabled={room.readyNext.includes(me)}
                  className="btn-primary px-4 py-1.5 text-xs disabled:opacity-60"
                >
                  {room.readyNext.includes(me) ? (room.readyNext.includes(opp) ? 'Starting…' : 'Waiting…') : room.readyNext.includes(opp) ? 'Opponent ready: Go!' : 'Ready'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Board with reactions overlay */}
        <div className="relative">
          <GridBoard
            grid={grid}
            board={room.board}
            turn={me}
            disabled={!myTurn || checking}
            onCellClick={openCell}
            shakeIdx={shakeIdx}
            winLine={rr?.line}
            winMark={rr?.winner}
            solutions={room.solutions}
            focus={!myTurn ? focus : null}
            corner={<Corner room={room} myTurn={myTurn} timeLeft={timeLeft} />}
          />
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <AnimatePresence>
              {reactions.map((r) => (
                <motion.div
                  key={r.id}
                  className={`absolute bottom-0 text-5xl drop-shadow-lg ${r.emoji === 'GG' ? 'font-display text-orange-200' : ''}`}
                  style={{ left: `${r.x}%` }}
                  initial={{ y: 40, opacity: 0, scale: 0.4 }}
                  animate={{ y: -380, opacity: [0, 1, 1, 0], scale: [0.4, 1.3, 1, 0.9], rotate: [0, -15, 15, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.4, ease: 'easeOut' }}
                >
                  {r.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={actions.skip} disabled={!myTurn || checking} className="btn-ghost text-sm">
            ⏭ Skip turn
          </button>
          <button
            onClick={() => {
              if (room.status === 'finished' || confirm('Leave now? An unfinished match counts as a forfeit.')) actions.leave()
            }}
            className="btn-ghost text-sm"
          >
            🚪 Leave
          </button>
        </div>
      </div>

      <MatchFeed room={room} feed={feed} onSend={actions.chat} onReact={actions.react} />

      <SearchModal
        open={selected != null && myTurn}
        row={selRow}
        col={selCol}
        turn={me}
        playerName={room.seats[me]?.name}
        usedIds={usedIds}
        checking={checking}
        timeLeft={timeLeft}
        onPick={pick}
        onClose={closeCell}
      />

      <MatchOverModal room={room} actions={actions} onNavigate={onNavigate} />
    </div>
  )
}

function Dots() {
  return (
    <span className="inline-flex">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}>
          .
        </motion.span>
      ))}
    </span>
  )
}

function Corner({ room, myTurn, timeLeft }) {
  const t = room.turn
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={room.status === 'playing' ? t : room.status}
        initial={{ rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        exit={{ rotateY: -90, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="relative grid place-items-center text-center"
      >
        {room.status === 'playing' ? (
          <>
            {timeLeft != null && <TimerRing seconds={timeLeft} total={room.settings.timer} mark={t} />}
            <div className={`font-display text-5xl leading-none ${t === 'X' ? 'text-x' : 'text-o'}`}>{t}</div>
            <div className="text-[9px] font-semibold uppercase tracking-widest text-white/50">{myTurn ? 'you' : 'them'}</div>
          </>
        ) : (
          <div className="text-4xl">🏁</div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

function TimerRing({ seconds, total, mark }) {
  const r = 46
  const c = 2 * Math.PI * r
  const pct = total ? seconds / total : 1
  const color = pct < 0.25 ? '#fb7185' : mark === 'X' ? '#38bdf8' : '#fb7185'
  return (
    <svg className="absolute -inset-3 h-[calc(100%+24px)] w-[calc(100%+24px)] -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="4" />
      <motion.circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        animate={{ strokeDashoffset: c * (1 - pct) }}
        transition={{ duration: 0.3, ease: 'linear' }}
      />
    </svg>
  )
}

function SeatPanel({ room, mark, needed, timeLeft, alignRight }) {
  const seat = room.seats[mark]
  const isX = mark === 'X'
  const active = room.status === 'playing' && room.turn === mark
  const pct = room.settings.timer && timeLeft != null ? timeLeft / room.settings.timer : 1
  if (!seat) return <div />
  return (
    <motion.div
      animate={{ scale: active ? 1.03 : 0.97, opacity: active || room.status !== 'playing' ? 1 : 0.6 }}
      className={`relative overflow-hidden rounded-[18px] px-3 py-3 ring-2 sm:px-4 ${isX ? 'bg-blue-500 ring-blue-300/50' : 'bg-orange-500 ring-orange-200/60'} ${
        active ? (isX ? 'shadow-xl shadow-blue-500/40' : 'shadow-xl shadow-orange-500/40') : ''
      }`}
    >
      <div className={`flex items-center gap-2 sm:gap-3 ${alignRight ? 'flex-row-reverse text-right' : ''}`}>
        <div className="relative">
          <span className="text-2xl sm:text-4xl">{seat.avatar}</span>
          <span
            className={`absolute -bottom-0.5 ${alignRight ? '-left-0.5' : '-right-0.5'} h-3 w-3 rounded-full ring-2 ring-white ${seat.connected ? 'bg-green-400' : 'animate-pulse bg-rose-500'}`}
            title={seat.connected ? 'Online' : 'Disconnected'}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-xl font-black leading-none">
            {seat.name}
            {room.you === mark && <span className="ml-1 font-sans text-[10px] font-semibold text-white/70">(you)</span>}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-white/80">
            <span className="font-display text-base font-black">{mark}</span>
            {seat.rating ? ` · ${seat.rating}` : seat.registered ? '' : ' · guest'}
          </div>
          <div className={`mt-1 flex gap-1 ${alignRight ? 'justify-end' : ''}`}>
            {Array.from({ length: needed }).map((_, i) => (
              <motion.span
                key={i}
                animate={{ scale: i < room.scores[mark] ? [1.6, 1] : 1 }}
                className={`h-2 w-4 rounded-full ${i < room.scores[mark] ? 'bg-white' : 'bg-white/25'}`}
              />
            ))}
          </div>
        </div>
        <motion.span
          key={room.scores[mark]}
          initial={{ scale: 1.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white font-display text-2xl font-black sm:h-12 sm:w-12 sm:text-3xl ${isX ? 'text-blue-500' : 'text-orange-500'}`}
        >
          {room.scores[mark]}
        </motion.span>
      </div>
      {active && room.settings.timer > 0 && (
        <motion.div
          className={`absolute bottom-0 left-0 h-1.5 ${pct < 0.25 ? 'bg-rose-300' : 'bg-white/80'}`}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.3, ease: 'linear' }}
        />
      )}
    </motion.div>
  )
}

function AnimatedNumber({ from, to }) {
  const ref = useRef(null)
  useEffect(() => {
    const controls = animate(from, to, {
      duration: 1.4,
      delay: 0.5,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v)
      },
    })
    return () => controls.stop()
  }, [from, to])
  return <span ref={ref}>{from}</span>
}

function MatchOverModal({ room, actions, onNavigate }) {
  const [dismissed, setDismissed] = useState(false)
  const result = room.matchResult
  const open = room.status === 'finished' && !!result && !dismissed
  useEffect(() => {
    if (room.status !== 'finished') setDismissed(false)
  }, [room.status])
  if (!result) return null

  const me = room.you
  const opp = other(me)
  const outcome = result.winner === null ? 'draw' : result.winner === me ? 'win' : 'loss'
  const title = { win: 'VICTORY', loss: 'DEFEAT', draw: 'DRAW' }[outcome]
  const color = { win: 'text-orange-300', loss: 'text-rose-300', draw: 'text-orange-300' }[outcome]
  const change = result.ratingChange?.[me]
  const oppWantsRematch = room.rematch.includes(opp)
  const iWantRematch = room.rematch.includes(me)
  const oppHere = room.seats[opp]?.connected

  return (
    <Portal>
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            initial={{ scale: 0.5, rotate: -6, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.8 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-pitch-900/95 p-8 text-center shadow-2xl"
          >
            <motion.div
              className={`absolute inset-x-0 -top-24 mx-auto h-56 w-56 rounded-full blur-3xl ${outcome === 'win' ? 'bg-orange-300/25' : outcome === 'loss' ? 'bg-rose-400/20' : 'bg-orange-300/20'}`}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div className="relative text-7xl" initial={{ y: -40, scale: 0 }} animate={{ y: 0, scale: 1 }} transition={{ delay: 1, type: 'spring' }}>
              {outcome === 'win' ? '🏆' : outcome === 'loss' ? '💔' : '🤝'}
            </motion.div>
            <h2 className={`relative mt-2 font-display text-7xl tracking-wide ${color}`}>{title}</h2>
            {result.reason === 'forfeit' && <p className="relative text-sm text-white/60">{outcome === 'win' ? 'Your opponent left the match' : 'Match forfeited'}</p>}

            <div className="relative mt-5 flex items-center justify-center gap-6">
              {['X', 'O'].map((m, i) => (
                <div key={m} className="flex items-center gap-6">
                  {i === 1 && <span className="font-display text-3xl text-white/30">–</span>}
                  <div className="text-center">
                    <div className="text-3xl">{room.seats[m]?.avatar}</div>
                    <div className={`font-display text-5xl ${m === 'X' ? 'text-x' : 'text-o'}`}>{room.scores[m]}</div>
                    <div className="max-w-24 truncate text-xs text-white/50">{room.seats[m]?.name}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative mt-5 min-h-16">
              {result.saving ? (
                <p className="text-sm text-white/40">Updating ratings…</p>
              ) : change && room.ranked ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 rounded-2xl bg-black/30 px-5 py-3">
                  <span className="text-xs uppercase tracking-widest text-white/50">Rating</span>
                  <span className="font-display text-4xl">
                    <AnimatedNumber from={change.before} to={change.after} />
                  </span>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.9, type: 'spring' }}
                    className={`rounded-full px-2 py-0.5 text-sm font-bold ${change.delta > 0 ? 'bg-orange-400/20 text-orange-200' : change.delta < 0 ? 'bg-rose-400/20 text-rose-200' : 'bg-white/10'}`}
                  >
                    {change.delta > 0 ? '+' : ''}
                    {change.delta}
                  </motion.span>
                </motion.div>
              ) : (
                <p className="text-xs text-white/40">{room.seats[me]?.registered ? 'Unranked: your opponent played as a guest' : 'Unranked match: create a player card to climb the leaderboard'}</p>
              )}
            </div>

            <div className="relative mt-6 grid gap-2">
              <button onClick={actions.rematch} disabled={iWantRematch || !oppHere} className="btn-primary font-display text-xl tracking-widest">
                {!oppHere ? 'OPPONENT LEFT' : iWantRematch ? 'WAITING FOR OPPONENT…' : oppWantsRematch ? '🔁 ACCEPT REMATCH' : '🔁 REMATCH'}
              </button>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setDismissed(true)} className="btn-ghost px-2 text-xs">
                  👀 Answers
                </button>
                <button
                  onClick={async () => {
                    await actions.leave()
                    onNavigate('leaderboard')
                  }}
                  className="btn-ghost px-2 text-xs"
                >
                  🏆 Ranks
                </button>
                <button onClick={actions.leave} className="btn-ghost px-2 text-xs">
                  🚪 Lobby
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      {room.status === 'finished' && dismissed && (
        <motion.button
          key="reopen"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => setDismissed(false)}
          className="btn-primary fixed bottom-6 left-1/2 z-40 -translate-x-1/2 shadow-2xl"
        >
          🏁 Match result
        </motion.button>
      )}
    </AnimatePresence>
    </Portal>
  )
}
