import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Segmented from '../components/Segmented.jsx'
import { api } from '../api.js'

const TITLE = ['TIC', 'TAC', 'TOE']

const MODES = [
  { id: 'local', title: 'Pass & Play', desc: 'Two players, one screen', icon: '🧑‍🤝‍🧑' },
  { id: 'cpu', title: 'vs Computer', desc: 'Challenge the AI scout', icon: '🤖' },
]

const STEPS = [
  { icon: '🎯', title: 'Pick a square', text: 'Each square sits between a row and a column category.' },
  { icon: '🔎', title: 'Name a player', text: 'Find a footballer who matches both — club, nation or trophy.' },
  { icon: '❌⭕', title: 'Get three in a row', text: 'Wrong answer or time out? Your turn is gone.' },
]

export default function Home({ onStart, initial }) {
  const [mode, setMode] = useState(initial?.mode ?? 'local')
  const [names, setNames] = useState(initial?.names ?? ['Player 1', 'Player 2'])
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 'medium')
  const [timer, setTimer] = useState(initial?.timer ?? 30)
  const [cpuLevel, setCpuLevel] = useState(initial?.cpuLevel ?? 'pro')
  const [health, setHealth] = useState(null)

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ ok: false }))
  }, [])

  const start = () =>
    onStart({
      mode,
      difficulty,
      timer,
      cpuLevel,
      names: mode === 'cpu' ? [names[0] || 'You', 'AI Scout'] : names.map((n, i) => n.trim() || `Player ${i + 1}`),
    })

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
      {/* Hero */}
      <section className="relative text-center lg:text-left">
        <motion.div
          className="absolute -top-6 right-6 hidden text-7xl drop-shadow-[0_0_30px_rgba(255,255,255,.35)] lg:block"
          animate={{ y: [0, -24, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ⚽
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Football trivia showdown
        </motion.p>

        <h1 className="font-display leading-[0.85]">
          <span className="flex justify-center gap-4 text-7xl sm:text-8xl lg:justify-start lg:text-9xl">
            {TITLE.map((w, i) => (
              <motion.span
                key={w}
                initial={{ opacity: 0, y: 60, rotate: -10 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 200, damping: 14 }}
                className={i === 0 ? 'text-x' : i === 1 ? 'text-o' : 'text-white'}
              >
                {w}
              </motion.span>
            ))}
          </span>
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55 }}
            className="text-gradient block text-6xl sm:text-7xl lg:text-8xl"
          >
            FOOTBALL
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mx-auto mt-5 max-w-md text-white/60 lg:mx-0"
        >
          The classic grid with a football twist. Claim squares by naming players who fit both categories — clubs, nations
          and legendary trophies.
        </motion.p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="glass rounded-2xl p-4 text-left"
            >
              <div className="text-2xl">{s.icon}</div>
              <div className="mt-2 font-semibold">{s.title}</div>
              <div className="mt-1 text-xs text-white/55">{s.text}</div>
            </motion.div>
          ))}
        </div>

        {health && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 text-xs text-white/40">
            {health.ok ? (
              <>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" /> API online · {health.players} players ·{' '}
                {health.categories} categories
              </>
            ) : (
              <>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" /> API offline — start the server with{' '}
                <code className="rounded bg-white/10 px-1">npm run dev</code> in <code className="rounded bg-white/10 px-1">server/</code>
              </>
            )}
          </motion.p>
        )}
      </section>

      {/* Setup card */}
      <motion.section
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 18 }}
        className="glass relative overflow-hidden rounded-3xl p-6 shadow-2xl shadow-black/40 sm:p-8"
      >
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <h2 className="font-display text-4xl tracking-wide">Match setup</h2>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {MODES.map((m) => (
            <motion.button
              key={m.id}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setMode(m.id)}
              className={`relative cursor-pointer rounded-2xl border p-4 text-left transition-colors ${
                mode === m.id ? 'border-emerald-300/70 bg-emerald-300/10' : 'border-white/10 bg-black/20 hover:border-white/25'
              }`}
            >
              <div className="text-3xl">{m.icon}</div>
              <div className="mt-2 font-bold">{m.title}</div>
              <div className="text-xs text-white/50">{m.desc}</div>
              {mode === m.id && (
                <motion.span layoutId="mode-check" className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-emerald-300 text-xs text-pitch-950">
                  ✓
                </motion.span>
              )}
            </motion.button>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <NameInput mark="X" value={names[0]} onChange={(v) => setNames([v, names[1]])} />
          {mode === 'local' ? (
            <NameInput mark="O" value={names[1]} onChange={(v) => setNames([names[0], v])} />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-o/30 bg-o/10 px-4 py-3">
              <span className="font-display text-3xl text-o">O</span>
              <span className="font-semibold">AI Scout 🤖</span>
            </div>
          )}
        </div>

        <Label>Grid difficulty</Label>
        <Segmented
          layoutId="seg-diff"
          value={difficulty}
          onChange={setDifficulty}
          options={[
            { value: 'easy', label: '🟢 Easy' },
            { value: 'medium', label: '🟡 Medium' },
            { value: 'hard', label: '🔴 Hard' },
          ]}
        />

        <Label>Turn timer</Label>
        <Segmented
          layoutId="seg-timer"
          value={timer}
          onChange={setTimer}
          options={[
            { value: 0, label: 'Off' },
            { value: 15, label: '15s' },
            { value: 30, label: '30s' },
            { value: 60, label: '60s' },
          ]}
        />

        {mode === 'cpu' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <Label>AI level</Label>
            <Segmented
              layoutId="seg-cpu"
              value={cpuLevel}
              onChange={setCpuLevel}
              options={[
                { value: 'rookie', label: 'Rookie' },
                { value: 'pro', label: 'Pro' },
                { value: 'legend', label: 'Legend' },
              ]}
            />
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={start}
          className="btn-primary mt-8 w-full py-4 font-display text-2xl tracking-widest"
        >
          KICK OFF ⚽
        </motion.button>
      </motion.section>
    </div>
  )
}

function Label({ children }) {
  return <div className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{children}</div>
}

function NameInput({ mark, value, onChange }) {
  const color = mark === 'X' ? 'text-x border-x/30 bg-x/10 focus-within:border-x' : 'text-o border-o/30 bg-o/10 focus-within:border-o'
  return (
    <label className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${color}`}>
      <span className="font-display text-3xl">{mark}</span>
      <input
        value={value}
        maxLength={20}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent font-semibold text-white outline-none placeholder:text-white/30"
        placeholder={`Player ${mark}`}
      />
    </label>
  )
}
