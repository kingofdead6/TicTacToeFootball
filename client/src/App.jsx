import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Background from './components/Background.jsx'
import Home from './pages/Home.jsx'
import Game from './pages/Game.jsx'
import Players from './pages/Players.jsx'
import Leaderboard from './pages/Leaderboard.jsx'

const TABS = [
  { id: 'home', label: 'Play', icon: '⚽' },
  { id: 'players', label: 'Players', icon: '👟' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
]

export default function App() {
  const [page, setPage] = useState('home')
  const [settings, setSettings] = useState(null)

  const startGame = (s) => {
    setSettings(s)
    setPage('game')
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Background />

      <header className="sticky top-0 z-30 border-b border-white/5 bg-pitch-950/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <button onClick={() => setPage('home')} className="group flex cursor-pointer items-center gap-2">
            <motion.span className="text-2xl" whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
              ⚽
            </motion.span>
            <span className="font-display text-2xl tracking-wider">
              TIC TAC <span className="text-emerald-300">TOE</span>
            </span>
          </button>
          <nav className="relative flex gap-1 rounded-2xl bg-white/5 p-1">
            {TABS.map((t) => {
              const active = page === t.id || (t.id === 'home' && page === 'game')
              return (
                <button
                  key={t.id}
                  onClick={() => setPage(t.id)}
                  className="relative cursor-pointer rounded-xl px-3 py-1.5 text-sm font-semibold text-white/70 transition-colors hover:text-white sm:px-4"
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-white/15"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <span>{t.icon}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
            transition={{ duration: 0.35 }}
          >
            {page === 'home' && <Home onStart={startGame} initial={settings} />}
            {page === 'game' && settings && <Game settings={settings} onExit={() => setPage('home')} />}
            {page === 'players' && <Players />}
            {page === 'leaderboard' && <Leaderboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="py-6 text-center text-xs text-white/30">Tic Tac Toe Football · name a player who fits both the row and the column</footer>
    </div>
  )
}
