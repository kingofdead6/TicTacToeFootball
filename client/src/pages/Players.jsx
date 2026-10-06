import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../api.js'
import { ClubCrest, Flag } from '../components/CategoryBadge.jsx'
import { SectionTitle } from '../components/Brand.jsx'

const AWARD_ICON = { ballon: '⚽', trophy: '🏆', star: '⭐' }
const POSITIONS = ['ALL', 'GK', 'DF', 'MF', 'FW']

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Players() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [pos, setPos] = useState('ALL')
  const [nation, setNation] = useState('ALL')
  const [sort, setSort] = useState('name')

  useEffect(() => {
    api.players().then((r) => setData(r.results)).catch((e) => setError(e.message))
  }, [])

  const nations = useMemo(() => (data ? [...new Set(data.map((p) => p.nationality))].sort() : []), [data])

  const filtered = useMemo(() => {
    if (!data) return []
    const nq = norm(q)
    const list = data.filter(
      (p) =>
        (pos === 'ALL' || p.position === pos) &&
        (nation === 'ALL' || p.nationality === nation) &&
        (!nq || norm(p.name).includes(nq) || p.clubs.some((c) => norm(c.name).includes(nq))),
    )
    return sort === 'popular' ? [...list].sort((a, b) => (b.stats?.picked ?? 0) - (a.stats?.picked ?? 0)) : list
  }, [data, q, pos, nation, sort])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle align="left" sub="Every footballer in the game, with their clubs and trophies">
          Footballers
        </SectionTitle>
        {data && (
          <div className="flex items-center gap-2 font-display text-xl font-extrabold text-blue-100">
            <span className="grid h-14 min-w-14 place-items-center rounded-[18px] bg-orange-500 px-2 text-3xl font-black text-white">{filtered.length}</span>/ {data.length}
          </div>
        )}
      </div>

      <div className="glass mb-6 flex flex-col gap-3 rounded-2xl p-3 md:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by player or club…"
          className="flex-1 rounded-xl bg-black/30 px-4 py-2.5 outline-none ring-orange-300/50 focus:ring-2"
        />
        <select
          value={nation}
          onChange={(e) => setNation(e.target.value)}
          className="cursor-pointer rounded-xl bg-black/30 px-3 py-2.5 outline-none [&>option]:bg-pitch-900"
        >
          <option value="ALL">All nations</option>
          {nations.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="cursor-pointer rounded-xl bg-black/30 px-3 py-2.5 outline-none [&>option]:bg-pitch-900"
        >
          <option value="name">A → Z</option>
          <option value="popular">Most picked</option>
        </select>
        <div className="flex rounded-xl bg-black/30 p-1">
          {POSITIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPos(p)}
              className={`relative cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold ${pos === p ? 'text-pitch-950' : 'text-white/60'}`}
            >
              {pos === p && <motion.span layoutId="pos-pill" className="absolute inset-0 rounded-lg bg-orange-300" />}
              <span className="relative">{p}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-rose-300">Could not load players: {error}</p>}
      {!data && !error && <p className="py-20 text-center text-white/50">Loading…</p>}

      <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {filtered.slice(0, 120).map((p, i) => (
            <motion.div
              layout
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: Math.min(i * 0.015, 0.3) }}
              whileHover={{ y: -4 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Flag code={p.flag} className="h-6 w-9" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{p.name}</div>
                  <div className="text-xs text-white/50">{p.nationality}</div>
                </div>
                {p.stats?.picked > 0 && (
                  <span className="rounded-md bg-orange-400/15 px-2 py-0.5 text-[10px] font-bold text-orange-200" title={`${p.stats.correct} correct`}>
                    🎯 {p.stats.picked}
                  </span>
                )}
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold">{p.position}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.clubs.map((c) => (
                  <div key={c.id} title={c.name}>
                    <ClubCrest short={c.short} colors={c.colors} size="h-8 w-8 text-[9px]" />
                  </div>
                ))}
              </div>
              {p.awards.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.awards.map((a) => (
                    <span key={a.id} className="rounded-full bg-orange-300/15 px-2 py-0.5 text-[10px] font-semibold text-orange-200">
                      {AWARD_ICON[a.icon]} {a.name}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {filtered.length > 120 && <p className="mt-6 text-center text-sm text-white/40">Showing 120 of {filtered.length} — refine your search</p>}
    </div>
  )
}
