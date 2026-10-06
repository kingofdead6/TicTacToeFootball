import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../api.js'
import { useProfile } from '../profile.jsx'
import { SectionTitle } from '../components/Brand.jsx'
import { brand } from '../assets/brand/index.js'
import Portal from '../components/Portal.jsx'

const PODIUM = [
  { place: 2, height: 'h-28', color: 'from-slate-200/30 to-slate-400/5', medal: '🥈' },
  { place: 1, height: 'h-40', color: 'from-orange-200/40 to-orange-500/5', medal: '🥇' },
  { place: 3, height: 'h-20', color: 'from-orange-300/30 to-orange-600/5', medal: '🥉' },
]

export default function Leaderboard() {
  const { profile, dbAvailable, openModal } = useProfile()
  const [board, setBoard] = useState(null)
  const [matches, setMatches] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    Promise.all([api.leaderboard(), api.matches('online'), api.stats()])
      .then(([l, m, s]) => {
        setBoard(l)
        setMatches(m)
        setStats(s)
      })
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="text-center text-rose-300">Could not load leaderboard: {error}</p>
  if (!board) return <Loading />

  const rows = board.results
  const top3 = rows.slice(0, 3)

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <SectionTitle align="left" sub="Elo ratings from ranked online matches between player cards">
            Leaderboard
          </SectionTitle>
          {profile?.rank && (
            <div className="glass rounded-2xl px-4 py-2 text-sm">
              Your rank <span className="font-display text-2xl text-orange-200">#{profile.rank}</span>
            </div>
          )}
        </div>

        {!board.db ? (
          <Empty icon="🗄️" text="The leaderboard switches on once the database is connected." />
        ) : rows.length === 0 ? (
          <Empty
            icon="🏆"
            text="No ranked matches yet. Create a player card, invite a friend, and claim the top spot!"
            action={!profile && dbAvailable ? { label: '✨ Create my card', onClick: openModal } : null}
          />
        ) : (
          <>
            {/* Podium */}
            <div className="mb-6 grid grid-cols-3 items-end gap-3">
              {PODIUM.map(({ place, height, color, medal }) => {
                const p = top3[place - 1]
                return (
                  <motion.div
                    key={place}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 * (3 - place), type: 'spring', stiffness: 160, damping: 16 }}
                    className="flex flex-col items-center"
                  >
                    {p ? (
                      <button onClick={() => setSelected(p.username)} className="mb-2 cursor-pointer text-center">
                        <motion.div
                          animate={place === 1 ? { y: [0, -6, 0] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={place === 1 ? 'text-6xl' : 'text-5xl'}
                        >
                          {p.avatar}
                        </motion.div>
                        <div className="mt-1 max-w-28 truncate font-bold">{p.username}</div>
                        <div className="font-display text-2xl text-orange-200">{p.rating}</div>
                      </button>
                    ) : (
                      <div className="mb-2 text-4xl opacity-20">❔</div>
                    )}
                    <div className={`flex w-full ${height} items-start justify-center rounded-t-2xl border border-white/10 bg-linear-to-b ${color} pt-2 text-3xl`}>
                      {medal}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Table */}
            <div className="glass overflow-hidden rounded-2xl">
              <div className="grid grid-cols-[2.5rem_1fr_4rem_5.5rem_3rem] gap-2 border-b border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/40 sm:grid-cols-[2.5rem_1fr_4rem_6rem_4rem_3.5rem]">
                <span>#</span>
                <span>Player</span>
                <span className="text-right">Rating</span>
                <span className="text-center">W-D-L</span>
                <span className="hidden text-center sm:block">Win %</span>
                <span className="text-center">🔥</span>
              </div>
              {rows.map((r, i) => {
                const mine = profile?.id === r.id
                return (
                  <motion.button
                    key={r.id}
                    onClick={() => setSelected(r.username)}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.6) }}
                    className={`grid w-full cursor-pointer grid-cols-[2.5rem_1fr_4rem_5.5rem_3rem] items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-white/5 sm:grid-cols-[2.5rem_1fr_4rem_6rem_4rem_3.5rem] ${
                      mine ? 'bg-orange-400/10 ring-1 ring-inset ring-orange-300/40' : i % 2 ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <span className={`font-display text-xl ${i < 3 ? 'text-orange-200' : 'text-white/40'}`}>{r.rank}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-xl">{r.avatar}</span>
                      <span className="truncate font-semibold">
                        {r.username}
                        {mine && <span className="ml-1 text-[10px] text-orange-300">YOU</span>}
                      </span>
                    </span>
                    <span className="text-right font-display text-2xl">{r.rating}</span>
                    <span className="text-center text-sm">
                      <span className="text-orange-300">{r.stats.wins}</span>-<span className="text-white/50">{r.stats.draws}</span>-
                      <span className="text-rose-300">{r.stats.losses}</span>
                    </span>
                    <span className="hidden text-center text-sm text-white/70 sm:block">{r.stats.winRate}%</span>
                    <span className="text-center text-sm">{r.streak > 0 ? `${r.streak}` : '–'}</span>
                  </motion.button>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className="space-y-6">
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Players with cards" value={stats.profiles ?? 0} />
            <Stat label="Online matches" value={stats.onlineMatches ?? 0} />
            <Stat label="Online now" value={stats.live?.online ?? 0} live />
            <Stat label="Live matches" value={stats.live?.playing ?? 0} live />
          </div>
        )}

        {stats?.mostPicked?.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 font-display text-2xl tracking-wide">Most picked footballers</h3>
            {stats.mostPicked.map((p, i) => (
              <div key={p.name} className="mb-2">
                <div className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-white/50">
                    {p.count} · {Math.round((p.correct / p.count) * 100)}% ✓
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-linear-to-r from-orange-400 to-orange-300"
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
          <h3 className="mb-3 font-display text-2xl tracking-wide">Recent online matches</h3>
          {matches.length === 0 && <p className="text-sm text-white/40">Nothing yet.</p>}
          <ul className="space-y-2">
            {matches.map((m, i) => (
              <MatchRow key={m.id} m={m} i={i} />
            ))}
          </ul>
        </div>
      </section>

      <ProfileDrawer username={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function MatchRow({ m, i }) {
  const [x, o] = m.players
  const delta = (p) => (p.ratingAfter != null && p.ratingBefore != null ? p.ratingAfter - p.ratingBefore : null)
  const Side = ({ p, won, right }) => (
    <span className={`flex min-w-0 items-center gap-1 ${right ? 'flex-row-reverse' : ''}`}>
      <span>{p.avatar}</span>
      <span className={`truncate ${won ? 'font-bold text-white' : 'text-white/60'}`}>{p.name}</span>
      {delta(p) != null && <span className={`text-[10px] ${delta(p) >= 0 ? 'text-orange-300' : 'text-rose-300'}`}>{delta(p) >= 0 ? `+${delta(p)}` : delta(p)}</span>}
    </span>
  )
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-black/20 px-3 py-2 text-sm"
    >
      <Side p={x} won={m.winner === 'X'} />
      <span className="text-center font-display text-lg">
        {x.roundsWon}–{o.roundsWon}
        {m.endReason === 'forfeit' && <span className="block text-[9px] font-sans text-white/40">forfeit</span>}
      </span>
      <Side p={o} won={m.winner === 'O'} right />
    </motion.li>
  )
}

function ProfileDrawer({ username, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    setData(null)
    if (username) api.profile(username).then(setData).catch(() => setData({ error: true }))
  }, [username])

  return (
    <Portal>
    <AnimatePresence>
      {username && (
        <motion.div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-sm overflow-y-auto border-l border-white/10 bg-pitch-900 p-6"
          >
            <button onClick={onClose} className="float-right cursor-pointer text-white/50 hover:text-white">
              ✕
            </button>
            {!data ? (
              <p className="mt-20 text-center text-white/40">Loading…</p>
            ) : data.error ? (
              <p className="mt-20 text-center text-rose-300">Could not load profile</p>
            ) : (
              <>
                <div className="mt-6 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-7xl">
                    {data.avatar}
                  </motion.div>
                  <h2 className="mt-2 font-display text-4xl">{data.username}</h2>
                  <div className="font-display text-3xl text-orange-200">{data.rating}</div>
                  <div className="text-xs text-white/40">peak {data.peakRating}</div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                  <Mini label="Wins" value={data.stats.wins} />
                  <Mini label="Draws" value={data.stats.draws} />
                  <Mini label="Losses" value={data.stats.losses} />
                  <Mini label="Win %" value={`${data.stats.winRate}%`} />
                  <Mini label="Accuracy" value={`${data.stats.accuracy}%`} />
                  <Mini label="Best streak" value={data.bestStreak} />
                </div>
                <h3 className="mb-2 mt-6 font-display text-xl tracking-wide">Recent matches</h3>
                <ul className="space-y-2">
                  {data.recentMatches.length === 0 && <li className="text-sm text-white/40">No matches yet</li>}
                  {data.recentMatches.map((m, i) => (
                    <MatchRow key={m.id} m={m} i={i} />
                  ))}
                </ul>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
    </Portal>
  )
}

function Mini({ label, value }) {
  return (
    <div className="rounded-xl bg-white/5 p-2">
      <div className="font-display text-2xl">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
    </div>
  )
}

function Stat({ label, value, live }) {
  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass relative rounded-2xl p-4 text-center">
      {live && <span className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-rose-400" />}
      <div className="font-display text-4xl text-orange-300">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-white/50">{label}</div>
    </motion.div>
  )
}

function Empty({ icon, text, action }) {
  return (
    <div className="card-paper relative overflow-hidden p-10 text-center shadow-xl shadow-black/30">
      <img src={brand.brushSplit2} alt="" className="pointer-events-none absolute -left-10 -bottom-8 w-56 rotate-[24.89deg] opacity-40" />
      <motion.img
        src={brand.stickers.cat}
        alt={icon}
        className="relative mx-auto w-40 drop-shadow-lg"
        animate={{ rotate: [0, 6, -6, 0], y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <p className="relative mt-3 font-medium text-blue-500">{text}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-5">
          {action.label}
        </button>
      )}
    </div>
  )
}

function Loading() {
  return (
    <div className="flex justify-center py-24">
      <motion.div className="text-5xl" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        ⚽
      </motion.div>
    </div>
  )
}
