import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Segmented from '../components/Segmented.jsx'
import { Brush, SectionTitle, StatTile, Wordmark } from '../components/Brand.jsx'
import { api } from '../api.js'
import { useProfile } from '../profile.jsx'
import { brand } from '../assets/brand/index.js'

const MODES = [
  { id: 'local', title: 'Pass & Play', desc: 'Two players, one screen', icon: '🧑‍🤝‍🧑' },
  { id: 'cpu', title: 'vs Computer', desc: 'Beat the AI scout', icon: '🤖' },
  { id: 'online', title: 'Online', desc: 'Live match by code', icon: '🌐', live: true },
]

const STEPS = [
  { icon: brand.podiumIcon, title: 'Pick a square', text: 'Every square sits between a row and a column: a club, a nation or a trophy.' },
  { emoji: '🔎', title: 'Name a player', text: 'Find a footballer who fits both categories. Each player can only be used once.' },
  { emoji: '⚡', title: 'Three in a row', text: 'A wrong answer or running out of time hands the turn to your rival.' },
]

const FLOATING = [
  { src: brand.stickers.skills, className: 'left-[-2%] top-[6%] w-56 -rotate-12', delay: 0 },
  { src: brand.stickers.jersey, className: 'right-[-1%] top-[2%] w-40 rotate-12', delay: 0.6 },
  { src: brand.stickers.cat, className: 'left-[2%] bottom-[14%] w-36 rotate-6', delay: 1.1 },
  { src: brand.stickers.runner, className: 'right-[3%] bottom-[18%] w-32 -rotate-6', delay: 0.3 },
]

export default function Home({ onStart, initial, onOnline }) {
  const [mode, setMode] = useState(initial?.mode ?? 'local')
  const [names, setNames] = useState(initial?.names ?? ['Player 1', 'Player 2'])
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 'medium')
  const [timer, setTimer] = useState(initial?.timer ?? 30)
  const [cpuLevel, setCpuLevel] = useState(initial?.cpuLevel ?? 'pro')
  const [health, setHealth] = useState(null)
  const [counts, setCounts] = useState(null)
  const { profile } = useProfile()
  const setupRef = useRef(null)

  // Use the player card name for X when one exists
  useEffect(() => {
    if (profile && !initial) setNames((n) => (n[0] === 'Player 1' ? [profile.username, n[1]] : n))
  }, [profile, initial])

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ ok: false }))
    api
      .categories()
      .then((cats) =>
        setCounts({
          club: cats.filter((c) => c.type === 'club').length,
          nation: cats.filter((c) => c.type === 'nation').length,
          award: cats.filter((c) => c.type === 'award').length,
        }),
      )
      .catch(() => {})
  }, [])

  const start = () =>
    onStart({
      mode,
      difficulty,
      timer,
      cpuLevel,
      names: mode === 'cpu' ? [names[0] || 'You', 'AI Scout'] : names.map((n, i) => n.trim() || `Player ${i + 1}`),
    })

  const scrollToSetup = () => setupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="space-y-24">
      {/* ---------------- Hero ---------------- */}
      <section className="relative text-center">
        {FLOATING.map((s) => (
          <motion.img
            key={s.src}
            src={s.src}
            alt=""
            className={`pointer-events-none absolute hidden drop-shadow-[0_10px_20px_rgba(0,0,0,.5)] xl:block ${s.className}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, y: [0, -14, 0] }}
            transition={{ opacity: { delay: 0.6 + s.delay }, scale: { delay: 0.6 + s.delay, type: 'spring' }, y: { duration: 5, repeat: Infinity, delay: s.delay } }}
          />
        ))}

        <div className="mx-auto max-w-3xl [&_.flex]:justify-center">
          <Wordmark />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mx-auto mt-8 max-w-2xl font-display text-2xl font-semibold leading-snug text-white sm:text-3xl"
        >
          <p>This is the kickoff of a new season, and your chance to rise!</p>
          <p className="mt-1 text-blue-100">Name the players, claim the squares, and push your football knowledge to its limits.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-10 flex flex-wrap justify-center gap-5 sm:gap-8"
        >
          <StatTile label="Players" value={health?.players ?? '–'} />
          <StatTile label="Clubs" value={counts?.club ?? '–'} />
          <StatTile label="Nations" value={counts?.nation ?? '–'} />
          <StatTile label="Trophies" value={counts?.award ?? '–'} />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="mt-8 flex flex-col items-center gap-6">
          <p className="flex items-center gap-3 font-display text-2xl font-extrabold uppercase">
            <img src={brand.locationPin} alt="" className="h-8 w-auto" /> Oued Smar, ESI
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={scrollToSetup} className="btn-primary px-8 py-4 text-2xl">
              PLAY NOW <img src={brand.arrowRight} alt="" className="h-5 w-auto" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOnline}
              style={{ backgroundImage: `url(${brand.registerBtnBg})` }}
              className="btn rounded-[40px] border border-black bg-cover bg-center px-8 py-4 text-2xl text-paper"
            >
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-500" /> PLAY ONLINE
            </motion.button>
          </div>
          {health && !health.ok && (
            <p className="rounded-xl bg-rose-500/20 px-4 py-2 text-sm text-rose-100">
              The game server is offline. Start it with <code className="rounded bg-black/30 px-1">npm run dev</code> in <code className="rounded bg-black/30 px-1">server/</code>
            </p>
          )}
        </motion.div>
      </section>

      {/* ---------------- How to play ---------------- */}
      <section>
        <SectionTitle sub="Three steps to glory">How to play</SectionTitle>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              whileHover={{ y: -6 }}
              className={`card-paper relative overflow-hidden px-6 pb-6 pt-8 text-center shadow-xl shadow-black/30 ${i === 1 ? 'md:mt-10' : ''}`}
            >
              <Brush className={i === 1 ? '-left-10 -top-4 w-44' : i === 0 ? '-bottom-6 -left-6 w-44' : '-right-14 top-2 w-44'} />
              <div className="relative grid place-items-center">
                {s.icon ? <img src={s.icon} alt="" className="h-14 w-14" /> : <span className="text-5xl">{s.emoji}</span>}
              </div>
              <h3 className="relative mt-3 font-sans text-2xl font-medium">{s.title}</h3>
              <p className="relative mt-2 text-sm text-blue-400">{s.text}</p>
              <span className="relative mx-auto mt-4 grid h-10 w-10 place-items-center rounded-full border-2 border-blue-500 font-display text-xl font-black">
                {i + 1}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------- Setup ---------------- */}
      <section ref={setupRef} className="scroll-mt-28">
        <SectionTitle sub="Set up your match">Kick off</SectionTitle>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card-paper relative mx-auto mt-10 max-w-3xl overflow-hidden p-6 shadow-2xl shadow-black/40 sm:p-8"
        >
          <Brush className="-right-16 -top-6 w-56" />
          <Brush className="-bottom-10 -left-10 w-48" variant={1} />

          <div className="relative grid grid-cols-3 gap-2 sm:gap-3">
            {MODES.map((m) => (
              <motion.button
                key={m.id}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => (m.id === 'online' ? onOnline() : setMode(m.id))}
                className={`relative cursor-pointer rounded-2xl border-2 p-3 text-left transition-colors sm:p-4 ${
                  mode === m.id ? 'border-orange-500 bg-orange-50' : 'border-blue-100 bg-white hover:border-blue-300'
                }`}
              >
                <div className="text-3xl">{m.icon}</div>
                {m.live && (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
                  </span>
                )}
                <div className="mt-2 font-display text-xl font-black leading-none sm:text-2xl">{m.title}</div>
                <div className="mt-1 text-xs text-blue-400">{m.desc}</div>
                {mode === m.id && (
                  <motion.span layoutId="mode-check" className="absolute bottom-3 right-3 grid h-6 w-6 place-items-center rounded-full bg-orange-500 text-xs text-white">
                    ✓
                  </motion.span>
                )}
              </motion.button>
            ))}
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
            <NameInput mark="X" value={names[0]} onChange={(v) => setNames([v, names[1]])} />
            {mode === 'local' ? (
              <NameInput mark="O" value={names[1]} onChange={(v) => setNames([names[0], v])} />
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3 ring-2 ring-orange-200">
                <span className="font-display text-4xl font-black text-orange-500">O</span>
                <span className="font-semibold">AI Scout 🤖</span>
              </div>
            )}
          </div>

          <div className="relative grid gap-x-6 sm:grid-cols-2">
            <div>
              <Label>Grid difficulty</Label>
              <Segmented
                tone="light"
                layoutId="seg-diff"
                value={difficulty}
                onChange={setDifficulty}
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
              />
            </div>
            <div>
              <Label>Turn timer</Label>
              <Segmented
                tone="light"
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
            </div>
          </div>

          {mode === 'cpu' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="relative">
              <Label>AI level</Label>
              <Segmented
                tone="light"
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
            className="btn-primary relative mt-8 w-full py-4 text-3xl font-black tracking-wide"
          >
            KICK OFF ⚽
          </motion.button>
        </motion.div>
      </section>
    </div>
  )
}

function Label({ children }) {
  return <div className="mb-2 mt-6 font-display text-lg font-extrabold uppercase tracking-wide text-blue-500">{children}</div>
}

function NameInput({ mark, value, onChange }) {
  const isX = mark === 'X'
  return (
    <label
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-2 transition-shadow ${
        isX ? 'bg-blue-50 ring-blue-100 focus-within:ring-blue-500' : 'bg-orange-50 ring-orange-100 focus-within:ring-orange-500'
      }`}
    >
      <span className={`font-display text-4xl font-black ${isX ? 'text-blue-500' : 'text-orange-500'}`}>{mark}</span>
      <input
        value={value}
        maxLength={20}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent font-semibold text-blue-900 outline-none placeholder:text-blue-300"
        placeholder={`Player ${mark}`}
      />
    </label>
  )
}
