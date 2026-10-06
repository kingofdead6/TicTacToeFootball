import mongoose from 'mongoose'
import { Footballer } from './models/Footballer.js'
import { Category, Meta } from './models/Category.js'
import { allCategories } from './data/categories.js'
import { countFor, datasetInfo, players, removePlayers } from './game.js'

let ready = false
export const isDbReady = () => ready && mongoose.connection.readyState === 1

// Don't queue queries forever when there is no connection: fail fast instead
mongoose.set('bufferCommands', false)

/**
 * Connects to MongoDB (if MONGODB_URI is set) and mirrors the loaded dataset
 * (footballers + categories) into it. Without a URI the server keeps running
 * on the dataset file alone.
 */
export async function connectDb(uri) {
  if (!uri) {
    console.warn('⚠️  MONGODB_URI not set: running without a database (profiles & leaderboard disabled)')
    return false
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, dbName: process.env.MONGODB_DB || 'tictactoe-football' })
    ready = true
    console.log('✅ MongoDB connected')
    mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'))
    await syncDataset()
    return true
  } catch (err) {
    console.error('❌ MongoDB error:', err.message)
    return false
  }
}

async function syncDataset() {
  const meta = await Meta.findOne({ key: 'dataset' }).lean()
  if (meta?.value?.version !== datasetInfo.version) {
    const t = Date.now()
    // Upsert so pick statistics survive re-imports
    const ops = players.map((p) => ({
      updateOne: {
        filter: { slug: p.id },
        update: {
          $set: {
            name: p.name,
            wikidataId: p.qid ?? null,
            nationality: p.nationality ?? null,
            flag: p.flag ?? null,
            position: p.position ?? '',
            born: p.born ?? null,
            fame: p.fame ?? 0,
            clubs: p.clubs,
            awards: p.awards,
          },
          $setOnInsert: { slug: p.id },
        },
        upsert: true,
      },
    }))
    for (let i = 0; i < ops.length; i += 2000) await Footballer.bulkWrite(ops.slice(i, i + 2000), { ordered: false })

    await Category.bulkWrite(
      allCategories.map((c) => ({
        updateOne: {
          filter: { key: c.id },
          update: {
            $set: {
              type: c.type,
              name: c.name,
              short: c.short,
              country: c.country,
              colors: c.colors,
              flag: c.flag,
              icon: c.icon,
              description: c.description,
              tier: c.tier,
              wikidataId: c.wikidataId,
              playerCount: countFor(c.id),
            },
          },
          upsert: true,
        },
      })),
    )
    await Meta.updateOne({ key: 'dataset' }, { $set: { value: { version: datasetInfo.version, players: players.length } } }, { upsert: true })
    console.log(`⚽ Mirrored ${players.length} footballers & ${allCategories.length} categories to MongoDB in ${((Date.now() - t) / 1000).toFixed(1)}s`)
  } else {
    console.log(`⚽ MongoDB already has dataset ${datasetInfo.version}`)
  }

  // Footballers switched off in the database are hidden from the game
  const inactive = await Footballer.find({ active: false }, { slug: 1 }).lean()
  if (inactive.length) {
    removePlayers(inactive.map((f) => f.slug))
    console.log(`  ${inactive.length} deactivated footballers hidden`)
  }
}
