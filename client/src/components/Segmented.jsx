import { motion } from 'framer-motion'

export default function Segmented({ options, value, onChange, layoutId }) {
  return (
    <div className="flex rounded-2xl bg-black/30 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative flex-1 cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            value === o.value ? 'text-pitch-950' : 'text-white/60 hover:text-white'
          }`}
        >
          {value === o.value && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-xl bg-linear-to-r from-emerald-300 to-lime-200"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
