import { motion } from 'framer-motion'

// Animated stadium: striped pitch, field markings, floodlight glows and drifting particles
export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Mowed-grass stripes */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'repeating-linear-gradient(90deg, #052a1a 0 80px, #063321 80px 160px)',
        }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#020c07_85%)]" />

      {/* Field markings */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.08]" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="white" strokeWidth="3">
          <rect x="40" y="40" width="920" height="520" />
          <line x1="500" y1="40" x2="500" y2="560" />
          <circle cx="500" cy="300" r="90" />
          <rect x="40" y="170" width="140" height="260" />
          <rect x="820" y="170" width="140" height="260" />
          <rect x="40" y="235" width="50" height="130" />
          <rect x="910" y="235" width="50" height="130" />
        </g>
      </svg>

      {/* Floodlights */}
      <motion.div
        className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-400/20 blur-[120px]"
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute -right-40 -bottom-40 h-[520px] w-[520px] rounded-full bg-sky-400/15 blur-[120px]"
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1.1, 1, 1.1] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="absolute right-1/4 top-0 h-[300px] w-[300px] rounded-full bg-rose-400/10 blur-[100px]"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, delay: 2 }}
      />

      {/* Drifting particles */}
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white/40"
          style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%` }}
          animate={{ y: [0, -40, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: 5 + (i % 5), repeat: Infinity, delay: i * 0.4 }}
        />
      ))}
    </div>
  )
}
