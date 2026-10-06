// Live category registry (clubs, nations, awards).
// Defaults come from the club catalogue; loadCategories() swaps in the imported dataset.
import { CLUBS } from './clubs.js'

// Used when no imported dataset is available
const DEFAULT_NATIONS = [
  { id: 'nat_france', name: 'France', flag: 'fr' },
  { id: 'nat_brazil', name: 'Brazil', flag: 'br' },
  { id: 'nat_argentina', name: 'Argentina', flag: 'ar' },
  { id: 'nat_spain', name: 'Spain', flag: 'es' },
  { id: 'nat_england', name: 'England', flag: 'gb-eng' },
  { id: 'nat_germany', name: 'Germany', flag: 'de' },
  { id: 'nat_portugal', name: 'Portugal', flag: 'pt' },
  { id: 'nat_netherlands', name: 'Netherlands', flag: 'nl' },
  { id: 'nat_italy', name: 'Italy', flag: 'it' },
  { id: 'nat_belgium', name: 'Belgium', flag: 'be' },
  { id: 'nat_croatia', name: 'Croatia', flag: 'hr' },
  { id: 'nat_uruguay', name: 'Uruguay', flag: 'uy' },
  { id: 'nat_algeria', name: 'Algeria', flag: 'dz' },
  { id: 'nat_colombia', name: 'Colombia', flag: 'co' },
].map((n) => ({ ...n, tier: 1 }))

export const AWARDS = [
  { id: 'award_ballon_dor', name: "Ballon d'Or", icon: 'ballon', description: "Won the Ballon d'Or", tier: 1 },
  { id: 'award_world_cup', name: 'World Cup', icon: 'trophy', description: 'Won the FIFA World Cup', tier: 1 },
  { id: 'award_ucl', name: 'Champions League', icon: 'star', description: 'Won the UEFA Champions League', tier: 1 },
  { id: 'award_fifa_best', name: 'FIFA World Player', icon: 'globe', description: 'FIFA World Player of the Year / The Best FIFA Men’s Player', tier: 2 },
  { id: 'award_golden_shoe', name: 'Golden Shoe', icon: 'boot', description: 'Won the European Golden Shoe (top scorer in Europe)', tier: 2 },
]

export const allCategories = []
export const categoryById = new Map()
export const nationIdByName = new Map()

// A nation's tier follows how many well-known players it has in the dataset
const nationTier = (n) => (n.tier ? n.tier : n.notable >= 500 ? 1 : n.notable >= 100 ? 2 : 3)

export function loadCategories({ clubs = CLUBS, nations = DEFAULT_NATIONS } = {}) {
  allCategories.length = 0
  for (const c of clubs)
    allCategories.push({ id: c.id, type: 'club', name: c.name, short: c.short, country: c.country, colors: c.colors, tier: c.tier ?? 3, wikidataId: c.qid ?? null })
  for (const n of nations) allCategories.push({ id: n.id, type: 'nation', name: n.name, flag: n.flag, tier: nationTier(n) })
  for (const a of AWARDS) allCategories.push({ ...a, type: 'award' })

  categoryById.clear()
  nationIdByName.clear()
  for (const c of allCategories) {
    categoryById.set(c.id, c)
    if (c.type === 'nation') nationIdByName.set(c.name, c.id)
  }
}

loadCategories()
