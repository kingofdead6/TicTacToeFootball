import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api.js'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const [board, setBoard] = useState(null)
  const [matches, setMatches] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([api.leaderboard(), api.matches(), api.stats()])
      .then(([l, m, s]) => {
        setBoard(l)
        setMatches(m)
        setStats(s)
      })
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="text-center text-rose-300">Could not load leaderboard: {error}</p>
  if (!board) return <p className="py-20 text-center text-white/50">Loading…</p>

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <h1 className="font-display text-5xl tracking-wide">Leaderboard</h1>
        <p className="mb-5 text-sm text-white/50">3 points for a win, 1 for a draw — stored by the API</p>

        {board.length === 0 ? (
          <Empty text="No matches played yet. Go claim the top spot!" />
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            <div className="grid grid-cols-[3rem_1fr_repeat(4,3rem)] gap-2 border-b border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              <span>#</span>
              <span>Player</span>
              <span className="text-center">P</span>
              <span className="text-center">W</span>
              <span className="text-center">D</span>
              <span className="text-center">Pts</span>
            </div>
            {board.map((r, i) => (
              <motion.div
                key={r.name}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`grid grid-cols-[3rem_1fr_repeat(4,3rem)] items-center gap-2 px-4 py-3 ${i % 2 ? 'bg-white/[0.02]' : ''}`}
              >
                <span className="text-xl">{MEDALS[i] ?? <span className="text-sm text-white/40">{i + 1}</span>}</span>
                <span className="truncate font-semibold">{r.name}</span>
                <span className="text-center text-white/60">{r.played}</span>
                <span className="text-center text-emerald-300">{r.wins}</span>
                <span className="text-center text-white/60">{r.draws}</span>
                <span className="text-center font-display text-2xl">{r.points}</span>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Rounds played" value={stats.totalMatches} />
            <Stat label="Draws" value={stats.draws} />
          </div>
        )}

        {stats?.mostPicked?.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 font-display text-2xl tracking-wide">Most picked players</h3>
            {stats.mostPicked.map((p, i) => (
              <div key={p.name} className="mb-2">
                <div className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-white/50">{p.count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-linear-to-r from-emerald-400 to-lime-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.count / stats.mostPicked[0].count) * 100}%` }}
                    transition={{ delay: 0.2 + i * 0.05, duration: 0.6 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 font-display text-2xl tracking-wide">Recent rounds</h3>
          {matches.length === 0 && <p className="text-sm text-white/40">Nothing yet.</p>}
          <ul className="space-y-2">
            {matches.map((m, i) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 text-sm"
              >
                <span className={m.winner === 'X' ? 'font-bold text-x' : 'text-white/70'}>{m.players[0].name}</span>
                <span className="text-white/30">vs</span>
                <span className={m.winner === 'O' ? 'font-bold text-o' : 'text-white/70'}>{m.players[1].name}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-white/40">
                  {m.winner ? '' : 'draw · '}
                  {m.difficulty} · {new Date(m.playedAt).toLocaleDateString()}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-2xl p-4 text-center">
      <div className="font-display text-5xl text-emerald-300">{value}</div>
      <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
    </motion.div>
  )
}

function Empty({ text }) {
  return (
    <div className="glass rounded-2xl p-10 text-center">
      <motion.div className="text-5xl" animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}>
        🏆
      </motion.div>
      <p className="mt-3 text-white/60">{text}</p>
    </div>
  )
}
