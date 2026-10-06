import { AnimatePresence, motion } from 'framer-motion'
import { Flag } from './CategoryBadge.jsx'

const MARK_STYLE = {
  X: {
    card: 'from-sky-400/35 via-sky-500/20 to-sky-900/40 border-sky-300/60 shadow-sky-500/30',
    text: 'text-x',
  },
  O: {
    card: 'from-rose-400/35 via-rose-500/20 to-rose-900/40 border-rose-300/60 shadow-rose-500/30',
    text: 'text-o',
  },
}

export default function Cell({ index, value, turn, onClick, disabled, shake, isWinning, answerCount, solutions, cpuTarget, focusMark = 'O' }) {
  const hover = turn === 'X' ? 'hover:border-x/70 hover:shadow-x/20' : 'hover:border-o/70 hover:shadow-o/20'

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || !!value}
      initial={{ opacity: 0, scale: 0.4, rotate: -8 }}
      animate={
        shake
          ? { x: [0, -10, 10, -8, 8, -4, 4, 0], opacity: 1, scale: 1, rotate: 0 }
          : isWinning
            ? { scale: [1, 1.07, 1], opacity: 1, rotate: 0 }
            : { opacity: 1, scale: 1, rotate: 0, x: 0 }
      }
      transition={
        shake
          ? { duration: 0.5 }
          : isWinning
            ? { duration: 0.8, repeat: Infinity, repeatDelay: 0.4 }
            : { delay: 0.25 + index * 0.05, type: 'spring', stiffness: 260, damping: 17 }
      }
      whileHover={!value && !disabled ? { scale: 1.04, y: -2 } : undefined}
      whileTap={!value && !disabled ? { scale: 0.96 } : undefined}
      className={`group relative aspect-square w-full overflow-hidden rounded-2xl border text-left [perspective:800px] ${
        value ? 'cursor-default border-transparent' : `glass cursor-pointer shadow-lg ${hover} disabled:cursor-not-allowed`
      } ${shake ? 'border-rose-500/80! bg-rose-500/15!' : ''}`}
    >
      {/* Empty-state hover glow */}
      {!value && (
        <>
          <span
            className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-disabled:opacity-0 ${
              turn === 'X' ? 'bg-[radial-gradient(circle,rgba(56,189,248,.25),transparent_70%)]' : 'bg-[radial-gradient(circle,rgba(251,113,133,.25),transparent_70%)]'
            }`}
          />
          <span
            className={`absolute inset-0 grid place-items-center font-display text-6xl opacity-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-25 group-disabled:opacity-0 sm:text-7xl ${
              MARK_STYLE[turn].text
            }`}
          >
            {turn}
          </span>
          {answerCount != null && !solutions && (
            <span className="absolute bottom-1.5 right-2 text-[10px] font-semibold text-white/30" title="Possible answers">
              {answerCount} ✓
            </span>
          )}
          {solutions && (
            <span className="absolute inset-0 flex flex-col justify-center gap-0.5 overflow-hidden p-2 text-[9px] leading-tight text-white/70 sm:text-[11px]">
              {solutions.slice(0, 4).map((s) => (
                <span key={s.id} className="truncate">
                  {s.name}
                </span>
              ))}
              {solutions.length > 4 && <span className="text-emerald-300">+{solutions.length - 4} more</span>}
            </span>
          )}
          {cpuTarget && (
            <motion.span
              className={`absolute inset-0 rounded-2xl border-2 border-dashed ${focusMark === 'X' ? 'border-x' : 'border-o'}`}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          )}
        </>
      )}

      <AnimatePresence>
        {value && (
          <motion.div
            key={value.player.id}
            initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14 }}
            className={`absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl border bg-linear-to-br p-2 text-center shadow-xl ${MARK_STYLE[value.mark].card}`}
          >
            <span className={`pointer-events-none absolute -right-1 -top-4 font-display text-7xl opacity-20 sm:text-8xl ${MARK_STYLE[value.mark].text}`}>
              {value.mark}
            </span>
            <Flag code={value.player.flag} className="h-3.5 w-5 sm:h-4 sm:w-6" />
            <span className="relative line-clamp-2 text-[11px] font-bold leading-tight sm:text-sm">{value.player.name}</span>
            <span className={`relative font-display text-xl leading-none sm:text-3xl ${MARK_STYLE[value.mark].text}`}>{value.mark}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
