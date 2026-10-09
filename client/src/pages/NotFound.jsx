import { motion } from 'framer-motion'
import { BallO, Brush } from '../components/Brand.jsx'
import { brand } from '../assets/brand/index.js'

export default function NotFound({ onNavigate }) {
  const path = window.location.pathname

  return (
    <div className="flex flex-col items-center py-6 text-center sm:py-12">
      {/* 4⚽4 — the ball bounces between the fours */}
      <div className="flex items-center font-display text-[9rem] font-black italic leading-none sm:text-[14rem]">
        <motion.span
          initial={{ x: -80, opacity: 0, rotate: -12 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 14 }}
          className="text-blue-400 [text-shadow:0_6px_0_#00112d]"
        >
          4
        </motion.span>
        <motion.span
          initial={{ y: -200, opacity: 0 }}
          animate={{ y: [0, -40, 0], opacity: 1 }}
          transition={{ y: { duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }, opacity: { duration: 0.3 } }}
          className="mx-1"
        >
          <BallO spin className="h-[0.68em] w-[0.68em] drop-shadow-[0_8px_0_#00112d]" />
        </motion.span>
        <motion.span
          initial={{ x: 80, opacity: 0, rotate: 12 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.1 }}
          className="text-orange-500 [text-shadow:0_6px_0_#551a00]"
        >
          4
        </motion.span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card-paper relative mt-14 w-full max-w-lg overflow-visible px-8 pb-8 pt-16 shadow-2xl shadow-black/40"
      >
        <Brush className="-left-8 bottom-6 w-44" />
        <Brush className="-right-10 top-10 w-40" variant={1} />
        <motion.img
          src={brand.stickers.cat}
          alt=""
          className="absolute -top-16 left-1/2 w-40 -translate-x-1/2 drop-shadow-[0_10px_16px_rgba(0,0,0,.35)]"
          animate={{ rotate: [0, 6, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        <h1 className="relative font-display text-5xl font-black uppercase text-blue-500 sm:text-6xl">Offside!</h1>
        <p className="relative mt-3 font-sans text-base font-medium text-blue-500">
          This page wandered past the last defender. There's nothing at
          <code className="mx-1 break-all rounded-md bg-blue-50 px-1.5 py-0.5 text-sm font-semibold text-orange-600">{path}</code>
          on our pitch.
        </p>

        <div className="relative mt-7 grid gap-2 sm:grid-cols-2">
          <button onClick={() => onNavigate('home')} className="btn-primary whitespace-nowrap px-4 text-xl font-black">
            BACK TO KICK-OFF <img src={brand.arrowRight} alt="" className="h-4 w-auto" />
          </button>
          <button onClick={() => onNavigate('online')} className="btn-blue whitespace-nowrap px-4 text-xl font-black">
            PLAY ONLINE
          </button>
        </div>
        <button
          onClick={() => onNavigate('players')}
          className="relative mt-3 cursor-pointer text-sm font-semibold text-blue-400 underline-offset-4 hover:text-orange-500 hover:underline"
        >
          or browse the footballers
        </button>
      </motion.div>
    </div>
  )
}
