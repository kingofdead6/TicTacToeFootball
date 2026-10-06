#!/usr/bin/env node
/**
 * Builds the footballer dataset from Wikidata (CC0) and writes
 * src/data/generated/dataset.json.gz, which the server loads on start
 * (and mirrors into MongoDB).
 *
 *   npm run import:players            # full import
 *   npm run import:players -- --limit 5   # only the first 5 clubs (quick test)
 */
import { gzipSync } from 'node:zlib'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CLUBS } from '../src/data/clubs.js'
import { players as seedPlayers } from '../src/data/players.js'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'generated')
const QID_CACHE = join(OUT_DIR, 'club-qids.json')
const HEADERS = {
  'User-Agent': 'TicTacToeFootball-Importer/1.0 (educational football trivia game; contact via sec-club.com)',
  Accept: 'application/sparql-results+json',
}
const CONCURRENCY = 3
const BATCH = 350
const NOTABLE_FAME = 12 // Wikipedia language editions; below this a player counts as obscure

const AWARD_SOURCES = {
  award_ballon_dor: ['Q166177', 'Q2291862'], // Ballon d'Or + FIFA Ballon d'Or (2010–15)
  award_fifa_best: ['Q182529', 'Q28156245'], // FIFA World Player of the Year + The Best FIFA Men's Player
  award_golden_shoe: ['Q233454'], // European Golden Shoe
}
const AWARD_BY_QID = new Map(Object.entries(AWARD_SOURCES).flatMap(([id, qids]) => qids.map((q) => [q, id])))

// Countries that don't map cleanly to an ISO flag
const COUNTRY_FIX = {
  Q55: 'Q29999', // Netherlands → Kingdom of the Netherlands (the item that carries the ISO code)
  Q713750: 'Q183', // West Germany → Germany
  Q27306: 'Q183', // Weimar Republic
  Q7318: 'Q183', // Nazi Germany
  Q43287: 'Q183', // German Empire
  Q174193: 'Q145', // UK of GB and Ireland → United Kingdom
}
// Curated players whose Wikidata label differs from the common name (or was vandalised)
const SEED_QIDS = {
  'ronaldo-nazario': 'Q529207',
  'dani-alves': 'Q172720',
  antony: 'Q59205608',
  xavi: 'Q17500',
  'juan-mata': 'Q168740',
  'jadon-sancho': 'Q30148558',
}
const FLAG_FIX ={ Q21: 'gb-eng', Q22: 'gb-sct', Q25: 'gb-wls', Q26: 'gb-nir' }
const NAME_FIX = { 'United States of America': 'USA', "People's Republic of China": 'China', 'Kingdom of Denmark': 'Denmark', 'Kingdom of the Netherlands': 'Netherlands' }

const args = process.argv.slice(2)
const limitArg = args.indexOf('--limit')
const CLUB_LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity

// ---------------- HTTP helpers ----------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function sparql(query, attempt = 1) {
  const res = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'format=json&query=' + encodeURIComponent(query),
  })
  if (res.status === 429 || res.status >= 500) {
    if (attempt > 5) throw new Error(`SPARQL failed with ${res.status}`)
    const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * attempt
    await sleep(wait)
    return sparql(query, attempt + 1)
  }
  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).results.bindings
}

async function searchEntity(term, attempt = 1) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=6&search=${encodeURIComponent(term)}`
  const res = await fetch(url, { headers: HEADERS })
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    if (json.error) throw new Error(json.error.code)
    await sleep(350) // be gentle with the action API
    return json.search?.map((s) => s.id) ?? []
  } catch {
    if (attempt > 6) throw new Error(`Search failed for "${term}": ${text.slice(0, 80)}`)
    await sleep(3000 * attempt)
    return searchEntity(term, attempt + 1)
  }
}

async function pool(items, worker, label, concurrency = CONCURRENCY) {
  const out = new Array(items.length)
  let next = 0
  let done = 0
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await worker(items[i], i)
        done++
        if (label) process.stdout.write(`\r  ${label} ${done}/${items.length}   `)
      }
    }),
  )
  if (label) process.stdout.write('\n')
  return out
}

const qidOf = (uri) => uri.slice(uri.lastIndexOf('/') + 1)
const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
const norm = (s) => slug(s).replace(/-/g, ' ')

// ---------------- 1. Resolve club QIDs ----------------
async function resolveClubs(clubs) {
  const cache = existsSync(QID_CACHE) ? JSON.parse(readFileSync(QID_CACHE, 'utf8')) : {}
  const todo = clubs.filter((c) => !c.qid && !cache[c.id])
  if (todo.length) {
    console.log(`Resolving ${todo.length} club ids on Wikidata…`)
    // Fast path: one query mapping English Wikipedia titles (following redirects) to items
    const titles = todo.map((c) => c.search ?? c.name)
    const byTitle = new Map()
    const rows0 = await sparql(`SELECT ?title ?item WHERE {
      VALUES ?title { ${titles.map((t) => JSON.stringify(t) + '@en').join(' ')} }
      ?article schema:name ?title ; schema:isPartOf <https://en.wikipedia.org/> ; schema:about ?item .
    }`)
    for (const r of rows0) byTitle.set(r.title.value, qidOf(r.item.value))
    console.log(`  ${byTitle.size}/${titles.length} matched by Wikipedia title`)

    // Slow path (throttled search) only for the leftovers
    const candidates = []
    for (const c of todo) {
      const t = c.search ?? c.name
      candidates.push(byTitle.has(t) ? [byTitle.get(t)] : await searchEntity(t))
    }
    const all = [...new Set(candidates.flat())]
    const rows = await sparql(`SELECT DISTINCT ?c WHERE { VALUES ?c { ${all.map((q) => 'wd:' + q).join(' ')} }
      ?c wdt:P31/wdt:P279* wd:Q476028 }`)
    const isClub = new Set(rows.map((r) => qidOf(r.c.value)))
    todo.forEach((c, i) => {
      // exact Wikipedia-title matches are trusted (multi-sport clubs like Boca aren't typed as football clubs)
      const hit = byTitle.get(c.search ?? c.name) ?? candidates[i].find((q) => isClub.has(q))
      if (hit) cache[c.id] = hit
      else console.warn(`  ⚠️  no football club found for "${c.search ?? c.name}"`)
    })
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(QID_CACHE, JSON.stringify(cache, null, 2))
  }
  return clubs.map((c) => ({ ...c, qid: c.qid ?? cache[c.id] })).filter((c) => c.qid)
}

// ---------------- 2. Players per club ----------------
async function playersOfClub(club) {
  const rows = await sparql(`SELECT ?p ?pLabel ?sl ?enwiki WHERE {
    ?p p:P54/ps:P54 wd:${club.qid} ; wdt:P106 wd:Q937857 ; wikibase:sitelinks ?sl .
    FILTER NOT EXISTS { ?p wdt:P21 wd:Q6581072 }
    OPTIONAL { ?art schema:about ?p ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enwiki . }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul,fr,es,it,de,pt,nl". }
  }`)
  // Prefer the English Wikipedia title (better patrolled than labels), minus its disambiguation suffix
  const nameOf = (r) => (r.enwiki ? r.enwiki.value.replace(/\s*\([^)]*\)\s*$/, '').trim() : r.pLabel.value)
  return rows.map((r) => ({ qid: qidOf(r.p.value), name: nameOf(r), fame: Number(r.sl.value) })).filter((p) => p.name && !/^Q\d+$/.test(p.name))
}

// ---------------- 3. Details in batches ----------------
async function details(qids) {
  const values = qids.map((q) => 'wd:' + q).join(' ')
  const [basic, positions, awards] = await Promise.all([
    sparql(`SELECT ?p ?dob ?sport ?cit WHERE { VALUES ?p { ${values} }
      OPTIONAL { ?p wdt:P569 ?dob } OPTIONAL { ?p wdt:P1532 ?sport } OPTIONAL { ?p wdt:P27 ?cit } }`),
    sparql(`SELECT ?p ?pos WHERE { VALUES ?p { ${values} } ?p wdt:P413 ?pos }`),
    sparql(`SELECT ?p ?a WHERE { VALUES ?p { ${values} } VALUES ?a { ${[...AWARD_BY_QID.keys()].map((q) => 'wd:' + q).join(' ')} } ?p wdt:P166 ?a }`),
  ])
  return { basic, positions, awards }
}

async function lookupLabels(qids, extra = '') {
  const out = new Map()
  for (let i = 0; i < qids.length; i += 400) {
    const chunk = qids.slice(i, i + 400)
    const rows = await sparql(`SELECT ?x ?xLabel ?iso WHERE { VALUES ?x { ${chunk.map((q) => 'wd:' + q).join(' ')} } ${extra}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". } }`)
    for (const r of rows) out.set(qidOf(r.x.value), { label: r.xLabel.value, iso: r.iso?.value?.toLowerCase() ?? null })
  }
  return out
}

function classifyPosition(label) {
  const l = label.toLowerCase()
  if (l.includes('goalkeeper')) return 'GK'
  if (/(back|defender|sweeper|libero|stopper)/.test(l)) return 'DF'
  if (/(forward|striker|winger|centre-forward|center forward)/.test(l)) return 'FW'
  if (/(midfield|playmaker|regista|mezzala)/.test(l)) return 'MF'
  return null
}

// ---------------- Main ----------------
async function main() {
  const t0 = Date.now()
  const clubs = (await resolveClubs(CLUBS)).slice(0, CLUB_LIMIT)
  console.log(`${clubs.length} clubs resolved`)

  const byQid = new Map()
  const clubLists = await pool(clubs, playersOfClub, 'clubs')
  clubs.forEach((club, i) => {
    club.count = clubLists[i].length
    for (const p of clubLists[i]) {
      if (!byQid.has(p.qid)) byQid.set(p.qid, { ...p, clubs: new Set(), cit: new Set(), sport: new Set(), pos: new Set(), awards: new Set(), born: null })
      byQid.get(p.qid).clubs.add(club.id)
    }
  })
  console.log(`${byQid.size} distinct players found`)

  const qids = [...byQid.keys()]
  const batches = []
  for (let i = 0; i < qids.length; i += BATCH) batches.push(qids.slice(i, i + BATCH))
  await pool(
    batches,
    async (batch) => {
      const { basic, positions, awards } = await details(batch)
      for (const r of basic) {
        const p = byQid.get(qidOf(r.p.value))
        if (r.dob && !p.born) p.born = Number(r.dob.value.slice(0, 4)) || null
        if (r.sport) p.sport.add(qidOf(r.sport.value))
        if (r.cit) p.cit.add(qidOf(r.cit.value))
      }
      for (const r of positions) byQid.get(qidOf(r.p.value)).pos.add(qidOf(r.pos.value))
      for (const r of awards) byQid.get(qidOf(r.p.value)).awards.add(AWARD_BY_QID.get(qidOf(r.a.value)))
    },
    'details',
  )

  // Countries and positions
  const fixCountry = (q) => COUNTRY_FIX[q] ?? q
  const countryQids = [...new Set([...byQid.values()].flatMap((p) => [...p.sport, ...p.cit].map(fixCountry)))]
  const countries = await lookupLabels(countryQids, 'OPTIONAL { ?x wdt:P297 ?iso }')
  const posQids = [...new Set([...byQid.values()].flatMap((p) => [...p.pos]))]
  const posLabels = await lookupLabels(posQids)

  // Build players
  const players = []
  for (const p of byQid.values()) {
    const nationQ = fixCountry([...p.sport][0] ?? [...p.cit][0] ?? '')
    const c = countries.get(nationQ)
    const nationality = c ? (NAME_FIX[c.label] ?? c.label) : null
    const positions = [...p.pos].map((q) => classifyPosition(posLabels.get(q)?.label ?? '')).filter(Boolean)
    const position = ['GK', 'DF', 'MF', 'FW'].find((x) => positions.includes(x)) ?? ''
    players.push({
      qid: p.qid,
      name: p.name,
      nationality,
      nationQid: nationQ || null,
      flag: FLAG_FIX[nationQ] ?? c?.iso ?? null,
      position,
      born: p.born,
      fame: p.fame,
      clubs: [...p.clubs],
      awards: [...p.awards],
    })
  }

  // Merge the hand-checked seed (World Cup / Champions League winners, extra clubs)
  const byName = new Map()
  for (const p of players) {
    const k = norm(p.name)
    if (!byName.has(k)) byName.set(k, [])
    byName.get(k).push(p)
  }
  let merged = 0
  const byPlayerQid = new Map(players.map((p) => [p.qid, p]))
  for (const s of seedPlayers) {
    const pinned = SEED_QIDS[s.id] ? byPlayerQid.get(SEED_QIDS[s.id]) : null
    const candidates = pinned ? [pinned] : (byName.get(norm(s.name)) ?? [])
    const best = candidates
      .map((c) => ({ c, overlap: c.clubs.filter((x) => s.clubs.includes(x)).length }))
      .sort((a, b) => b.overlap - a.overlap || b.c.fame - a.c.fame)[0]?.c
    if (best) {
      best.seedId = s.id
      best.name = s.name // curated spelling (also guards against vandalised Wikidata labels)
      best.clubs = [...new Set([...best.clubs, ...s.clubs])]
      best.awards = [...new Set([...best.awards, ...s.awards])]
      best.nationality = s.nationality
      if (s.position) best.position = s.position
      merged++
    } else {
      players.push({ qid: null, seedId: s.id, name: s.name, nationality: s.nationality, flag: null, position: s.position, born: null, fame: 50, clubs: s.clubs, awards: s.awards })
    }
  }
  console.log(`${merged}/${seedPlayers.length} curated players matched to Wikidata`)

  // Stable ids: curated slug, otherwise the name slug for the most famous holder, else slug-qid
  players.sort((a, b) => b.fame - a.fame)
  const taken = new Set(players.filter((p) => p.seedId).map((p) => p.seedId))
  for (const p of players) {
    if (p.seedId) p.id = p.seedId
    else {
      const base = slug(p.name) || p.qid.toLowerCase()
      p.id = taken.has(base) ? `${base}-${p.qid.toLowerCase()}` : base
    }
    taken.add(p.id)
  }

  // Nation categories: enough players to make interesting grids
  const nationCount = new Map()
  for (const p of players) {
    if (!p.nationality) continue
    const k = p.nationality
    const e = nationCount.get(k) ?? { name: k, flags: new Map(), total: 0, notable: 0 }
    e.total++
    if (p.fame >= NOTABLE_FAME) e.notable++
    if (p.flag) e.flags.set(p.flag, (e.flags.get(p.flag) ?? 0) + 1)
    nationCount.set(k, e)
  }
  // Flag by majority vote (dual nationals can carry the other country's flag)
  for (const e of nationCount.values()) e.flag = [...e.flags.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const NOT_A_FOOTBALL_NATION = new Set(['United Kingdom']) // home nations play separately
  const nations = [...nationCount.values()]
    .filter((n) => n.total >= 40 && n.notable >= 8 && !NOT_A_FOOTBALL_NATION.has(n.name))
    .sort((a, b) => b.notable - a.notable)
    .map((n) => ({ id: 'nat_' + slug(n.name).replace(/-/g, '_'), name: n.name, flag: n.flag, players: n.total, notable: n.notable }))

  const dataset = {
    version: new Date().toISOString(),
    source: 'Wikidata (CC0) + curated awards',
    notableFame: NOTABLE_FAME,
    clubs: clubs.map(({ search, ...c }) => c),
    nations,
    players: players.map((p) => [p.id, p.name, p.nationality, p.flag, p.position, p.born, p.fame, p.clubs, p.awards, p.qid]),
  }
  mkdirSync(OUT_DIR, { recursive: true })
  const file = join(OUT_DIR, 'dataset.json.gz')
  const gz = gzipSync(JSON.stringify(dataset), { level: 9 })
  writeFileSync(file, gz)
  console.log(
    `\n✅ ${players.length} players · ${clubs.length} clubs · ${nations.length} nations → ${file} (${(gz.length / 1024 / 1024).toFixed(2)} MB) in ${((Date.now() - t0) / 1000).toFixed(0)}s`,
  )
}

main().catch((e) => {
  console.error('\n❌ Import failed:', e.message)
  process.exit(1)
})
