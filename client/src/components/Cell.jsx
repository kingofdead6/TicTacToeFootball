import { AnimatePresence, motion } from 'framer-motion'
import { Flag } from './CategoryBadge.jsx'
import { brand } from '../assets/brand/index.js'

// X = Blue Lock royal blue, O = Haikyuu orange
const MARK_STYLE = {
  X: {
    card: 'bg-linear-to-br from-blue-400 via-blue-500 to-blue-700 shadow-blue-500/40 ring-blue-200/50',
    hoverText: 'text-blue-500',
    focus: 'border-blue-500',
  },
  O: {
    card: 'bg-linear-to-br from-orange-400 via-orange-500 to-orange-700 shadow-orange-500/40 ring-orange-200/60',
    hoverText: 'text-orange-500',
    focus: 'border-orange-500',
  },
}

// Brush accents rotate around the board so neighbouring cards don't look identical
const BRUSH_POS = ['-left-8 -bottom-6', '-right-10 -top-4', '-left-10 -top-6', '-right-8 -bottom-8']

export default function Cell({ index, value, turn, onClick, disabled, shake, isWinning, answerCount, solutions, cpuTarget, focusMark = 'O' }) {
  const hoverRing = turn === 'X' ? 'hover:ring-blue-500' : 'hover:ring-orange-500'

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
      whileHover={!value && !disabled ? { scale: 1.04, y: -3 } : undefined}
      whileTap={!value && !disabled ? { scale: 0.96 } : undefined}
      className={`group relative aspect-square w-full overflow-hidden rounded-[10px] text-left [perspective:800px] ${
        value ? 'cursor-default' : `card-paper cursor-pointer shadow-lg shadow-black/30 ring-4 ring-transparent transition-shadow ${hoverRing} disabled:cursor-not-allowed`
      } ${shake ? 'bg-rose-100! ring-rose-500!' : ''}`}
    >
      {!value && (
        <>
          <img
            src={brand.brushSplit2}
            alt=""
            className={`pointer-events-none absolute w-[70%] rotate-[24.89deg] opacity-30 ${BRUSH_POS[index % BRUSH_POS.length]}`}
          />
          <span
            className={`absolute inset-0 grid place-items-center font-display text-7xl font-black opacity-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-30 group-disabled:opacity-0 sm:text-8xl ${
              MARK_STYLE[turn].hoverText
            }`}
          >
            {turn}
          </span>
          {answerCount != null && !solutions && (
            <span className="absolute bottom-1.5 right-2 font-display text-sm font-extrabold text-blue-300" title="Possible answers">
              {answerCount} ✓
            </span>
          )}
          {solutions && (
            <span className="absolute inset-0 flex flex-col justify-center gap-0.5 overflow-hidden p-2 text-[9px] font-medium leading-tight text-blue-500 sm:text-[11px]">
              {solutions.slice(0, 4).map((s) => (
                <span key={s.id} className="truncate">
                  {s.name}
                </span>
              ))}
              {(answerCount ?? solutions.length) > 4 && <span className="font-semibold text-orange-500">+{(answerCount ?? solutions.length) - 4} more</span>}
            </span>
          )}
          {cpuTarget && (
            <motion.span
              className={`absolute inset-1 rounded-[8px] border-[3px] border-dashed ${MARK_STYLE[focusMark]?.focus ?? 'border-orange-500'}`}
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
            className={`absolute inset-0 flex flex-col items-center justify-center gap-1 overflow-hidden rounded-[10px] p-2 text-center shadow-xl ring-2 ${MARK_STYLE[value.mark].card}`}
          >
            <span className="pointer-events-none absolute -right-2 -top-6 font-display text-8xl font-black text-white/20 sm:text-9xl">{value.mark}</span>
            <img src={brand.brushSplit2} alt="" className="pointer-events-none absolute -bottom-6 -left-8 w-[70%] rotate-[24.89deg] opacity-20 mix-blend-screen" />
            <Flag code={value.player.flag} className="relative h-3.5 w-5 sm:h-4 sm:w-6" />
            <span className="relative line-clamp-2 font-display text-base font-black leading-[0.95] sm:text-xl">{value.player.name}</span>
            <span className="relative font-display text-2xl font-black leading-none text-white/90 sm:text-3xl">{value.mark}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
