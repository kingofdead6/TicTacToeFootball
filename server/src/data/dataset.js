// Loads the imported Wikidata dataset (src/data/generated/dataset.json.gz) if present
import { existsSync, readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DATASET_FILE = join(dirname(fileURLToPath(import.meta.url)), 'generated', 'dataset.json.gz')

export function readDataset() {
  if (!existsSync(DATASET_FILE)) return null
  const raw = JSON.parse(gunzipSync(readFileSync(DATASET_FILE)).toString('utf8'))
  return {
    version: raw.version,
    source: raw.source,
    notableFame: raw.notableFame ?? 12,
    clubs: raw.clubs,
    nations: raw.nations,
    players: raw.players.map(([id, name, nationality, flag, position, born, fame, clubs, awards, qid]) => ({
      id,
      name,
      nationality,
      flag,
      position,
      born,
      fame,
      clubs,
      awards,
      qid,
    })),
  }
}
