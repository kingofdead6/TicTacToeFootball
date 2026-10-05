import { AnimatePresence, motion } from 'framer-motion'

export default function ResultModal({ open, result, names, scores, onNext, onReveal, onExit }) {
  const isDraw = result?.winner === 'draw'
  const winnerName = result && !isDraw ? names[result.winner === 'X' ? 0 : 1] : null
  const color = result?.winner === 'X' ? 'text-x' : result?.winner === 'O' ? 'text-o' : 'text-amber-300'

  return (
    <AnimatePresence>
      {open && result && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -6, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-pitch-900/95 p-8 text-center shadow-2xl"
          >
            <motion.div
              className="absolute inset-x-0 -top-24 mx-auto h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div
              className="relative text-7xl"
              initial={{ y: -40, scale: 0 }}
              animate={{ y: 0, scale: 1, rotate: isDraw ? 0 : [0, -12, 12, 0] }}
              transition={{ delay: 0.15, type: 'spring' }}
            >
              {isDraw ? '🤝' : '🏆'}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={`relative mt-3 font-display text-6xl tracking-wide ${color}`}
            >
              {isDraw ? 'DRAW!' : 'GOAL!'}
            </motion.h2>
            <p className="relative mt-1 text-lg text-white/80">{isDraw ? 'Nobody found the back of the net.' : `${winnerName} wins the round`}</p>

            <div className="relative mt-6 flex items-center justify-center gap-6 font-display text-5xl">
              <div className="text-x">
                {scores.X}
                <div className="font-sans text-xs font-semibold text-white/50">{names[0]}</div>
              </div>
              <div className="text-white/30">–</div>
              <div className="text-o">
                {scores.O}
                <div className="font-sans text-xs font-semibold text-white/50">{names[1]}</div>
              </div>
            </div>
            {scores.draws > 0 && <div className="relative mt-1 text-xs text-white/40">{scores.draws} draw(s)</div>}

            <div className="relative mt-8 grid gap-2">
              <button onClick={onNext} className="btn-primary font-display text-xl tracking-widest">
                NEXT ROUND →
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={onReveal} className="btn-ghost text-sm">
                  👀 Show answers
                </button>
                <button onClick={onExit} className="btn-ghost text-sm">
                  🏠 Menu
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
