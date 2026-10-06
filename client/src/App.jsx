import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Background from './components/Background.jsx'
import Home from './pages/Home.jsx'
import Game from './pages/Game.jsx'
import Players from './pages/Players.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Online from './pages/Online.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import { useProfile } from './profile.jsx'
import { brand } from './assets/brand/index.js'

const TABS = [
  { id: 'home', label: 'Play', icon: '⚽' },
  { id: 'online', label: 'Online', icon: '🌐' },
  { id: 'players', label: 'Players', icon: '👟' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
]

export default function App() {
  // An invite link (?room=CODE) opens the online lobby directly
  const [inviteCode] = useState(() => new URLSearchParams(window.location.search).get('room'))
  const [page, setPage] = useState(inviteCode ? 'online' : 'home')
  const [settings, setSettings] = useState(null)

  // Each page starts at the top (e.g. "Kick off" is clicked far down the home page)
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [page])

  const startGame = (s) => {
    setSettings(s)
    setPage('game')
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Background />

      {/* Floating pill navbar from the WD 2026 landing page */}
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-[24px] border border-blue-300/25 bg-blue-500/85 px-3 py-2 shadow-[0_4px_2px_rgba(0,0,0,0.25)] backdrop-blur-md sm:px-5">
          <button onClick={() => setPage('home')} className="group flex cursor-pointer items-center gap-2" aria-label="Home">
            <motion.img
              src={brand.secLogo}
              alt="SEC"
              className="h-10 w-auto rounded-2xl"
              whileHover={{ rotate: -12, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            />
            <span className="hidden font-display text-2xl font-black uppercase leading-none lg:inline">
              Tic Tac <span className="text-orange-500">Toe</span>
            </span>
          </button>

          <nav className="relative flex gap-0.5 sm:gap-2">
            {TABS.map((t) => {
              const active = page === t.id || (t.id === 'home' && page === 'game')
              return (
                <button
                  key={t.id}
                  onClick={() => setPage(t.id)}
                  aria-label={t.label}
                  title={t.label}
                  className={`relative cursor-pointer rounded-xl px-3 py-1.5 font-display text-xl font-extrabold uppercase leading-none transition-colors sm:px-4 ${
                    active ? 'text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-x-2 -bottom-1 h-[3px] rounded-full bg-orange-500"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <span className="sm:hidden">{t.icon}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </span>
                </button>
              )
            })}
          </nav>

          <ProfileChip />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transitionEnd: { transform: 'none' } }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            {page === 'home' && <Home onStart={startGame} initial={settings} onOnline={() => setPage('online')} />}
            {page === 'online' && <Online initialCode={inviteCode} onNavigate={setPage} />}
            {page === 'game' && settings && <Game settings={settings} onExit={() => setPage('home')} />}
            {page === 'players' && <Players />}
            {page === 'leaderboard' && <Leaderboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      <ProfileModal />
      <Footer onNavigate={setPage} />
    </div>
  )
}

/** "Register Now !" pill: navy gradient artwork with a black border */
function ProfileChip() {
  const { profile, dbAvailable, openModal } = useProfile()
  if (!profile && !dbAvailable) return null
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={openModal}
      style={{ backgroundImage: `url(${brand.registerBtnBg})` }}
      className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[40px] border border-black bg-cover bg-center px-3 font-display text-lg font-extrabold leading-none text-paper sm:px-4"
    >
      {profile ? (
        <>
          <span className="text-lg">{profile.avatar}</span>
          <span className="hidden max-w-24 truncate md:inline">{profile.username}</span>
          <span className="rounded-full bg-orange-500 px-2 py-1 text-base">{profile.rating}</span>
        </>
      ) : (
        <>
          <span className="sm:hidden">✨</span>
          <span className="hidden sm:inline">Register Now !</span>
        </>
      )}
    </motion.button>
  )
}

/** Footer from the landing page: blue → orange gradient, SEC logo and links */
function Footer({ onNavigate }) {
  const links = [
    ['Play', 'home'],
    ['Online', 'online'],
    ['Players', 'players'],
    ['Leaderboard', 'leaderboard'],
  ]
  return (
    <footer
      className="mt-16 px-6 pb-8 pt-16"
      style={{ backgroundImage: 'linear-gradient(179deg, rgba(0,17,45,0) 0%, rgb(1,51,136) 22%, rgba(255,77,0,0.85) 72%)' }}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-8 sm:grid-cols-3">
        <div className="flex items-center gap-4">
          <img src={brand.whiteLogo} alt="SEC" className="h-20 w-auto" />
          <p className="font-sans text-lg font-bold leading-snug text-paper">
            SPORT &<br />
            ENTERTAINMENT
            <br />
            CLUB
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-x-8 gap-y-2 font-display text-xl font-semibold">
          {links.map(([label, id]) => (
            <button key={id} onClick={() => onNavigate(id)} className="cursor-pointer text-left text-white/90 hover:text-white hover:underline">
              {label}
            </button>
          ))}
        </nav>
        <div className="text-center sm:text-right">
          <p className="font-display text-2xl font-extrabold">CONTACT US</p>
          <img src={brand.socialMedia} alt="Instagram, Facebook, LinkedIn" className="mt-3 inline-block h-8" />
          <p className="mt-3 font-sans text-sm font-light">or via seclub@esi.dz</p>
        </div>
      </div>
      <p className="mt-10 text-center font-sans text-sm font-light text-white/90">
        Tic Tac Toe Football · © {new Date().getFullYear()} Sport &amp; Entertainment Club · ESI Oued Smar
      </p>
    </footer>
  )
}
