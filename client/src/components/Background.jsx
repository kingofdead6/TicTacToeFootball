import { motion } from 'framer-motion'
import { brand } from '../assets/brand/index.js'
import { JpWatermark } from './Brand.jsx'

// Hero treatment from the WD 2026 landing page: Blue Lock artwork under a
// 90% #161616 overlay, fading into navy, with anime-eye brush strokes on the sides
export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-navy-500">
      <img src={brand.heroBg} alt="" className="absolute inset-x-0 top-0 h-[115vh] w-full object-cover object-top" />
      <div className="absolute inset-0 bg-ink/90" />
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-navy-500/60 to-blue-900" />

      {/* Royal blue glow from below, as the landing page transitions into its blue sections */}
      <motion.div
        className="absolute -bottom-1/3 left-1/2 h-[70vh] w-[120vw] -translate-x-1/2 rounded-[50%] bg-blue-500/45 blur-[120px]"
        animate={{ opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 9, repeat: Infinity }}
      />
      <motion.div
        className="absolute -right-32 top-1/4 h-[380px] w-[380px] rounded-full bg-orange-500/15 blur-[120px]"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, delay: 1 }}
      />

      {/* Anime eye brush strokes */}
      <motion.img
        src={brand.animeBlue}
        alt=""
        className="absolute -left-16 top-[38%] w-[300px] opacity-50 sm:w-[420px]"
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 0.5 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <motion.img
        src={brand.animeOrange}
        alt=""
        className="absolute -right-10 bottom-[8%] w-[200px] opacity-50 sm:w-[280px]"
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 0.5 }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
      />

      <JpWatermark className="absolute right-[8%] top-[22%] text-6xl" />
      <JpWatermark text="俳句" className="absolute left-[6%] top-[78%] text-7xl" />
      <JpWatermark className="absolute left-[40%] top-[88%] text-4xl" />

      {/* Drifting sparks */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className={`absolute h-1 w-1 rounded-full ${i % 3 === 0 ? 'bg-orange-400/70' : 'bg-blue-200/50'}`}
          style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%` }}
          animate={{ y: [0, -40, 0], opacity: [0, 0.9, 0] }}
          transition={{ duration: 5 + (i % 5), repeat: Infinity, delay: i * 0.4 }}
        />
      ))}
    </div>
  )
}
