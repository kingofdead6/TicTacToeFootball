const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data
}

export const api = {
  health: () => request('/health'),
  grid: (difficulty) => request(`/grid?difficulty=${difficulty}`),
  solutions: (gridId) => request(`/grid/${gridId}/solutions`),
  search: (q, signal) => request(`/players?search=${encodeURIComponent(q)}&limit=8`, { signal }),
  players: () => request('/players?limit=500'),
  player: (id) => request(`/players/${id}`),
  categories: () => request('/categories'),
  validate: (playerId, rowId, colId) => request('/validate', { method: 'POST', body: { playerId, rowId, colId } }),
  cpuAnswer: (rowId, colId, exclude) => request('/cpu-answer', { method: 'POST', body: { rowId, colId, exclude } }),
  saveMatch: (match) => request('/matches', { method: 'POST', body: match }),
  matches: () => request('/matches?limit=15'),
  leaderboard: () => request('/leaderboard'),
  stats: () => request('/stats'),
}
