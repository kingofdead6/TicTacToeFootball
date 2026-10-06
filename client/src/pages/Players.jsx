import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../api.js'
import { ClubCrest, Flag } from '../components/CategoryBadge.jsx'
import { SectionTitle } from '../components/Brand.jsx'
import { brand } from '../assets/brand/index.js'

export const AWARD_ICON = { ballon: '⚽', trophy: '🏆', star: '⭐', globe: '🌍', boot: '👟' }
const POSITIONS = ['ALL', 'GK', 'DF', 'MF', 'FW']
const PAGE_SIZE = 30

const selectClass =
  'w-full cursor-pointer rounded-xl bg-navy-500/70 px-3 py-2.5 text-sm font-medium outline-none ring-1 ring-blue-400/30 focus:ring-2 focus:ring-orange-500 [&>option]:bg-blue-900'

export default function Players() {
  const [filters, setFilters] = useState({ q: '', nation: '', club: '', award: '', position: '', sort: 'fame' })
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState({ clubs: [], nations: [], awards: [] })
  const [dataset, setDataset] = useState(null)
  const [results, setResults] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const sentinel = useRef(null)

  // Filter options + dataset info
  useEffect(() => {
    api
      .categories()
      .then((all) =>
        setCats({
          clubs: all.filter((c) => c.type === 'club').sort((a, b) => a.name.localeCompare(b.name)),
          nations: all.filter((c) => c.type === 'nation').sort((a, b) => a.name.localeCompare(b.name)),
          awards: all.filter((c) => c.type === 'award'),
        }),
      )
      .catch(() => {})
    api.dataset().then(setDataset).catch(() => {})
  }, [])

  // Debounce the text search
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === query ? f : { ...f, q: query })), 250)
    return () => clearTimeout(t)
  }, [query])

  // New filters → restart from page 1
  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    api
      .players({ ...filters, page, limit: PAGE_SIZE }, ctrl.signal)
      .then((r) => {
        setMeta(r)
        setResults((prev) => (page === 1 ? r.results : [...prev, ...r.results]))
      })
      .catch((e) => e.name !== 'AbortError' && setError(e.message))
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [filters, page])

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && meta && page < meta.pages) setPage((p) => p + 1)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [loading, meta, page])

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target?.value ?? e }))
  const activeFilters = ['nation', 'club', 'award', 'position'].filter((k) => filters[k]).length + (filters.q ? 1 : 0)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle align="left" sub={dataset ? `Live from Wikidata · ${dataset.categories.clubs} clubs · ${dataset.categories.nations} nations` : 'Every footballer in the game'}>
          Footballers
        </SectionTitle>
        {meta && (
          <div className="flex items-center gap-2 font-display text-xl font-extrabold text-blue-100">
            <motion.span
              key={meta.total}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="grid h-14 min-w-14 place-items-center rounded-[18px] bg-orange-500 px-3 text-3xl font-black text-white"
            >
              {meta.total.toLocaleString()}
            </motion.span>
            {dataset && activeFilters > 0 && <span>/ {dataset.players.toLocaleString()}</span>}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="glass mb-6 grid gap-3 rounded-2xl p-3 md:grid-cols-[2fr_1fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a footballer…"
          className="rounded-xl bg-navy-500/70 px-4 py-2.5 outline-none ring-1 ring-blue-400/30 placeholder:text-blue-200/50 focus:ring-2 focus:ring-orange-500"
        />
        <select value={filters.nation} onChange={set('nation')} className={selectClass}>
          <option value="">All nations</option>
          {cats.nations.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name} ({n.playerCount})
            </option>
          ))}
        </select>
        <select value={filters.club} onChange={set('club')} className={selectClass}>
          <option value="">All clubs</option>
          {cats.clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.playerCount})
            </option>
          ))}
        </select>
        <select value={filters.award} onChange={set('award')} className={selectClass}>
          <option value="">All trophies</option>
          {cats.awards.map((a) => (
            <option key={a.id} value={a.id}>
              {AWARD_ICON[a.icon]} {a.name} ({a.playerCount})
            </option>
          ))}
        </select>
        <select value={filters.sort} onChange={set('sort')} className={selectClass}>
          <option value="fame">Most famous</option>
          <option value="name">A → Z</option>
          <option value="picked">Most picked in games</option>
        </select>
        <div className="flex rounded-xl bg-navy-500/70 p-1 ring-1 ring-blue-400/30">
          {POSITIONS.map((p) => {
            const value = p === 'ALL' ? '' : p
            const active = filters.position === value
            return (
              <button
                key={p}
                onClick={() => setFilters((f) => ({ ...f, position: value }))}
                className={`relative flex-1 cursor-pointer rounded-lg px-3 py-1.5 font-display text-base font-extrabold ${active ? 'text-white' : 'text-blue-100/60 hover:text-white'}`}
              >
                {active && <motion.span layoutId="pos-pill" className="absolute inset-0 rounded-lg bg-orange-500" />}
                <span className="relative">{p}</span>
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="text-rose-300">Could not load players: {error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {results.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: Math.min((i % PAGE_SIZE) * 0.02, 0.4) }}
              whileHover={{ y: -4 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Flag code={p.flag} className="h-6 w-9" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-xl font-black leading-tight">{p.name}</div>
                  <div className="text-xs text-blue-100/70">
                    {p.nationality ?? 'Unknown nation'}
                    {p.born ? ` · born ${p.born}` : ''}
                  </div>
                </div>
                {p.stats?.picked > 0 && (
                  <span className="rounded-md bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-200" title={`${p.stats.correct} correct`}>
                    🎯 {p.stats.picked}
                  </span>
                )}
                {p.position && <span className="rounded-md bg-blue-500 px-2 py-0.5 font-display text-sm font-black">{p.position}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.clubs.map((c) => (
                  <button key={c.id} title={c.name} onClick={() => setFilters((f) => ({ ...f, club: c.id }))} className="cursor-pointer transition-transform hover:scale-110">
                    <ClubCrest short={c.short} colors={c.colors} size="h-8 w-8 text-[9px]" />
                  </button>
                ))}
              </div>
              {p.awards.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.awards.map((a) => (
                    <span key={a.id} className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-orange-100">
                      {AWARD_ICON[a.icon]} {a.name}
                    </span>
                  ))}
                </div>
              )}
              {p.wikidataId && (
                <a
                  href={`https://www.wikidata.org/wiki/${p.wikidataId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-[10px] font-medium text-blue-200/60 hover:text-orange-300"
                >
                  {p.wikidataId} · {p.fame} Wikipedia editions
                </a>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!loading && meta?.total === 0 && (
        <div className="card-paper mx-auto mt-6 max-w-md p-8 text-center">
          <img src={brand.stickers.cat} alt="" className="mx-auto w-32" />
          <p className="mt-3 font-medium text-blue-500">No footballer matches these filters.</p>
        </div>
      )}

      <div ref={sentinel} className="flex h-24 items-center justify-center">
        {loading && (
          <motion.img src={brand.ball} alt="Loading" className="h-10 w-10 rounded-full" animate={{ rotate: 360, y: [0, -10, 0] }} transition={{ duration: 0.9, repeat: Infinity }} />
        )}
        {!loading && meta && page < meta.pages && (
          <button onClick={() => setPage((p) => p + 1)} className="btn-ghost text-base">
            Load more
          </button>
        )}
      </div>
    </div>
  )
}
