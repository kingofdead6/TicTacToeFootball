import { motion } from 'framer-motion'

export default function WinLine({ line, mark }) {
  const center = (i) => [((i % 3) + 0.5) * (100 / 3), (Math.floor(i / 3) + 0.5) * (100 / 3)]
  const [x1, y1] = center(line[0])
  const [x2, y2] = center(line[2])
  // Extend the line slightly past the outer cells
  const dx = (x2 - x1) * 0.18
  const dy = (y2 - y1) * 0.18
  const color = mark === 'X' ? '#38bdf8' : '#fb7185'
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <motion.line
        x1={x1 - dx}
        y1={y1 - dy}
        x2={x2 + dx}
        y2={y2 + dy}
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </svg>
  )
}
