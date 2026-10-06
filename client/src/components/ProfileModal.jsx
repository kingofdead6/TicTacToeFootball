import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api, tokenStore } from '../api.js'
import { useProfile } from '../profile.jsx'
import Portal from './Portal.jsx'

const FALLBACK_AVATARS = ['⚽', '🦁', '🐐', '🔥', '⚡', '👑', '🦅', '🐺', '🐉', '🚀', '🎯', '🧤', '🥅', '🏆', '💎', '🌟', '🦈', '🐯', '🤖', '👽']

export default function ProfileModal() {
  const { modalOpen, closeModal, profile, create, restore, updateAvatar, logout, dbAvailable } = useProfile()
  const [copied, setCopied] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [key, setKey] = useState('')
  const [avatars, setAvatars] = useState(FALLBACK_AVATARS)
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState('⚽')
  const [check, setCheck] = useState(null) // {available, reason}
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!modalOpen) return
    setError(null)
    setAvatar(profile?.avatar ?? '⚽')
    api.avatars().then(setAvatars).catch(() => {})
  }, [modalOpen, profile])

  useEffect(() => {
    if (profile || username.length < 3) {
      setCheck(null)
      return
    }
    const t = setTimeout(() => api.usernameAvailable(username).then(setCheck).catch(() => setCheck(null)), 300)
    return () => clearTimeout(t)
  }, [username, profile])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (profile) await updateAvatar(avatar)
      else await create(username, avatar)
      closeModal()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Portal>
    <AnimatePresence>
      {modalOpen && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/65 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && closeModal()}
        >
          <motion.form
            onSubmit={submit}
            initial={{ y: 40, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-pitch-900/95 p-6 shadow-2xl sm:p-8"
          >
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-400/15 blur-3xl" />

            {/* Card preview */}
            <motion.div
              layout
              className="relative mx-auto mb-6 flex w-56 flex-col items-center rounded-3xl border border-orange-200/30 bg-linear-to-b from-orange-200/20 via-orange-500/10 to-transparent p-5 shadow-xl shadow-orange-500/10"
            >
              <div className="absolute left-4 top-3 text-left font-display leading-none text-orange-200">
                <div className="text-3xl">{profile?.rating ?? 1000}</div>
                <div className="text-[10px] tracking-widest">RATING</div>
              </div>
              <motion.div key={avatar} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} className="mt-4 text-6xl">
                {avatar}
              </motion.div>
              <div className="mt-3 max-w-full truncate font-display text-2xl tracking-wide">{profile?.username ?? (username || 'YOUR NAME')}</div>
              {profile && (
                <div className="mt-1 text-xs text-white/50">
                  {profile.stats.wins}W · {profile.stats.draws}D · {profile.stats.losses}L
                  {profile.rank ? ` · #${profile.rank}` : ''}
                </div>
              )}
            </motion.div>

            <h2 className="font-display text-3xl tracking-wide">{profile ? 'Your player card' : 'Create your player card'}</h2>
            <p className="mb-5 text-sm text-white/50">
              {profile ? 'Change your avatar. Your rating changes with every ranked online match.' : 'Pick a unique username to climb the ranked leaderboard. No password needed: your card is saved in this browser.'}
            </p>

            {dbAvailable === false && (
              <p className="mb-4 rounded-xl bg-orange-400/10 p-3 text-xs text-orange-200">
                The database isn't connected yet, so profiles are unavailable. You can still play online as a guest.
              </p>
            )}

            {!profile && (
              <label className="block">
                <div className="flex items-center gap-2 rounded-2xl bg-black/30 px-4 ring-2 ring-white/10 focus-within:ring-orange-300/60">
                  <span className="text-white/40">@</span>
                  <input
                    autoFocus
                    value={username}
                    maxLength={18}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="username"
                    className="w-full bg-transparent py-3 font-semibold outline-none placeholder:text-white/25"
                  />
                  {check && <span className={`text-xs font-semibold ${check.available ? 'text-orange-300' : 'text-rose-300'}`}>{check.available ? '✓ free' : '✗'}</span>}
                </div>
                {check && !check.available && <span className="mt-1 block text-xs text-rose-300">{check.reason}</span>}
              </label>
            )}

            <div className="mt-4 grid grid-cols-10 gap-1.5">
              {avatars.map((a) => (
                <motion.button
                  type="button"
                  key={a}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setAvatar(a)}
                  className={`grid aspect-square cursor-pointer place-items-center rounded-xl text-lg transition-colors ${
                    avatar === a ? 'bg-orange-300/25 ring-2 ring-orange-300' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {a}
                </motion.button>
              ))}
            </div>

            {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

            <div className="mt-6 flex gap-2">
              <button
                type="submit"
                disabled={saving || dbAvailable === false || (!profile && !check?.available)}
                className="btn-primary flex-1 font-display text-xl tracking-widest"
              >
                {saving ? 'SAVING…' : profile ? 'SAVE' : 'CREATE CARD'}
              </button>
              <button type="button" onClick={closeModal} className="btn-ghost">
                Close
              </button>
            </div>
            {profile ? (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(tokenStore.get() ?? '')
                  setError(null)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="mt-4 w-full cursor-pointer rounded-xl bg-white/5 py-2 text-xs text-white/60 hover:bg-white/10"
              >
                {copied ? '✓ Copied! Keep it secret: it logs into your card' : '🔑 Copy login key (use your card on another device)'}
              </button>
            ) : (
              <div className="mt-4 text-center text-xs text-white/40">
                {restoring ? (
                  <div className="flex gap-2">
                    <input
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      placeholder="Paste your login key"
                      className="flex-1 rounded-xl bg-black/30 px-3 py-2 text-white outline-none"
                    />
                    <button
                      type="button"
                      disabled={!key.trim()}
                      onClick={async () => {
                        try {
                          await restore(key)
                          closeModal()
                        } catch (err) {
                          setError(err.message)
                        }
                      }}
                      className="btn-ghost px-3 py-2 text-xs"
                    >
                      Restore
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setRestoring(true)} className="cursor-pointer hover:text-white">
                    Already have a card on another device? <span className="underline">Use a login key</span>
                  </button>
                )}
              </div>
            )}
            {profile && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Sign out? You will lose access to this card on this browser.')) {
                    logout()
                    closeModal()
                  }
                }}
                className="mt-3 w-full cursor-pointer text-center text-xs text-white/35 hover:text-rose-300"
              >
                Sign out of this card
              </button>
            )}
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
    </Portal>
  )
}
