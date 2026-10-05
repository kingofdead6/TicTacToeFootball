import { AnimatePresence, motion } from 'framer-motion'

const TONES = {
  error: 'border-rose-400/40 bg-rose-500/20 text-rose-100',
  success: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100',
  info: 'border-white/15 bg-white/10 text-white',
}

export default function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={`rounded-2xl border px-5 py-3 text-sm font-semibold shadow-xl backdrop-blur-xl ${TONES[t.tone] ?? TONES.info}`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
