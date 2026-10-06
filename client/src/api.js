// Server origin. In dev the Vite proxy forwards /api and /socket.io to localhost:4000.
// Override with VITE_API_ORIGIN (e.g. in Vercel env vars) if the API moves.
export const ORIGIN = import.meta.env.VITE_API_ORIGIN ?? (import.meta.env.DEV ? '' : 'https://tictactoefootball.onrender.com')
const BASE = `${ORIGIN}/api`

const TOKEN_KEY = 'ttf.profileToken'
export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (t) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage unavailable */
    }
  },
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request(path, options = {}) {
  const token = tokenStore.get()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-profile-token': token } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status, data.code)
  return data
}

export const api = {
  health: () => request('/health'),
  grid: (difficulty) => request(`/grid?difficulty=${difficulty}`),
  solutions: (gridId) => request(`/grid/${gridId}/solutions`),
  search: (q, signal) => request(`/players/search?q=${encodeURIComponent(q)}&limit=8`, { signal }),
  // Paged browsing: { q, nation, club, award, position, sort, page, limit }
  players: (params = {}, signal) => request(`/players?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null))}`, { signal }),
  player: (id) => request(`/players/${id}`),
  categories: (type) => request(`/categories${type ? `?type=${type}` : ''}`),
  category: (id) => request(`/categories/${id}`),
  dataset: () => request('/dataset'),
  validate: (playerId, rowId, colId) => request('/validate', { method: 'POST', body: { playerId, rowId, colId } }),
  cpuAnswer: (rowId, colId, exclude) => request('/cpu-answer', { method: 'POST', body: { rowId, colId, exclude } }),
  saveMatch: (match) => request('/matches', { method: 'POST', body: match }),
  matches: (mode) => request(`/matches?limit=15${mode ? `&mode=${mode}` : ''}`),
  leaderboard: () => request('/leaderboard'),
  stats: () => request('/stats'),
  room: (code) => request(`/rooms/${encodeURIComponent(code)}`),

  // Profiles
  avatars: () => request('/avatars'),
  usernameAvailable: (u) => request(`/profiles/available?username=${encodeURIComponent(u)}`),
  createProfile: (username, avatar) => request('/profiles', { method: 'POST', body: { username, avatar } }),
  me: () => request('/profiles/me'),
  updateMe: (patch) => request('/profiles/me', { method: 'PATCH', body: patch }),
  profile: (username) => request(`/profiles/${encodeURIComponent(username)}`),
}
