import { useState } from 'react'
import { motion } from 'framer-motion'

export default function WaitingRoom({ room, onLeave }) {
  const [copied, setCopied] = useState(null)
  const link = `${window.location.origin}/?room=${room.code}`
  const me = room.seats[room.you]

  const copy = (what, text) => {
    navigator.clipboard?.writeText(text)
    setCopied(what)
    setTimeout(() => setCopied(null), 1800)
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Tic Tac Toe Football', text: `Join my match! Code: ${room.code}`, url: link })
      } catch {
        /* cancelled */
      }
    } else copy('link', link)
  }

  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">Room code</p>
      <div className="mt-3 flex justify-center gap-2 sm:gap-3">
        {room.code.split('').map((ch, i) => (
          <motion.span
            key={i}
            initial={{ y: -60, opacity: 0, rotateX: 90 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 260, damping: 15 }}
            className="glass grid h-16 w-12 place-items-center rounded-2xl font-display text-5xl text-emerald-200 shadow-lg shadow-emerald-500/10 sm:h-20 sm:w-16 sm:text-6xl"
          >
            {ch}
          </motion.span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button onClick={() => copy('code', room.code)} className="btn-ghost px-4 py-2 text-sm">
          {copied === 'code' ? '✓ Copied' : '📋 Copy code'}
        </button>
        <button onClick={share} className="btn-primary px-4 py-2 text-sm">
          {copied === 'link' ? '✓ Link copied' : '🔗 Share invite link'}
        </button>
      </div>

      {/* Radar */}
      <div className="relative mx-auto my-10 grid h-56 w-56 place-items-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-emerald-300/40"
            initial={{ scale: 0.3, opacity: 0.8 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
          />
        ))}
        <motion.div
          className="absolute inset-4 rounded-full bg-[conic-gradient(from_0deg,rgba(110,231,183,.35),transparent_30%)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="relative text-6xl">
          ⚽
        </motion.div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <SeatCard seat={me} mark={room.you} label="You" />
        <span className="font-display text-3xl text-white/30">VS</span>
        <div className="glass flex h-full flex-col items-center justify-center rounded-2xl border-dashed p-4">
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.6, repeat: Infinity }} className="text-4xl">
            ❔
          </motion.div>
          <div className="mt-2 text-sm text-white/50">Waiting for opponent…</div>
        </div>
      </div>

      <p className="mt-6 text-xs text-white/40">
        {room.settings.difficulty} grid · {room.settings.timer ? `${room.settings.timer}s per turn` : 'no timer'} · best of {room.settings.bestOf}
        {me?.registered ? ' · ranked if your opponent has a card' : ' · unranked (guest)'}
      </p>

      <button onClick={onLeave} className="btn-ghost mt-6 text-sm">
        ✖ Close room
      </button>
    </div>
  )
}

export function SeatCard({ seat, mark, label }) {
  if (!seat) return null
  const isX = mark === 'X'
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`rounded-2xl border p-4 ${isX ? 'border-x/40 bg-x/10' : 'border-o/40 bg-o/10'}`}
    >
      <div className="text-4xl">{seat.avatar}</div>
      <div className="mt-2 truncate font-bold">{seat.name}</div>
      <div className="text-xs text-white/50">
        {label ? `${label} · ` : ''}
        <span className={isX ? 'text-x' : 'text-o'}>{mark}</span>
        {seat.rating ? ` · ${seat.rating}` : seat.registered ? '' : ' · guest'}
      </div>
    </motion.div>
  )
}
