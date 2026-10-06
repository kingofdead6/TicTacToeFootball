import mongoose from 'mongoose'

const footballerSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    wikidataId: { type: String, default: null, index: true },
    nationality: { type: String, default: null },
    flag: { type: String, default: null },
    position: { type: String, enum: ['GK', 'DF', 'MF', 'FW', ''], default: '' },
    born: { type: Number, default: null },
    fame: { type: Number, default: 0 }, // number of Wikipedia language editions
    clubs: { type: [String], default: [] }, // category ids, e.g. "real_madrid"
    awards: { type: [String], default: [] }, // category ids, e.g. "award_ucl"
    active: { type: Boolean, default: true }, // set false to hide a player without deleting it
    stats: {
      picked: { type: Number, default: 0 }, // times guessed in any game
      correct: { type: Number, default: 0 }, // times it was a correct answer
    },
  },
  { timestamps: true },
)

footballerSchema.index({ 'stats.picked': -1 })
footballerSchema.index({ fame: -1 })

export const Footballer = mongoose.model('Footballer', footballerSchema)
