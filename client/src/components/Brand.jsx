import { motion } from 'framer-motion'
import { brand } from '../assets/brand/index.js'

/** Inline football used in place of the letter O, as in the WD 2026 headings */
export function BallO({ className = 'h-[0.82em] w-[0.82em]', spin = false }) {
  return (
    <motion.img
      src={brand.ball}
      alt="O"
      className={`inline-block shrink-0 rounded-full align-[-0.06em] ${className}`}
      animate={spin ? { rotate: 360 } : undefined}
      transition={spin ? { duration: 8, repeat: Infinity, ease: 'linear' } : undefined}
    />
  )
}

/** Renders text, swapping the first "O" for the ball */
export function BallText({ children, spin }) {
  const text = String(children)
  const i = text.toUpperCase().indexOf('O')
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <BallO spin={spin} />
      {text.slice(i + 1)}
    </>
  )
}

/**
 * Section heading from the landing page: "—— ABOUT US ——"
 * blue rule on the left, orange rule on the right, ball as the first O.
 */
export function SectionTitle({ children, sub, className = '', align = 'center' }) {
  return (
    <div className={`${align === 'center' ? 'text-center' : ''} ${className}`}>
      <div className={`flex items-center gap-3 ${align === 'center' ? 'justify-center' : ''}`}>
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6 }}
          className={`h-[3px] w-10 origin-right rounded-full bg-blue-400 sm:w-16 ${align === 'center' ? '' : 'hidden'}`}
        />
        <h1 className="font-display text-5xl font-black uppercase tracking-wide text-white sm:text-6xl">
          <BallText>{children}</BallText>
        </h1>
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6 }}
          className="h-[3px] w-10 origin-left rounded-full bg-orange-500 sm:w-16"
        />
      </div>
      {sub && <p className="mt-2 font-display text-xl font-semibold text-blue-100">{sub}</p>}
    </div>
  )
}

/** Big wordmark in the style of the "WELCOME DAY" title */
export function Wordmark({ size = 'text-6xl sm:text-8xl lg:text-9xl', subtitles = true }) {
  const words = [
    { text: 'TIC', className: 'text-blue-400 [text-shadow:0_4px_0_#00112d]' },
    { text: 'TAC', className: 'text-white [text-shadow:0_4px_0_#00112d]' },
    { text: 'TOE', className: 'text-orange-500 [text-shadow:0_4px_0_#551a00]', ball: true },
  ]
  return (
    <div className="font-display font-black uppercase italic leading-[0.85]">
      <div className={`flex flex-wrap items-center justify-center gap-x-4 lg:justify-start ${size}`}>
        {words.map((w, i) => (
          <motion.span
            key={w.text}
            initial={{ opacity: 0, y: 60, rotate: -8 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 200, damping: 14 }}
            className={`inline-flex items-center ${w.className}`}
          >
            {w.ball ? (
              <>
                T<BallO spin className="mx-[0.02em] h-[0.78em] w-[0.78em] drop-shadow-[0_4px_0_#551a00]" />E
              </>
            ) : (
              w.text
            )}
          </motion.span>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className={`mt-2 bg-linear-to-r from-blue-400 via-white to-orange-500 bg-clip-text text-transparent ${size}`}
      >
        FOOTBALL
      </motion.div>
      {subtitles && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 font-jp text-lg not-italic lg:justify-start"
        >
          <span className="flex items-center gap-2 text-blue-300">
            <span className="h-px w-8 bg-blue-300" />
            ブルーロック
            <span className="h-px w-8 bg-blue-300" />
          </span>
          <span className="flex items-center gap-2 text-orange-500">
            <span className="h-px w-8 bg-orange-500" />
            ハイキュー!!
            <span className="h-px w-8 bg-orange-500" />
          </span>
        </motion.div>
      )}
    </div>
  )
}

/** Faint Japanese watermark text scattered on the landing page (青い鍵 / 俳句) */
export function JpWatermark({ text = '青い鍵', className = '' }) {
  return <span className={`pointer-events-none select-none font-jp text-white/[0.06] ${className}`}>{text}</span>
}

/** Brush-stroke accent used on the white cards */
export function Brush({ className = '', variant = 2 }) {
  return (
    <img
      src={variant === 2 ? brand.brushSplit2 : brand.brushSplit}
      alt=""
      className={`pointer-events-none absolute rotate-[24.89deg] opacity-50 ${className}`}
    />
  )
}

/** Orange countdown tile from the hero ("DAYS 12") */
export function StatTile({ label, value, tone = 'orange', className = '' }) {
  const bg = tone === 'orange' ? 'bg-orange-500' : tone === 'blue' ? 'bg-blue-500' : 'bg-blue-800'
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <span className="font-display text-lg font-black uppercase tracking-wide text-white">{label}</span>
      <motion.span
        key={value}
        initial={{ scale: 1.4, rotate: -6 }}
        animate={{ scale: 1, rotate: 0 }}
        className={`grid h-16 min-w-16 place-items-center rounded-[18px] px-2 font-display text-4xl font-black text-white shadow-lg ${bg}`}
      >
        {value}
      </motion.span>
    </div>
  )
}
