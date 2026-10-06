import mongoose from 'mongoose'
import { Footballer } from './models/Footballer.js'
import { players as seedPlayers } from './data/players.js'
import { loadPlayers } from './game.js'

let ready = false
export const isDbReady = () => ready && mongoose.connection.readyState === 1

// Don't queue queries forever when there is no connection: fail fast instead
mongoose.set('bufferCommands', false)

/**
 * Connects to MongoDB (if MONGODB_URI is set), seeds the footballer collection
 * from data/players.js and loads the collection into the in-memory game cache.
 * Without a URI the server keeps running on the static data.
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
    await seedFootballers()
    return true
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message)
    return false
  }
}

async function seedFootballers() {
  // Upsert so edits in players.js propagate, while pick statistics are preserved
  await Footballer.bulkWrite(
    seedPlayers.map((p) => ({
      updateOne: {
        filter: { slug: p.id },
        update: {
          $set: { name: p.name, nationality: p.nationality, position: p.position, clubs: p.clubs, awards: p.awards },
          $setOnInsert: { slug: p.id },
        },
        upsert: true,
      },
    })),
  )
  const all = await Footballer.find({ active: { $ne: false } }).lean()
  loadPlayers(all.map((f) => ({ id: f.slug, name: f.name, nationality: f.nationality, position: f.position, clubs: f.clubs, awards: f.awards })))
  console.log(`⚽ ${all.length} footballers loaded from MongoDB`)
}
