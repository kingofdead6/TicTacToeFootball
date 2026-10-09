import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Segmented from '../Segmented.jsx'
import { useProfile } from '../../profile.jsx'
import { api } from '../../api.js'
import { SectionTitle } from '../Brand.jsx'

const CODE_LEN = 6

export default function Lobby({ onCreate, onJoin, busy, live, initialCode }) {
  const { profile, dbAvailable, guestName, setGuestName, openModal } = useProfile()
  const [difficulty, setDifficulty] = useState('medium')
  const [timer, setTimer] = useState(30)
  const [bestOf, setBestOf] = useState(3)
  const [code, setCode] = useState((initialCode ?? '').toUpperCase().slice(0, CODE_LEN))
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (code.length !== CODE_LEN) {
      setPreview(null)
      return
    }
    let alive = true
    api
      .room(code)
      .then((p) => alive && setPreview(p))
      .catch(() => alive && setPreview({ notFound: true }))
    return () => {
      alive = false
    }
  }, [code])

  return (
    <div>
      <div className="mb-8 text-center">
        <SectionTitle sub="Create a room, send the code to a friend, and play head-to-head in real time.">Play online</SectionTitle>
        {live && (
          <div className="mt-4 inline-flex flex-wrap justify-center gap-2 text-xs">
            <LiveStat icon="🟢" label="online now" value={live.online} />
            <LiveStat icon="⚔️" label="live matches" value={live.playing} />
            <LiveStat icon="⏳" label="open rooms" value={live.waiting} />
          </div>
        )}
      </div>

      {/* Identity */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass mx-auto mb-6 flex max-w-3xl flex-col items-center gap-3 rounded-2xl p-4 sm:flex-row">
        {profile ? (
          <>
            <span className="text-4xl">{profile.avatar}</span>
            <div className="flex-1 text-center sm:text-left">
              <div className="font-bold">
                Playing as <span className="text-orange-300">@{profile.username}</span>
              </div>
              <div className="text-xs text-white/50">
                Rating {profile.rating} · matches against other card holders are ranked 🏆
              </div>
            </div>
            <button onClick={openModal} className="btn-ghost px-4 py-2 text-sm">
              Edit card
            </button>
          </>
        ) : (
          <>
            <span className="text-4xl">👤</span>
            <input
              value={guestName}
              maxLength={18}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Guest name"
              className="w-full flex-1 rounded-xl bg-black/30 px-4 py-2.5 font-semibold outline-none ring-orange-300/50 focus:ring-2"
            />
            {dbAvailable && (
              <button onClick={openModal} className="btn-primary whitespace-nowrap px-4 py-2 text-sm">
                ✨ Create card to play ranked
              </button>
            )}
          </>
        )}
      </motion.div>

      <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
        {/* Create */}
        <motion.section initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass relative overflow-hidden rounded-3xl p-6">
          <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-blue-400/15 blur-3xl" />
          <h2 className="relative font-display text-3xl tracking-wide">🏟️ Create a room</h2>
          <Label>Grid difficulty</Label>
          <Segmented
            layoutId="on-diff"
            value={difficulty}
            onChange={setDifficulty}
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
              { value: 'impossible', label: 'Impossible' },
            ]}
          />
          <Label>Turn timer</Label>
          <Segmented
            layoutId="on-timer"
            value={timer}
            onChange={setTimer}
            options={[
              { value: 15, label: '15s' },
              { value: 30, label: '30s' },
              { value: 60, label: '60s' },
              { value: 0, label: 'Off' },
            ]}
          />
          <Label>Series</Label>
          <Segmented
            layoutId="on-bo"
            value={bestOf}
            onChange={setBestOf}
            options={[
              { value: 1, label: 'Single' },
              { value: 3, label: 'Best of 3' },
              { value: 5, label: 'Best of 5' },
            ]}
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            onClick={() => onCreate({ difficulty, timer, bestOf })}
            className="btn-primary relative mt-6 w-full py-4 text-3xl font-black"
          >
            CREATE ROOM
          </motion.button>
        </motion.section>

        {/* Join */}
        <motion.section initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass relative flex flex-col overflow-hidden rounded-3xl p-6">
          <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-rose-400/15 blur-3xl" />
          <h2 className="relative font-display text-3xl tracking-wide">🔑 Join with a code</h2>
          <p className="relative mt-1 text-sm text-white/50">Enter the 6-character code your friend shared.</p>

          <CodeInput value={code} onChange={setCode} onEnter={() => code.length === CODE_LEN && onJoin(code)} />

          <div className="relative min-h-16 text-sm">
            {preview?.notFound && <p className="text-rose-300">No room with this code.</p>}
            {preview && !preview.notFound && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-black/25 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{preview.host?.avatar}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{preview.host?.name ?? 'Host'}'s room</div>
                    <div className="text-xs text-white/50">
                      {preview.settings.difficulty} · {preview.settings.timer ? `${preview.settings.timer}s` : 'no timer'} · best of {preview.settings.bestOf}
                      {preview.host?.rating ? ` · ${preview.host.rating} rating` : ''}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${preview.full ? 'bg-rose-400/20 text-rose-200' : 'bg-orange-400/20 text-orange-200'}`}>
                    {preview.full ? 'FULL' : 'OPEN'}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={busy || code.length !== CODE_LEN || preview?.notFound || preview?.full}
            onClick={() => onJoin(code)}
            className="btn-blue relative mt-auto w-full py-4 text-3xl font-black"
          >
            JOIN MATCH
          </motion.button>
        </motion.section>
      </div>
    </div>
  )
}

function CodeInput({ value, onChange, onEnter }) {
  const ref = useRef(null)
  return (
    <div className="relative my-5 cursor-text" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN))}
        onKeyDown={(e) => e.key === 'Enter' && onEnter()}
        className="absolute inset-0 opacity-0"
        aria-label="Room code"
      />
      <div className="flex justify-between gap-2">
        {Array.from({ length: CODE_LEN }).map((_, i) => {
          const ch = value[i]
          const active = i === value.length
          return (
            <motion.div
              key={i}
              animate={ch ? { scale: [1.2, 1], rotate: [8, 0] } : { scale: 1 }}
              className={`grid aspect-[3/4] flex-1 place-items-center rounded-xl border-2 font-display text-3xl transition-colors sm:text-4xl ${
                ch ? 'border-orange-300/70 bg-orange-300/10' : active ? 'border-white/50 bg-white/5' : 'border-white/10 bg-black/20'
              }`}
            >
              {ch ?? (active ? <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} className="h-7 w-0.5 bg-white/60" /> : '')}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function LiveStat({ icon, label, value }) {
  return (
    <span className="glass rounded-full px-3 py-1.5">
      {icon} <span className="font-bold">{value}</span> <span className="text-white/50">{label}</span>
    </span>
  )
}

function Label({ children }) {
  return <div className="relative mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{children}</div>
}
