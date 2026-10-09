/**
 * Trophy winners that Wikidata doesn't model per player:
 *  - FIFA World Cup: every player in the winning squad ("<year> FIFA World Cup squads" on Wikipedia)
 *  - European Cup / Champions League: every player in the winning final line-up, substitutes included
 * Winners per edition come from Wikidata (P1346); players are resolved to Wikidata ids via Wikipedia,
 * so matching is by id, never by name.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// Clubs whose current Wikidata name differs from the name used in old final reports
const CLUB_ALIASES = { FCSB: ['Steaua București'], 'FK Crvena zvezda': ['Red Star Belgrade'] }
const esc = (s) =>s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function createTrophyFetcher({ sparql, headers, log = () => {} }) {
  // Wikipedia API GET with backoff (rate limits come back as plain text or an error object)
  async function getJson(url, attempt = 1) {
    const res = await fetch(url, { headers })
    const body = await res.text()
    let json = null
    try {
      json = JSON.parse(body)
    } catch {
      /* rate-limit text */
    }
    if (!json || json.error?.code === 'ratelimited' || res.status === 429 || res.status >= 500) {
      if (attempt > 6) throw new Error(`Wikipedia API kept failing: ${body.slice(0, 80)}`)
      await sleep(3000 * attempt)
      return getJson(url, attempt + 1)
    }
    await sleep(700)
    return json
  }

  async function wikitext(title) {
    const json = await getJson(`https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&redirects=1&page=${encodeURIComponent(title)}`)
    return json.parse?.wikitext?.['*'] ?? null
  }

  /** Wikipedia titles → Wikidata ids (follows redirects) */
  async function titlesToQids(titles) {
    const out = new Map()
    const unique = [...new Set(titles)]
    for (let i = 0; i < unique.length; i += 50) {
      const chunk = unique.slice(i, i + 50)
      const json = await getJson(
        `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(chunk.join('|'))}`,
      )
      const redirect = new Map()
      for (const r of [...(json.query?.normalized ?? []), ...(json.query?.redirects ?? [])]) redirect.set(r.from, r.to)
      const byTitle = new Map(Object.values(json.query?.pages ?? {}).map((p) => [p.title, p.pageprops?.wikibase_item]))
      for (const t of chunk) {
        let cur = t
        for (let k = 0; k < 3 && redirect.has(cur); k++) cur = redirect.get(cur)
        if (byTitle.get(cur)) out.set(t, byTitle.get(cur))
      }
    }
    return out
  }

  const linkTitle = (s) => s.match(/\[\[([^\]|#]+)/)?.[1]?.trim() ?? null
  const teamName = (label) =>
    label
      .replace(/\s*(men's )?national (association )?football team$/i, '')
      .replace(/\s*(F\.?C\.?|C\.?F\.?|A\.?F\.?C\.?)$/i, '')
      .trim()

  async function editions(competitionQid) {
    const rows = await sparql(`SELECT ?e ?winnerLabel ?title ?end WHERE {
      ?e wdt:P3450 wd:${competitionQid} ; wdt:P1346 ?winner .
      OPTIONAL { ?e wdt:P582 ?end } OPTIONAL { ?e wdt:P585 ?end }
      OPTIONAL { ?art schema:about ?winner ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`)
    const byYear = new Map()
    for (const r of rows) {
      const year = Number(r.end?.value?.slice(0, 4))
      if (year && !byYear.has(year)) byYear.set(year, { label: r.winnerLabel.value, names: [r.winnerLabel.value, r.title?.value].filter(Boolean) })
    }
    return [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .filter(([y]) => y <= new Date().getFullYear())
      .map(([y, w]) => [y, w.label, w.names])
  }

  // Meaningful words of a club name: "Real Madrid Club de Fútbol" → real, madrid
  const STOP = new Set(['fc', 'cf', 'ac', 'afc', 'sc', 'sl', 'fk', 'sk', 'sv', 'club', 'de', 'del', 'futbol', 'football', 'the', 'f', 'c', 'a'])
  const words = (s) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !STOP.has(w))
  const sameClub = (a, b) => {
    const wa = words(a)
    const wb = new Set(words(b))
    return wa.length > 0 && wa.filter((w) => wb.has(w)).length >= Math.min(wa.length, wb.size, 2)
  }

  // ---------------- World Cup ----------------
  async function worldCupWinners() {
    const titles = []
    const report = []
    for (const [year, winner] of await editions('Q19317')) {
      const country = teamName(winner)
      const text = await wikitext(`${year} FIFA World Cup squads`)
      if (!text) {
        log(`  ⚠️  no squad page for ${year}`)
        continue
      }
      // "==Italy==" or "===West Germany===" (Wikidata merges West Germany into Germany)
      const heading = (name) => text.search(new RegExp(`^==+\\s*\\[*${esc(name)}\\]*\\s*==+\\s*$`, 'm'))
      const start = [country, `West ${country}`].map(heading).find((i) => i >= 0) ?? -1
      if (start < 0) {
        log(`  ⚠️  ${year}: no "${country}" section`)
        continue
      }
      const rest = text.slice(text.indexOf('\n', start))
      const end = rest.search(/^==+[^=]/m)
      const section = end > 0 ? rest.slice(0, end) : rest
      // {{nat fs player|…|name=[[X]]}} or {{National football squad player|…|name=[[X]]}}
      const names = [...section.matchAll(/\{\{[^|}]*player[^}]*?\|\s*name\s*=\s*([^|}]*\[\[[^\]]+\]\])/gi)].map((m) => linkTitle(m[1])).filter(Boolean)
      report.push(`${year} ${country} (${names.length})`)
      titles.push(...names)
    }
    log(`  🏆 World Cup winners: ${report.join(', ')}`)
    return new Set((await titlesToQids(titles)).values())
  }

  // ---------------- Champions League ----------------
  async function championsLeagueWinners() {
    const titles = []
    const report = []
    for (const [year, winner, winnerNames] of await editions('Q18756')) {
      const page = year <= 1992 ? `${year} European Cup final` : `${year} UEFA Champions League final`
      const text = await wikitext(page)
      if (!text) {
        log(`  ⚠️  no page "${page}"`)
        continue
      }
      // Line-up tables: rows like "|GK ||'''1'''||{{flagicon|X}} [[Player]]", one table per team, each closed by a Manager line
      const firstRow = text.search(/^\|\s*[A-Z]{2,3}\s*\|\|/m)
      if (firstRow < 0) {
        log(`  ⚠️  ${year}: no line-up table`)
        continue
      }
      const chunks = text
        .slice(firstRow)
        .split(/^.*(?:Manager|Head coach|Coach)\s*:.*$/im)
        .slice(0, 2)
      // Kit titles appear in the same order as the tables (left team first)
      const kitTitles = [...text.matchAll(/\{\{\s*Football kit[\s\S]*?\|\s*title\s*=\s*(\{\{\s*nowrap\s*\|[^}]*\}\}|[^<\n|]+)/gi)].map((m) =>
        m[1]
          .replace(/\{\{\s*nowrap\s*\|/i, '')
          .replace(/\}\}|\[\[|\]\]/g, '')
          .trim(),
      )
      const names = [...winnerNames, ...(CLUB_ALIASES[winner] ?? [])]
      const idx = kitTitles.findIndex((t) => names.some((n) => sameClub(n, t) || sameClub(t, n)))
      const chunk = idx >= 0 ? chunks[idx === 1 ? 1 : 0] : null
      if (!chunk) {
        log(`  ⚠️  ${year}: couldn't tell which line-up is ${winner}`)
        continue
      }
      const players = chunk
        .split('\n')
        .filter((l) => /^\|\s*[A-Z]{2,3}\s*\|\|/.test(l))
        .map((l) => linkTitle(l.replace(/\{\{[^}]*\}\}/g, '')))
        .filter((t) => t && !/^Captain/i.test(t))
      report.push(`${year} ${teamName(winner)} (${players.length})`)
      titles.push(...players)
    }
    log(`  ⭐ European Cup / Champions League winners: ${report.join(', ')}`)
    return new Set((await titlesToQids(titles)).values())
  }

  return { worldCupWinners, championsLeagueWinners }
}
