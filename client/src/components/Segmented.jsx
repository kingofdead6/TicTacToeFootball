import { motion } from 'framer-motion'

// tone="light" for white cards, "dark" for navy panels
export default function Segmented({ options, value, onChange, layoutId, tone = 'dark' }) {
  const light = tone === 'light'
  return (
    <div className={`flex rounded-2xl p-1 ${light ? 'bg-blue-50' : 'bg-navy-500/70 ring-1 ring-blue-400/30'}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative flex-1 cursor-pointer rounded-xl px-3 py-2 font-display text-lg font-extrabold leading-none transition-colors ${
            value === o.value ? 'text-white' : light ? 'text-blue-500/70 hover:text-blue-500' : 'text-blue-100/70 hover:text-white'
          }`}
        >
          {value === o.value && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-xl bg-orange-500 shadow-md shadow-orange-500/30"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
