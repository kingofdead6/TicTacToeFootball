import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import CategoryBadge, { Flag } from './CategoryBadge.jsx'
import { api } from '../api.js'

export default function SearchModal({ open, row, col, turn, playerName, usedIds, checking, timeLeft, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    setLoading(true)
    const t = setTimeout(() => {
      api
        .search(query, ctrl.signal)
        .then((r) => {
          setResults(r)
          setActive(0)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 140)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query])

  const onKeyDown = (e) => {
    if (e.key === 'Escape') onClose()
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      const p = results[active]
      if (p && !usedIds.includes(p.id)) onPick(p)
    }
  }

  const accent = turn === 'X' ? 'text-x' : 'text-o'
  const ring = turn === 'X' ? 'focus-within:ring-x/60' : 'focus-within:ring-o/60'

  return (
    <AnimatePresence>
      {open && row && col && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[10vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-pitch-900/95 shadow-2xl shadow-black/60"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-sm">
              <span>
                <span className={`font-display text-xl ${accent}`}>{turn}</span>{' '}
                <span className="font-semibold">{playerName}</span> <span className="text-white/50">is guessing</span>
              </span>
              {timeLeft != null && (
                <span className={`font-mono font-bold ${timeLeft <= 5 ? 'animate-pulse text-rose-400' : 'text-white/60'}`}>⏱ {timeLeft}s</span>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 px-5 py-5">
              <div className="h-24 w-28">
                <CategoryBadge category={row} />
              </div>
              <span className="font-display text-3xl text-white/40">×</span>
              <div className="h-24 w-28">
                <CategoryBadge category={col} index={1} />
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className={`flex items-center gap-3 rounded-2xl bg-black/30 px-4 ring-2 ring-white/10 transition ${ring}`}>
                <span className="text-lg">🔎</span>
                <input
                  ref={inputRef}
                  value={query}
                  disabled={checking}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search a player…"
                  className="w-full bg-transparent py-4 text-lg outline-none placeholder:text-white/30"
                />
                {(loading || checking) && <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-emerald-300" />}
              </div>

              <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                <AnimatePresence initial={false}>
                  {results.map((p, i) => {
                    const used = usedIds.includes(p.id)
                    return (
                      <motion.li
                        key={p.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <button
                          disabled={used || checking}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => onPick(p)}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                            i === active ? 'bg-white/10' : 'hover:bg-white/5'
                          }`}
                        >
                          <Flag code={p.flag} className="h-5 w-7" />
                          <span className="flex-1 font-semibold">{p.name}</span>
                          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/60">{p.position}</span>
                          {used && <span className="text-xs text-white/50">used</span>}
                        </button>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
                {query.trim().length >= 2 && !loading && !results.length && (
                  <li className="px-3 py-6 text-center text-sm text-white/40">No player found in the database</li>
                )}
              </ul>

              <div className="mt-3 flex items-center justify-between text-xs text-white/35">
                <span>↑↓ to navigate · Enter to pick · Esc to close</span>
                <button onClick={onClose} className="cursor-pointer rounded-lg px-2 py-1 hover:bg-white/10 hover:text-white">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
