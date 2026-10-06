import { motion } from 'framer-motion'

const AWARD_ICON = { ballon: '⚽', trophy: '🏆', star: '⭐' }

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function Flag({ code, className = 'h-8 w-12' }) {
  if (!code) return <span className={`${className} grid place-items-center rounded bg-white/10 text-xs`}>🏳️</span>
  return (
    <img
      src={`https://flagcdn.com/w160/${code}.png`}
      alt=""
      loading="lazy"
      className={`${className} rounded-md object-cover shadow-lg ring-1 ring-white/20`}
    />
  )
}

export function ClubCrest({ short, colors, size = 'h-12 w-12 text-sm' }) {
  const [a, b] = colors
  const textColor = luminance(a) > 0.6 ? '#0b1b12' : '#ffffff'
  return (
    <div
      className={`${size} relative grid place-items-center rounded-full font-display tracking-wider shadow-lg ring-2 ring-white/30`}
      style={{ background: `linear-gradient(135deg, ${a} 0 50%, ${b} 50% 100%)`, color: textColor }}
    >
      <span
        className="rounded-md px-1 leading-none"
        style={{ background: luminance(a) > 0.6 ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.35)' }}
      >
        {short}
      </span>
    </div>
  )
}

/** Header tile describing a row/column category */
export default function CategoryBadge({ category, index = 0, highlight = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, type: 'spring', stiffness: 260, damping: 18 }}
      className={`flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-[10px] p-1.5 text-center ring-1 transition-colors duration-300 ${
        highlight ? 'bg-blue-500 ring-2 ring-orange-500 shadow-lg shadow-orange-500/20' : 'bg-blue-900/75 ring-blue-400/35 backdrop-blur-sm'
      }`}
      title={category.description ?? category.name}
    >
      {category.type === 'club' && <ClubCrest short={category.short} colors={category.colors} size="h-9 w-9 sm:h-12 sm:w-12 text-[10px] sm:text-sm" />}
      {category.type === 'nation' && <Flag code={category.flag} className="h-6 w-9 sm:h-8 sm:w-12" />}
      {category.type === 'award' && (
        <div className="grid h-9 w-9 place-items-center rounded-full bg-linear-to-br from-orange-300 to-orange-600 text-lg shadow-lg shadow-orange-500/30 ring-2 ring-orange-100/60 sm:h-12 sm:w-12 sm:text-2xl">
          {AWARD_ICON[category.icon] ?? '🏅'}
        </div>
      )}
      <span className="line-clamp-2 font-display text-[13px] font-extrabold uppercase leading-[0.95] text-white sm:text-base">{category.name}</span>
    </motion.div>
  )
}
