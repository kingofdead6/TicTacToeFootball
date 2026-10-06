import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const REACTIONS = ['⚽', '🔥', '😂', '😱', '👏', '🤯', '😎', '💀', '🐐', 'GG']

export default function MatchFeed({ room, feed, onSend, onReact }) {
  const [text, setText] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [feed.length])

  const send = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text)
    setText('')
  }

  return (
    <aside className="glass flex h-[520px] flex-col overflow-hidden rounded-3xl lg:sticky lg:top-24">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="font-display text-2xl tracking-wide">Match feed</h3>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> Live
        </span>
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {feed.length === 0 && <p className="mt-10 text-center text-sm text-white/35">Live commentary and chat appear here.</p>}
        <AnimatePresence initial={false}>
          {feed.map((item) => {
            const markColor = item.mark === 'X' ? 'text-x' : item.mark === 'O' ? 'text-o' : 'text-white/70'
            if (item.kind === 'event')
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2 rounded-xl bg-black/20 px-3 py-2 text-xs"
                >
                  <span>{item.icon}</span>
                  <span className={markColor}>{item.text}</span>
                </motion.div>
              )
            const mine = item.mark === room.you
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? 'rounded-br-sm bg-orange-400/20' : item.mark === 'X' ? 'rounded-bl-sm bg-x/15' : 'rounded-bl-sm bg-o/15'
                  }`}
                >
                  {!mine && <div className={`text-[10px] font-bold ${markColor}`}>{item.name}</div>}
                  <div className="break-words">{item.text}</div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap justify-center gap-1 border-t border-white/10 px-2 pt-2">
        {REACTIONS.map((r) => (
          <motion.button
            key={r}
            whileHover={{ scale: 1.3, y: -3 }}
            whileTap={{ scale: 0.8 }}
            onClick={() => onReact(r)}
            className={`cursor-pointer rounded-lg px-1.5 py-1 hover:bg-white/10 ${r === 'GG' ? 'font-display text-lg text-orange-200' : 'text-xl'}`}
          >
            {r}
          </motion.button>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 p-3">
        <input
          value={text}
          maxLength={140}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something…"
          className="flex-1 rounded-xl bg-black/30 px-3 py-2 text-sm outline-none ring-orange-300/50 focus:ring-2"
        />
        <button type="submit" disabled={!text.trim()} className="btn-primary px-4 py-2 text-sm">
          ➤
        </button>
      </form>
    </aside>
  )
}
