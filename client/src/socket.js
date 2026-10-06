import { io } from 'socket.io-client'
import { ORIGIN, tokenStore } from './api.js'

/** Creates a socket identified by the stored profile token (or a guest name) */
export function createSocket(guestName) {
  return io(ORIGIN || undefined, {
    auth: { token: tokenStore.get(), guestName },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 800,
  })
}

/** Promise wrapper around emit-with-ack */
export const emitAck = (socket, event, payload, timeout = 8000) =>
  new Promise((resolve) => {
    socket.timeout(timeout).emit(event, payload, (err, res) => resolve(err ? { ok: false, error: 'Server did not respond' } : res))
  })

// Seat token survives page refreshes so you can jump back into a live match
const SEAT_KEY = 'ttf.seat'
export const seatStore = {
  get: () => {
    try {
      return JSON.parse(sessionStorage.getItem(SEAT_KEY))
    } catch {
      return null
    }
  },
  set: (v) => {
    try {
      if (v) sessionStorage.setItem(SEAT_KEY, JSON.stringify(v))
      else sessionStorage.removeItem(SEAT_KEY)
    } catch {
      /* ignore */
    }
  },
}
