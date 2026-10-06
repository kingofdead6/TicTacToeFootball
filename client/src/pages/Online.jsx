import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createSocket, emitAck, seatStore } from '../socket.js'
import { useProfile } from '../profile.jsx'
import Toasts from '../components/Toasts.jsx'
import Lobby from '../components/online/Lobby.jsx'
import WaitingRoom from '../components/online/WaitingRoom.jsx'
import OnlineMatch from '../components/online/OnlineMatch.jsx'

const setRoomInUrl = (code) => {
  const url = new URL(window.location.href)
  if (code) url.searchParams.set('room', code)
  else url.searchParams.delete('room')
  window.history.replaceState(null, '', url)
}

export default function Online({ initialCode, onNavigate }) {
  const { profile, loading, guestName, refresh } = useProfile()
  const [status, setStatus] = useState('connecting') // connecting | online | offline
  const [room, setRoom] = useState(null)
  const [clockOffset, setClockOffset] = useState(0)
  const [feed, setFeed] = useState([])
  const [focus, setFocus] = useState(null)
  const [reactions, setReactions] = useState([])
  const [live, setLive] = useState(null)
  const [toasts, setToasts] = useState([])
  const [lastEvent, setLastEvent] = useState(null)
  const [busy, setBusy] = useState(false)

  const socketRef = useRef(null)
  const roomRef = useRef(null)
  const autoJoinRef = useRef(initialCode ?? null)
  const guestRef = useRef(guestName)
  guestRef.current = guestName

  const toast = useCallback((text, tone = 'info') => {
    const id = Math.random()
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }, [])

  const applyState = useCallback((st) => {
    roomRef.current = st
    setRoom(st)
    setClockOffset(st.serverNow - Date.now())
    if (st.status !== 'playing') setFocus(null)
  }, [])

  const pushFeed = (item) => setFeed((f) => [...f.slice(-60), { id: Math.random(), ...item }])

  // ---------------- Socket lifecycle ----------------
  const join = useCallback(
    async (code) => {
      const s = socketRef.current
      if (!s?.connected) return toast('Not connected to the server yet', 'error')
      setBusy(true)
      const res = await emitAck(s, 'room:join', { code, guestName: guestRef.current })
      setBusy(false)
      if (!res.ok) return toast(res.error, 'error')
      seatStore.set({ code: res.code, seatToken: res.seatToken })
      setRoomInUrl(res.code)
      setFeed([])
      applyState(res.state)
    },
    [applyState, toast],
  )

  const profileKey = profile?.id ?? 'guest'
  useEffect(() => {
    if (loading) return
    const s = createSocket(guestRef.current)
    socketRef.current = s

    s.on('connect', async () => {
      setStatus('online')
      const seat = seatStore.get()
      if (seat) {
        const res = await emitAck(s, 'room:rejoin', seat)
        if (res.ok) {
          applyState(res.state)
          setRoomInUrl(res.code)
          return
        }
        seatStore.set(null)
        if (roomRef.current) {
          toast('That room has closed', 'error')
          roomRef.current = null
          setRoom(null)
          setRoomInUrl(null)
        }
      }
      if (autoJoinRef.current) {
        const code = autoJoinRef.current
        autoJoinRef.current = null
        join(code)
      }
    })
    s.on('disconnect', () => setStatus('offline'))
    s.on('connect_error', () => setStatus('offline'))
    s.on('hello', (h) => setLive(h.live))
    s.on('room:state', applyState)
    s.on('game:focus', (f) => setFocus(f.cell == null ? null : f))

    s.on('game:event', (e) => {
      const me = roomRef.current?.you
      const mine = e.mark === me
      setLastEvent({ ...e, id: Math.random() })
      switch (e.type) {
        case 'joined':
          if (!mine) toast(`🙌 ${e.name} joined. Kick-off!`, 'success')
          break
        case 'correct':
          pushFeed({ kind: 'event', mark: e.mark, icon: '⚽', text: `${e.name} scored with ${e.player}` })
          if (!mine) toast(`⚽ ${e.name} played ${e.player}`, 'info')
          break
        case 'wrong':
          pushFeed({ kind: 'event', mark: e.mark, icon: '❌', text: `${e.name} missed: ${e.player} doesn't fit ${e.missed.join(' & ')}` })
          toast(mine ? `❌ ${e.player} doesn't fit ${e.missed.join(' & ')}` : `😅 ${e.name} missed with ${e.player}`, mine ? 'error' : 'success')
          break
        case 'timeout':
          pushFeed({ kind: 'event', mark: e.mark, icon: '⏱', text: `${e.name} ran out of time` })
          toast(mine ? "⏱ Time's up! Turn lost" : `⏱ ${e.name} ran out of time`, mine ? 'error' : 'info')
          break
        case 'skip':
          pushFeed({ kind: 'event', mark: e.mark, icon: '⏭', text: `${e.name} skipped` })
          break
        case 'disconnected':
          pushFeed({ kind: 'event', mark: e.mark, icon: '📡', text: `${e.name} lost connection…` })
          if (!mine) toast(`📡 ${e.name} disconnected: 30s to come back`, 'error')
          break
        case 'reconnected':
          pushFeed({ kind: 'event', mark: e.mark, icon: '✅', text: `${e.name} is back` })
          break
        case 'left':
          if (!mine) toast(`🚪 ${e.name} left the match`, 'error')
          break
        case 'round_over':
          pushFeed({ kind: 'event', icon: '🏁', text: e.winner ? `${e.name} wins the round!` : 'Round drawn' })
          break
        case 'match_over':
          pushFeed({ kind: 'event', icon: '🏆', text: e.winner ? `${e.name} wins the match${e.reason === 'forfeit' ? ' (forfeit)' : ''}!` : 'Match drawn' })
          break
        case 'rematch_request':
          if (!mine) toast(`🔁 ${e.name} wants a rematch!`, 'success')
          break
        case 'kickoff':
          setFeed((f) => [...f, { id: Math.random(), kind: 'event', icon: '🟢', text: 'Kick-off!' }])
          break
      }
    })

    s.on('chat:message', (m) => {
      if (m.reaction) {
        const id = m.id
        setReactions((r) => [...r, { id, emoji: m.reaction, mark: m.mark, x: 10 + Math.random() * 80 }])
        setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 2600)
      } else pushFeed({ kind: 'chat', mark: m.mark, name: m.name, text: m.text })
    })

    return () => {
      s.removeAllListeners()
      s.close()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profileKey])

  // Pull the new rating into the header once a ranked result is saved
  const resultSaved = room?.status === 'finished' && room.ranked && room.matchResult && !room.matchResult.saving
  useEffect(() => {
    if (resultSaved) refresh()
  }, [resultSaved, refresh])

  // ---------------- Actions ----------------
  const call = async (event, payload) => {
    const s = socketRef.current
    if (!s?.connected) {
      toast('Connection lost: reconnecting…', 'error')
      return { ok: false }
    }
    const res = await emitAck(s, event, payload)
    if (!res.ok && res.error) toast(res.error, 'error')
    return res
  }

  const create = async (settings) => {
    setBusy(true)
    const res = await call('room:create', { settings, guestName: guestRef.current })
    setBusy(false)
    if (!res.ok) return
    seatStore.set({ code: res.code, seatToken: res.seatToken })
    setRoomInUrl(res.code)
    setFeed([])
    applyState(res.state)
  }

  const leave = async () => {
    await call('room:leave')
    seatStore.set(null)
    setRoomInUrl(null)
    roomRef.current = null
    setRoom(null)
    setFeed([])
  }

  const actions = {
    guess: (cell, footballerId) => call('game:guess', { cell, footballerId }),
    skip: () => call('game:skip'),
    ready: () => call('game:ready'),
    rematch: () => call('game:rematch'),
    focus: (cell) => socketRef.current?.emit('game:focus', { cell }),
    chat: (text) => call('chat:send', { text }),
    react: (reaction) => call('chat:send', { reaction }),
    leave,
  }

  return (
    <div>
      <Toasts toasts={toasts} />
      <ConnectionPill status={status} />
      <AnimatePresence mode="wait">
        {!room ? (
          <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Lobby onCreate={create} onJoin={join} busy={busy || status !== 'online'} live={live} initialCode={initialCode} />
          </motion.div>
        ) : room.status === 'waiting' ? (
          <motion.div key="waiting" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <WaitingRoom room={room} onLeave={leave} />
          </motion.div>
        ) : (
          <motion.div key="match" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <OnlineMatch
              room={room}
              clockOffset={clockOffset}
              feed={feed}
              focus={focus}
              reactions={reactions}
              lastEvent={lastEvent}
              actions={actions}
              onNavigate={onNavigate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ConnectionPill({ status }) {
  if (status === 'online') return null
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-amber-300/30 bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-100 backdrop-blur-xl"
    >
      <span className="mr-2 inline-block h-2 w-2 animate-ping rounded-full bg-amber-300" />
      {status === 'connecting' ? 'Connecting to the stadium… (the free server can take ~30s to wake up)' : 'Connection lost: reconnecting…'}
    </motion.div>
  )
}
