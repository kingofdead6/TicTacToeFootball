import { AnimatePresence, motion } from 'framer-motion'
import Portal from './Portal.jsx'
import { Brush } from './Brand.jsx'
import { brand } from '../assets/brand/index.js'

export default function ResultModal({ open, result, names, scores, onNext, onReveal, onExit }) {
  const isDraw = result?.winner === 'draw'
  const winnerName = result && !isDraw ? names[result.winner === 'X' ? 0 : 1] : null
  const color = result?.winner === 'X' ? 'text-blue-500' : result?.winner === 'O' ? 'text-orange-500' : 'text-blue-400'

  return (
    <Portal>
      <AnimatePresence>
        {open && result && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-navy-900/75 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -6, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
              className="card-paper relative w-full max-w-md overflow-visible px-8 pb-8 pt-20 text-center shadow-2xl shadow-black/50"
            >
              <Brush className="-left-8 bottom-24 w-48" />
              <Brush className="-right-10 top-24 w-40" variant={1} />

              {/* Sticker bursting out of the top of the card */}
              <motion.img
                src={isDraw ? brand.stickers.cat : brand.stickers.skills}
                alt=""
                className={`absolute left-1/2 -translate-x-1/2 drop-shadow-[0_10px_16px_rgba(0,0,0,.35)] ${isDraw ? '-top-20 w-44' : '-top-16 w-72'}`}
                initial={{ y: -60, scale: 0, rotate: -20 }}
                animate={{ y: 0, scale: 1, rotate: isDraw ? 4 : -6 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 12 }}
              />

              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className={`relative font-display text-7xl font-black uppercase ${color}`}
              >
                {isDraw ? 'Draw!' : 'Goal!'}
              </motion.h2>
              <p className="relative mt-2 font-sans text-lg font-medium text-blue-500">
                {isDraw ? 'Nobody found the back of the net.' : `${winnerName} wins the round`}
              </p>

              <div className="relative mt-6 flex items-end justify-center gap-5">
                <ScoreTile label={names[0]} value={scores.X} className="bg-blue-500" />
                <span className="pb-6 font-display text-4xl font-black text-blue-200">–</span>
                <ScoreTile label={names[1]} value={scores.O} className="bg-orange-500" />
              </div>
              {scores.draws > 0 && <div className="relative mt-2 text-xs font-medium text-blue-300">{scores.draws} draw(s)</div>}

              <div className="relative mt-8 grid gap-2">
                <button onClick={onNext} className="btn-primary text-2xl font-black">
                  NEXT ROUND <img src={brand.arrowRight} alt="" className="h-5 w-auto" />
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={onReveal} className="btn-blue text-lg">
                    👀 Answers
                  </button>
                  <button onClick={onExit} className="btn border-2 border-blue-500 text-lg text-blue-500 hover:bg-blue-50">
                    🏠 Menu
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  )
}

function ScoreTile({ label, value, className }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.span
        key={value}
        initial={{ scale: 1.5 }}
        animate={{ scale: 1 }}
        className={`grid h-20 w-20 place-items-center rounded-[26px] font-display text-5xl font-black text-white shadow-lg ${className}`}
      >
        {value}
      </motion.span>
      <span className="max-w-28 truncate font-display text-lg font-extrabold text-blue-500">{label}</span>
    </div>
  )
}
